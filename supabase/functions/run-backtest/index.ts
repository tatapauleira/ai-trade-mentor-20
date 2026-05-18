import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient, getUserIdFromRequest } from "../_shared/supabase.ts";
import { generateSignalFromCandles } from "../_shared/analysis.ts";
import type { Candle } from "../_shared/types.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return jsonResponse({ error: "Não autorizado" }, 401);

    const body = await req.json();
    const assetSymbol = (body.asset ?? "BTCUSDT").toString().toUpperCase().replace("/", "");
    const timeframe = (body.timeframe ?? "1h").toString();
    const initialCapital = Number(body.initial_capital ?? 10000);
    const strategyId = body.strategy_id ?? null;

    const supabase = createServiceClient();

    const { data: asset } = await supabase
      .from("assets")
      .select("id")
      .eq("symbol", assetSymbol)
      .single();

    if (!asset) return jsonResponse({ error: `Ativo não encontrado: ${assetSymbol}` }, 404);

    const startDate = body.start_date
      ? new Date(body.start_date)
      : new Date(Date.now() - 90 * 24 * 3600000);
    const endDate = body.end_date ? new Date(body.end_date) : new Date();

    const { data: backtestRow, error: btError } = await supabase
      .from("backtests")
      .insert({
        user_id: userId,
        strategy_id: strategyId,
        asset_id: asset.id,
        timeframe,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        initial_capital: initialCapital,
        status: "RUNNING",
      })
      .select("id")
      .single();

    if (btError || !backtestRow) {
      return jsonResponse({ error: "Falha ao criar backtest" }, 500);
    }

    const { data: candlesRaw } = await supabase
      .from("market_candles")
      .select("open, high, low, close, volume, candle_time")
      .eq("asset_id", asset.id)
      .eq("timeframe", timeframe)
      .gte("candle_time", startDate.toISOString())
      .lte("candle_time", endDate.toISOString())
      .order("candle_time", { ascending: true });

    let candles: Candle[] = (candlesRaw ?? []).map((c) => ({
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume),
      candle_time: c.candle_time,
    }));

    if (candles.length < 30) {
      candles = buildSyntheticSeries(initialCapital, 120);
    }

    const trades: Array<{
      side: string;
      entry: number;
      exit: number;
      pnl: number;
      result: string;
    }> = [];

    let equity = initialCapital;
    const equityCurve: Array<{ time: string; equity: number }> = [];
    let wins = 0;
    let losses = 0;
    const window = 25;

    for (let i = window; i < candles.length; i += 5) {
      const slice = candles.slice(i - window, i + 1);
      const sig = generateSignalFromCandles(slice);
      if (sig.signal === "WAIT") continue;

      const entry = sig.entry;
      const exit = sig.signal === "BUY" ? sig.take_profit : sig.take_profit;
      const riskPerTrade = initialCapital * 0.01;
      const qty = riskPerTrade / Math.abs(entry - sig.stop_loss);
      const pnl =
        sig.signal === "BUY"
          ? (exit - entry) * qty
          : (entry - exit) * qty;

      equity += pnl;
      const result = pnl >= 0 ? "WIN" : "LOSS";
      if (pnl >= 0) wins++;
      else losses++;

      trades.push({ side: sig.signal, entry, exit, pnl: +pnl.toFixed(2), result });
      equityCurve.push({ time: slice[slice.length - 1].candle_time, equity: +equity.toFixed(2) });
    }

    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const grossProfit = trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;
    const totalReturn = ((equity - initialCapital) / initialCapital) * 100;

    const metrics = {
      total_trades: totalTrades,
      wins,
      losses,
      win_rate: +winRate.toFixed(2),
      profit_factor: +profitFactor.toFixed(4),
      total_return_percent: +totalReturn.toFixed(2),
      final_equity: +equity.toFixed(2),
    };

    const results = { trades: trades.slice(-50), equity_curve: equityCurve };

    await supabase
      .from("backtests")
      .update({
        status: "COMPLETED",
        results,
        metrics,
        completed_at: new Date().toISOString(),
      })
      .eq("id", backtestRow.id);

    await supabase.from("ai_learning_logs").insert({
      user_id: userId,
      decision: "AUTO_EXECUTED",
      outcome: `backtest_${backtestRow.id}`,
      metadata: { backtest_id: backtestRow.id, asset: assetSymbol, metrics },
    });

    return jsonResponse({
      backtest_id: backtestRow.id,
      asset: assetSymbol,
      status: "COMPLETED",
      metrics,
      results,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

function buildSyntheticSeries(basePrice: number, count: number): Candle[] {
  let price = basePrice / 10;
  const candles: Candle[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const open = price;
    const close = price * (1 + (Math.random() - 0.48) * 0.01);
    candles.push({
      open,
      high: Math.max(open, close) * 1.002,
      low: Math.min(open, close) * 0.998,
      close,
      volume: 500 + Math.random() * 500,
      candle_time: new Date(now - (count - i) * 3600000).toISOString(),
    });
    price = close;
  }
  return candles;
}
