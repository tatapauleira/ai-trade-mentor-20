import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient, getUserIdFromRequest } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return jsonResponse({ error: "Não autorizado" }, 401);

    const body = await req.json().catch(() => ({}));
    const strategyId = body.strategy_id as string | undefined;
    const strategyName = body.strategy_name as string | undefined;

    const supabase = createServiceClient();

    let tradesQuery = supabase
      .from("trades")
      .select("pnl, result, strategy, closed_at")
      .eq("user_id", userId);

    if (strategyName) {
      tradesQuery = tradesQuery.eq("strategy", strategyName);
    }

    const { data: trades } = await tradesQuery;

    const { data: backtests } = await supabase
      .from("backtests")
      .select("id, strategy_id, metrics, status, created_at")
      .eq("user_id", userId)
      .eq("status", "COMPLETED")
      .order("created_at", { ascending: false })
      .limit(20);

    let strategiesQuery = supabase
      .from("strategies")
      .select("*")
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .eq("enabled", true);

    if (strategyId) {
      strategiesQuery = strategiesQuery.eq("id", strategyId);
    }

    const { data: strategies } = await strategiesQuery;

    const tradeList = trades ?? [];
    const wins = tradeList.filter((t) => t.result === "WIN").length;
    const losses = tradeList.filter((t) => t.result === "LOSS").length;
    const totalTrades = tradeList.length;
    const totalPnl = tradeList.reduce((s, t) => s + Number(t.pnl), 0);
    const grossProfit = tradeList
      .filter((t) => Number(t.pnl) > 0)
      .reduce((s, t) => s + Number(t.pnl), 0);
    const grossLoss = Math.abs(
      tradeList.filter((t) => Number(t.pnl) < 0).reduce((s, t) => s + Number(t.pnl), 0),
    );

    const byStrategy: Record<
      string,
      { trades: number; wins: number; pnl: number; win_rate: number }
    > = {};

    for (const t of tradeList) {
      const name = t.strategy ?? "Desconhecida";
      if (!byStrategy[name]) {
        byStrategy[name] = { trades: 0, wins: 0, pnl: 0, win_rate: 0 };
      }
      byStrategy[name].trades++;
      byStrategy[name].pnl += Number(t.pnl);
      if (t.result === "WIN") byStrategy[name].wins++;
    }

    for (const name of Object.keys(byStrategy)) {
      const s = byStrategy[name];
      s.win_rate = s.trades > 0 ? +((s.wins / s.trades) * 100).toFixed(2) : 0;
      s.pnl = +s.pnl.toFixed(2);
    }

    const performance = {
      summary: {
        total_trades: totalTrades,
        wins,
        losses,
        win_rate: totalTrades > 0 ? +((wins / totalTrades) * 100).toFixed(2) : 0,
        total_pnl: +totalPnl.toFixed(2),
        profit_factor:
          grossLoss > 0 ? +(grossProfit / grossLoss).toFixed(4) : grossProfit > 0 ? 99 : 0,
      },
      by_strategy: byStrategy,
      strategies: (strategies ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        win_rate: Number(s.win_rate),
        total_trades: s.total_trades,
        profit_factor: Number(s.profit_factor),
        weight: Number(s.weight),
        enabled: s.enabled,
      })),
      recent_backtests: (backtests ?? []).map((b) => ({
        id: b.id,
        strategy_id: b.strategy_id,
        metrics: b.metrics,
        created_at: b.created_at,
      })),
    };

    if (strategyId && strategies?.[0]) {
      const s = strategies[0];
      const stratTrades = tradeList.filter((t) => t.strategy === s.name);
      const stratWins = stratTrades.filter((t) => t.result === "WIN").length;
      const stratPnl = stratTrades.reduce((sum, t) => sum + Number(t.pnl), 0);

      await supabase
        .from("strategies")
        .update({
          win_rate: stratTrades.length > 0 ? (stratWins / stratTrades.length) * 100 : s.win_rate,
          total_trades: stratTrades.length || s.total_trades,
          updated_at: new Date().toISOString(),
        })
        .eq("id", strategyId);

      await supabase.from("ai_learning_logs").insert({
        user_id: userId,
        decision: "AUTO_EXECUTED",
        outcome: `strategy_eval_${strategyId}`,
        metadata: { strategy_id: strategyId, pnl: stratPnl, trades: stratTrades.length },
      });
    }

    return jsonResponse(performance);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
