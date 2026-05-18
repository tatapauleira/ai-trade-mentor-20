import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import type { RiskCheckResult, RiskSettings } from "./types.ts";

export async function loadRiskSettings(
  supabase: SupabaseClient,
  userId: string,
): Promise<RiskSettings> {
  const { data, error } = await supabase
    .from("risk_settings")
    .select(
      "max_risk_per_trade_percent, max_daily_loss_percent, max_drawdown_percent, max_open_positions, paper_balance",
    )
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return {
      max_risk_per_trade_percent: 1,
      max_daily_loss_percent: 3,
      max_drawdown_percent: 10,
      max_open_positions: 5,
      paper_balance: 10000,
    };
  }

  return {
    max_risk_per_trade_percent: Number(data.max_risk_per_trade_percent),
    max_daily_loss_percent: Number(data.max_daily_loss_percent),
    max_drawdown_percent: Number(data.max_drawdown_percent),
    max_open_positions: Number(data.max_open_positions),
    paper_balance: Number(data.paper_balance),
  };
}

/** Perda diária acumulada (trades fechados hoje + PnL não realizado de ordens abertas). */
async function getDailyPnl(supabase: SupabaseClient, userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { data: closedToday } = await supabase
    .from("trades")
    .select("pnl")
    .eq("user_id", userId)
    .gte("closed_at", startOfDay.toISOString());

  const closedPnl = (closedToday ?? []).reduce((s, t) => s + Number(t.pnl), 0);

  const { data: openOrders } = await supabase
    .from("paper_orders")
    .select("pnl")
    .eq("user_id", userId)
    .eq("status", "OPEN");

  const openPnl = (openOrders ?? []).reduce((s, o) => s + Number(o.pnl), 0);
  return closedPnl + openPnl;
}

/** Drawdown atual vs pico de equity (paper_balance + PnL total histórico). */
async function getCurrentDrawdownPercent(
  supabase: SupabaseClient,
  userId: string,
  paperBalance: number,
): Promise<number> {
  const { data: allTrades } = await supabase
    .from("trades")
    .select("pnl, closed_at")
    .eq("user_id", userId)
    .order("closed_at", { ascending: true });

  if (!allTrades?.length) return 0;

  let equity = paperBalance;
  let peak = paperBalance;
  let maxDrawdown = 0;

  for (const t of allTrades) {
    equity += Number(t.pnl);
    if (equity > peak) peak = equity;
    const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  return maxDrawdown;
}

export async function validateRisk(
  supabase: SupabaseClient,
  userId: string,
  riskPercent: number,
  signalKind: string,
): Promise<RiskCheckResult> {
  if (signalKind === "WAIT") {
    return { allowed: true };
  }

  const settings = await loadRiskSettings(supabase, userId);

  if (riskPercent > settings.max_risk_per_trade_percent) {
    return {
      allowed: false,
      reason: `Risco por operação (${riskPercent.toFixed(2)}%) excede o limite de ${settings.max_risk_per_trade_percent}%.`,
    };
  }

  const dailyPnl = await getDailyPnl(supabase, userId);
  const dailyLossPercent =
    settings.paper_balance > 0
      ? (Math.abs(Math.min(0, dailyPnl)) / settings.paper_balance) * 100
      : 0;

  if (dailyPnl < 0 && dailyLossPercent >= settings.max_daily_loss_percent) {
    return {
      allowed: false,
      reason: `Perda diária máxima atingida (${dailyLossPercent.toFixed(2)}% / limite ${settings.max_daily_loss_percent}%).`,
    };
  }

  const drawdown = await getCurrentDrawdownPercent(
    supabase,
    userId,
    settings.paper_balance,
  );

  if (drawdown >= settings.max_drawdown_percent) {
    return {
      allowed: false,
      reason: `Drawdown máximo atingido (${drawdown.toFixed(2)}% / limite ${settings.max_drawdown_percent}%).`,
    };
  }

  const { count } = await supabase
    .from("paper_orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "OPEN");

  if ((count ?? 0) >= settings.max_open_positions) {
    return {
      allowed: false,
      reason: `Número máximo de posições abertas atingido (${settings.max_open_positions}).`,
    };
  }

  return { allowed: true };
}
