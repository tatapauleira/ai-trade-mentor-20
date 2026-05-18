import { supabase, isSupabaseConfigured } from "./client";
import {
  mapApiSignalToUI,
  mapCandlesToChart,
  mapDbPaperOrder,
  mapDbRisk,
  mapDbSignal,
  mapDbStrategy,
  mapDbTrade,
  toDbSymbol,
} from "./mappers";
import type {
  AISignal,
  AISignalApiResponse,
  BacktestMetrics,
  ChartPoint,
  PaperOrder,
  RiskSettings,
  Strategy,
  Trade,
} from "@/lib/types";

function assertClient() {
  if (!supabase) throw new Error("Supabase não configurado");
  return supabase;
}

async function requireSession() {
  const client = assertClient();
  const { data } = await client.auth.getSession();
  if (!data.session) throw new Error("Sessão não encontrada. Faça login.");
  return { client, session: data.session };
}

export async function invokeFunction<T>(
  name: string,
  body?: Record<string, unknown>,
  requireAuth = true,
): Promise<T> {
  const client = assertClient();

  if (requireAuth) {
    await requireSession();
  }

  const { data, error } = await client.functions.invoke(name, { body: body ?? {} });
  if (error) throw new Error(error.message ?? `Erro na função ${name}`);
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

// --- Auth ---
export async function signIn(email: string, password: string) {
  const { data, error } = await assertClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string, fullName?: string) {
  const { data, error } = await assertClient().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data;
}

export async function signInAnonymously() {
  const { data, error } = await assertClient().auth.signInAnonymously();
  if (error) throw error;
  return data;
}

export async function signOut() {
  await assertClient().auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// --- Queries ---
export async function fetchProfile() {
  const { client, session } = await requireSession();
  const { data, error } = await client
    .from("profiles")
    .select("email, full_name, paper_balance")
    .eq("id", session.user.id)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchAssets(): Promise<string[]> {
  const client = assertClient();
  const { data, error } = await client
    .from("assets")
    .select("symbol")
    .eq("is_active", true)
    .order("symbol");
  if (error) throw error;
  return (data ?? []).map((a) => {
    const s = a.symbol as string;
    return s.endsWith("USDT") ? `${s.slice(0, -4)}/USDT` : s;
  });
}

export async function fetchSignals(limit = 10): Promise<AISignal[]> {
  const { client, session } = await requireSession();
  const { data, error } = await client
    .from("ai_signals")
    .select("*, assets(symbol)")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => mapDbSignal(row as Record<string, unknown>));
}

export async function fetchPaperOrders(): Promise<PaperOrder[]> {
  const { client, session } = await requireSession();
  const { data, error } = await client
    .from("paper_orders")
    .select("*, assets(symbol)")
    .eq("user_id", session.user.id)
    .eq("status", "OPEN")
    .order("opened_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapDbPaperOrder(row as Record<string, unknown>));
}

export async function fetchTrades(limit = 50): Promise<Trade[]> {
  const { client, session } = await requireSession();
  const { data, error } = await client
    .from("trades")
    .select("*, assets(symbol)")
    .eq("user_id", session.user.id)
    .order("closed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => mapDbTrade(row as Record<string, unknown>));
}

export async function fetchStrategies(): Promise<Strategy[]> {
  const { client, session } = await requireSession();
  const { data, error } = await client
    .from("strategies")
    .select("*")
    .or(`user_id.is.null,user_id.eq.${session.user.id}`)
    .order("weight", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapDbStrategy(row as Record<string, unknown>));
}

export async function fetchRiskSettings(): Promise<RiskSettings> {
  const { client, session } = await requireSession();
  const { data, error } = await client
    .from("risk_settings")
    .select("*")
    .eq("user_id", session.user.id)
    .single();
  if (error) throw error;
  return mapDbRisk(data as Record<string, unknown>);
}

export async function updateRiskSettings(settings: RiskSettings): Promise<void> {
  const { client, session } = await requireSession();
  const { error } = await client
    .from("risk_settings")
    .update({
      max_risk_per_trade_percent: settings.maxRiskPerTrade,
      max_daily_loss_percent: settings.maxDailyLoss,
      max_drawdown_percent: settings.maxDrawdown,
      max_open_positions: settings.maxOpenPositions,
      paper_balance: settings.paperBalance,
    })
    .eq("user_id", session.user.id);
  if (error) throw error;
}

export async function fetchCandles(
  assetDisplay: string,
  timeframe = "1h",
  limit = 80,
): Promise<ChartPoint[]> {
  const client = assertClient();
  const symbol = toDbSymbol(assetDisplay);

  const { data: asset } = await client
    .from("assets")
    .select("id")
    .eq("symbol", symbol)
    .single();

  if (!asset) return [];

  const { data, error } = await client
    .from("market_candles")
    .select("open, high, low, close, volume, candle_time")
    .eq("asset_id", asset.id)
    .eq("timeframe", timeframe)
    .order("candle_time", { ascending: true })
    .limit(limit);

  if (error) throw error;
  if (!data?.length) return [];
  return mapCandlesToChart(data as Record<string, unknown>[]);
}

// --- Edge Functions ---
export async function generateAISignal(
  asset: string,
  timeframe = "1h",
): Promise<AISignal> {
  const res = await invokeFunction<AISignalApiResponse>("generate-ai-signal", {
    asset: toDbSymbol(asset),
    timeframe,
  });
  return mapApiSignalToUI(res, res.signal_id);
}

export async function executePaperOrder(signalId: string): Promise<void> {
  await invokeFunction("execute-paper-order", { signal_id: signalId });
}

export async function runBacktest(params: {
  asset: string;
  timeframe: string;
  strategyId?: string;
  initialCapital: number;
  days: number;
}): Promise<{ metrics: BacktestMetrics; equity_curve: ChartPoint[] }> {
  const end = new Date();
  const start = new Date(end.getTime() - params.days * 24 * 3600000);

  const res = await invokeFunction<{
    metrics: BacktestMetrics;
    results: { equity_curve: Array<{ time: string; equity: number }> };
  }>("run-backtest", {
    asset: toDbSymbol(params.asset),
    timeframe: params.timeframe,
    strategy_id: params.strategyId,
    initial_capital: params.initialCapital,
    start_date: start.toISOString(),
    end_date: end.toISOString(),
  });

  const equity_curve = (res.results?.equity_curve ?? []).map((p, i) => ({
    day: `D${i}`,
    equity: p.equity,
  }));

  return { metrics: res.metrics, equity_curve };
}

export async function updateMarketData(symbols?: string[]): Promise<void> {
  await invokeFunction(
    "update-market-data",
    {
      symbols: symbols?.map(toDbSymbol),
      timeframe: "1h",
    },
    false,
  );
}

export async function evaluateStrategyPerformance(strategyId?: string) {
  return invokeFunction("evaluate-strategy-performance", {
    strategy_id: strategyId,
  });
}

export { isSupabaseConfigured };
