import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient, getUserIdFromRequest } from "../_shared/supabase.ts";
import { validateRisk } from "../_shared/risk.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return jsonResponse({ error: "Não autorizado" }, 401);

    const body = await req.json();
    const signalId = body.signal_id as string | undefined;
    const assetSymbol = body.asset
      ? body.asset.toString().toUpperCase().replace("/", "")
      : null;
    const side = body.side as "BUY" | "SELL" | undefined;
    const qty = body.qty ? Number(body.qty) : null;

    const supabase = createServiceClient();

    let signalRow = null;
    if (signalId) {
      const { data } = await supabase
        .from("ai_signals")
        .select("*")
        .eq("id", signalId)
        .eq("user_id", userId)
        .single();
      signalRow = data;
    }

    if (signalRow?.blocked) {
      return jsonResponse(
        {
          error: "Sinal bloqueado por gestão de risco",
          block_reason: signalRow.block_reason,
        },
        403,
      );
    }

    const effectiveSide = (side ?? signalRow?.signal) as "BUY" | "SELL";
    if (!effectiveSide || effectiveSide === "WAIT") {
      return jsonResponse({ error: "Operação WAIT não pode ser executada em paper" }, 400);
    }

    const riskPercent = Number(signalRow?.risk_percent ?? body.risk_percent ?? 1);
    const riskCheck = await validateRisk(supabase, userId, riskPercent, effectiveSide);

    if (!riskCheck.allowed) {
      await supabase.from("ai_learning_logs").insert({
        user_id: userId,
        signal_id: signalId ?? null,
        decision: "BLOCKED",
        outcome: effectiveSide,
        feedback: riskCheck.reason,
        metadata: { action: "execute_paper_order", body },
      });

      return jsonResponse(
        { error: "Operação bloqueada por gestão de risco", block_reason: riskCheck.reason },
        403,
      );
    }

    let assetId = signalRow?.asset_id;
    if (!assetId && assetSymbol) {
      const { data: asset } = await supabase
        .from("assets")
        .select("id")
        .eq("symbol", assetSymbol)
        .single();
      assetId = asset?.id;
    }

    if (!assetId) {
      return jsonResponse({ error: "Ativo não identificado" }, 400);
    }

    const entryPrice = Number(signalRow?.entry ?? body.entry_price);
    const stopLoss = Number(signalRow?.stop_loss ?? body.stop_loss);
    const takeProfit = Number(signalRow?.take_profit ?? body.take_profit);

    if (!entryPrice || !stopLoss || !takeProfit) {
      return jsonResponse({ error: "Preços de entrada, stop e alvo são obrigatórios" }, 400);
    }

    const { data: settings } = await supabase
      .from("risk_settings")
      .select("paper_balance, max_risk_per_trade_percent")
      .eq("user_id", userId)
      .single();

    const balance = Number(settings?.paper_balance ?? 10000);
    const maxRisk = Number(settings?.max_risk_per_trade_percent ?? 1);
    const riskAmount = balance * (maxRisk / 100);
    const priceRisk = Math.abs(entryPrice - stopLoss);
    const computedQty = qty ?? (priceRisk > 0 ? riskAmount / priceRisk : 0.01);

    const { data: order, error: orderError } = await supabase
      .from("paper_orders")
      .insert({
        user_id: userId,
        asset_id: assetId,
        signal_id: signalId ?? null,
        side: effectiveSide,
        qty: computedQty,
        entry_price: entryPrice,
        current_price: entryPrice,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        status: "OPEN",
        pnl: 0,
        risk_percent: riskPercent,
      })
      .select("*, assets(symbol)")
      .single();

    if (orderError) {
      console.error(orderError);
      return jsonResponse({ error: "Falha ao criar ordem paper" }, 500);
    }

    await supabase.from("ai_learning_logs").insert({
      user_id: userId,
      signal_id: signalId ?? null,
      decision: "APPROVED",
      outcome: effectiveSide,
      feedback: "Ordem paper criada com sucesso",
      metadata: { paper_order_id: order.id, qty: computedQty, entry_price: entryPrice },
    });

    return jsonResponse({
      success: true,
      paper_order: {
        id: order.id,
        asset: order.assets?.symbol ?? assetSymbol,
        side: order.side,
        qty: Number(order.qty),
        entry_price: Number(order.entry_price),
        stop_loss: Number(order.stop_loss),
        take_profit: Number(order.take_profit),
        status: order.status,
        opened_at: order.opened_at,
      },
      message: "Ordem paper criada. Nenhum dinheiro real envolvido.",
    });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});
