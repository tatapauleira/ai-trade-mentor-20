// IA executora de plano: o operador define ativo, número de operações,
// risco por trade e janela máxima (minutos). A IA observa o mercado e
// escolhe os MELHORES MOMENTOS para abrir cada operação dentro do prazo.
// Se o tempo restante for curto demais para as operações restantes, ela
// força execução para cumprir o plano.

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchSignalForAsset } from "@/lib/ai-live-engine";
import type { PaperOrder } from "@/lib/types";

export interface AIPlanConfig {
  asset: string;
  totalTrades: number;        // quantas operações a IA deve executar
  windowMinutes: number;      // tempo máximo total da janela
  riskPct: number;            // risco por operação (%)
  rr: number;                 // razão risco:retorno
  minConfidence: number;      // confiança mínima para executar voluntariamente
  qty: number;                // tamanho de cada ordem
  balance: number;            // saldo p/ calcular distância do stop
}

export interface AIPlanState {
  running: boolean;
  executed: number;
  remaining: number;
  startedAt: number | null;
  endsAt: number | null;
  lastTickMsg: string;
  lastConfidence: number | null;
}

const ASSET_DECIMALS = (a: string) => (a === "EURUSD" ? 5 : 2);

export function useAIPlanExecutor() {
  const qc = useQueryClient();
  const [state, setState] = useState<AIPlanState>({
    running: false, executed: 0, remaining: 0,
    startedAt: null, endsAt: null,
    lastTickMsg: "parado", lastConfidence: null,
  });
  const cfgRef = useRef<AIPlanConfig | null>(null);
  const stopRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  function stop(msg = "parado pelo operador") {
    stopRef.current = true;
    setState((s) => ({ ...s, running: false, lastTickMsg: msg }));
  }

  function start(cfg: AIPlanConfig) {
    if (stateRef.current.running) return;
    cfgRef.current = cfg;
    stopRef.current = false;
    const now = Date.now();
    const ends = now + cfg.windowMinutes * 60_000;
    setState({
      running: true,
      executed: 0,
      remaining: cfg.totalTrades,
      startedAt: now,
      endsAt: ends,
      lastTickMsg: "iniciando análise…",
      lastConfidence: null,
    });
    toast.success(`IA iniciou plano: ${cfg.totalTrades} operações em ${cfg.windowMinutes}min`);
    loop();
  }

  async function loop() {
    while (!stopRef.current) {
      const cfg = cfgRef.current!;
      const s = stateRef.current;
      if (s.executed >= cfg.totalTrades) {
        setState((p) => ({ ...p, running: false, lastTickMsg: "plano concluído ✓" }));
        toast.success(`Plano concluído: ${cfg.totalTrades} operações executadas`);
        return;
      }
      const now = Date.now();
      const msLeft = (s.endsAt ?? now) - now;
      const tradesLeft = cfg.totalTrades - s.executed;
      if (msLeft <= 0) {
        setState((p) => ({ ...p, running: false, lastTickMsg: "tempo esgotado" }));
        toast.warning(`Janela encerrada. ${tradesLeft} operações não executadas.`);
        return;
      }

      // Calcula confiança mínima dinâmica: quanto menos tempo, mais flexível
      const slotMs = msLeft / tradesLeft; // tempo médio por trade restante
      const urgency = slotMs < 60_000 ? 1 : slotMs < 180_000 ? 0.7 : 0.3;
      const dynamicMin = Math.max(35, cfg.minConfidence - urgency * 20);
      // Se restar menos tempo do que ~25s por trade, FORÇA execução
      const forceExec = slotMs < 25_000;

      setState((p) => ({ ...p, lastTickMsg: `analisando ${cfg.asset}…` }));
      try {
        const sig = await fetchSignalForAsset(cfg.asset, "1m");
        if (stopRef.current) return;
        if (!sig) {
          setState((p) => ({ ...p, lastTickMsg: "sem dados de mercado, tentando novamente" }));
        } else {
          const ok = forceExec
            ? true
            : sig.kind !== "WAIT" && sig.confidence >= dynamicMin;
          setState((p) => ({
            ...p,
            lastConfidence: sig.confidence,
            lastTickMsg: ok
              ? `executando ${sig.kind} @ ${sig.entry} (${sig.confidence}%${forceExec ? " · forçado" : ""})`
              : `aguardando setup · ${sig.kind} ${sig.confidence}% < ${Math.round(dynamicMin)}%`,
          }));
          if (ok) {
            const side: "BUY" | "SELL" = sig.kind === "WAIT"
              ? (Math.random() > 0.5 ? "BUY" : "SELL")
              : sig.kind;
            const entry = sig.entry;
            const dec = ASSET_DECIMALS(cfg.asset);
            const stopDist = (cfg.balance * (cfg.riskPct / 100)) / Math.max(cfg.qty, 1e-9);
            const stop = +(side === "BUY" ? entry - stopDist : entry + stopDist).toFixed(dec);
            const target = +(side === "BUY" ? entry + stopDist * cfg.rr : entry - stopDist * cfg.rr).toFixed(dec);
            const ts = Date.now();
            const order: PaperOrder = {
              id: `ai-plan-${ts}`,
              asset: cfg.asset,
              side,
              qty: cfg.qty,
              entry: +entry.toFixed(dec),
              current: +entry.toFixed(dec),
              stop, target, pnl: 0, status: "OPEN",
              strategy: `IA Plano · ${sig.strategy}`,
              openedTs: ts,
              openedAt: new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            };
            qc.setQueryData<PaperOrder[]>(["paper-orders"], (prev) => [order, ...(prev ?? [])]);
            toast.success(`IA executou ${side} ${cfg.asset} @ ${entry} (${sig.confidence}%)`);
            setState((p) => ({
              ...p,
              executed: p.executed + 1,
              remaining: Math.max(0, p.remaining - 1),
            }));
          }
        }
      } catch (err) {
        setState((p) => ({ ...p, lastTickMsg: `erro: ${(err as Error).message}` }));
      }

      // Espera entre análises: mais frequente quando o tempo aperta
      const waitMs = Math.max(5_000, Math.min(20_000, slotMs / 4));
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  // cleanup
  useEffect(() => () => { stopRef.current = true; }, []);

  return { state, start, stop };
}
