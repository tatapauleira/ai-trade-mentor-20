// Camada de IA OpenAI: usa histórico para aprender e refinar sinais.
// Requer secret OPENAI_API_KEY no Supabase (Settings → Edge Functions → Secrets).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

export interface QuantSignal {
  signal: "BUY" | "SELL" | "WAIT";
  confidence: number;
  entry: number;
  stop_loss: number;
  take_profit: number;
  strategy: string;
  market_regime: string;
  reason: string;
  risk_percent: number;
}

export interface RefinedSignal extends QuantSignal {
  ai_reasoning?: string;
  ai_used?: boolean;
}

export function isOpenAIEnabled(): boolean {
  return Boolean(Deno.env.get("OPENAI_API_KEY"));
}

interface RefineInput {
  supabase: SupabaseClient;
  userId: string;
  assetSymbol: string;
  timeframe: string;
  quant: QuantSignal;
  lastPrices: number[];
}

export async function refineWithOpenAI(input: RefineInput): Promise<RefinedSignal> {
  if (!isOpenAIEnabled()) {
    return { ...input.quant, ai_used: false };
  }

  try {
    // 1. Aprendizado: últimos trades fechados deste usuário
    const { data: recentTrades } = await input.supabase
      .from("trades")
      .select("asset_id, side, pnl, result, strategy, closed_at, assets(symbol)")
      .eq("user_id", input.userId)
      .order("closed_at", { ascending: false })
      .limit(20);

    const summary = summarizeTrades(recentTrades ?? []);

    const prompt = buildPrompt({
      assetSymbol: input.assetSymbol,
      timeframe: input.timeframe,
      quant: input.quant,
      lastPrices: input.lastPrices.slice(-30),
      tradesSummary: summary,
    });

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Você é um analista quantitativo conservador. Sua tarefa é refinar sinais de trading com base no histórico de performance do usuário. " +
              "Nunca prometa lucro. Foque em probabilidade e gestão de risco. " +
              "Retorne SEMPRE JSON válido com: {signal, confidence, ai_reasoning, adjusted_risk_percent}. " +
              "signal ∈ {BUY,SELL,WAIT}. confidence ∈ [0,100]. adjusted_risk_percent ∈ [0.25, 2]. " +
              "Se o histórico mostra muitas perdas na estratégia atual, REDUZA confiança ou retorne WAIT.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("OpenAI HTTP", res.status, await res.text());
      return { ...input.quant, ai_used: false };
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      signal?: "BUY" | "SELL" | "WAIT";
      confidence?: number;
      ai_reasoning?: string;
      adjusted_risk_percent?: number;
    };

    const newSignal = parsed.signal ?? input.quant.signal;
    const newConfidence = clamp(parsed.confidence ?? input.quant.confidence, 0, 100);
    const newRisk = clamp(
      parsed.adjusted_risk_percent ?? input.quant.risk_percent,
      0.25,
      2,
    );

    return {
      ...input.quant,
      signal: newSignal,
      confidence: Math.round(newConfidence),
      risk_percent: +newRisk.toFixed(2),
      reason: input.quant.reason,
      ai_reasoning: parsed.ai_reasoning,
      ai_used: true,
    };
  } catch (err) {
    console.error("Erro OpenAI:", err);
    return { ...input.quant, ai_used: false };
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

interface TradeRow {
  pnl: number | string;
  result: string;
  strategy: string | null;
  assets?: { symbol?: string } | null;
}

function summarizeTrades(trades: TradeRow[]): string {
  if (trades.length === 0) return "Sem histórico de trades ainda.";
  const wins = trades.filter((t) => t.result === "WIN").length;
  const losses = trades.length - wins;
  const totalPnl = trades.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
  const byStrategy: Record<string, { wins: number; losses: number; pnl: number }> = {};
  for (const t of trades) {
    const k = t.strategy ?? "n/a";
    byStrategy[k] = byStrategy[k] ?? { wins: 0, losses: 0, pnl: 0 };
    if (t.result === "WIN") byStrategy[k].wins++;
    else byStrategy[k].losses++;
    byStrategy[k].pnl += Number(t.pnl ?? 0);
  }
  const lines = Object.entries(byStrategy).map(
    ([s, v]) =>
      `  - ${s}: ${v.wins}W/${v.losses}L (PnL ${v.pnl >= 0 ? "+" : ""}${v.pnl.toFixed(2)})`,
  );
  return `Últimos ${trades.length} trades: ${wins}W/${losses}L · PnL total ${totalPnl.toFixed(
    2,
  )}\nPor estratégia:\n${lines.join("\n")}`;
}

function buildPrompt(opts: {
  assetSymbol: string;
  timeframe: string;
  quant: QuantSignal;
  lastPrices: number[];
  tradesSummary: string;
}): string {
  return `Ativo: ${opts.assetSymbol} | Timeframe: ${opts.timeframe}
Últimos preços (close): ${opts.lastPrices.map((p) => p.toFixed(2)).join(", ")}

Sinal quantitativo gerado:
  signal: ${opts.quant.signal}
  confidence: ${opts.quant.confidence}%
  entry: ${opts.quant.entry}
  stop_loss: ${opts.quant.stop_loss}
  take_profit: ${opts.quant.take_profit}
  strategy: ${opts.quant.strategy}
  market_regime: ${opts.quant.market_regime}
  risk_percent: ${opts.quant.risk_percent}
  reason: ${opts.quant.reason}

Histórico de performance recente do usuário:
${opts.tradesSummary}

Tarefa: avalie se devemos manter, ajustar confiança ou rejeitar (WAIT) este sinal,
baseando-se na performance histórica da estratégia "${opts.quant.strategy}" e no regime atual.
Retorne JSON: {"signal": "...", "confidence": 0-100, "ai_reasoning": "...", "adjusted_risk_percent": 0.25-2}`;
}
