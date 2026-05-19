// Loop "live" para o módulo de paper trading: a IA observa preços reais (Binance),
// gera sinais novos a cada N ms, atualiza ordens existentes com o preço atual,
// fecha ordens em stop/target e grava o resultado para aprender.

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchSignalForAsset,
  recordOutcome,
  updateOrderWithPrice,
} from "@/lib/ai-live-engine";
import { fetchLiveCandles } from "@/lib/market-live";
import type { AISignal, PaperOrder, Trade } from "@/lib/types";

interface Options {
  assets: string[];
  intervalMs?: number; // gerar sinal a cada X
  priceMs?: number; // atualizar preços a cada X
  minConfidence?: number;
  maxOpen?: number;
}

export function useLiveAutoTrader(enabled: boolean, opts: Options) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("parado");
  const [lastSignal, setLastSignal] = useState<AISignal | null>(null);
  const tickRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setStatus("parado");
      return;
    }
    let alive = true;
    const intervalMs = opts.intervalMs ?? 60_000;
    const priceMs = opts.priceMs ?? 15_000;
    const minConf = opts.minConfidence ?? 55;
    const maxOpen = opts.maxOpen ?? 5;

    setStatus("ligado · observando mercado");

    async function refreshPrices() {
      const orders = qc.getQueryData<PaperOrder[]>(["paper-orders"]) ?? [];
      const openOrders = orders.filter((o) => o.status === "OPEN");
      if (openOrders.length === 0) return;

      // Pega o último preço de cada ativo aberto
      const assets = Array.from(new Set(openOrders.map((o) => o.asset)));
      const prices: Record<string, number> = {};
      await Promise.all(
        assets.map(async (a) => {
          try {
            const candles = await fetchLiveCandles(a, "1m", 2);
            const last = candles[candles.length - 1];
            if (last?.close) prices[a] = last.close;
          } catch {
            /* ignore */
          }
        }),
      );

      const closedTrades: Trade[] = [];
      const next: PaperOrder[] = orders.map((o) => {
        if (o.status !== "OPEN" || !prices[o.asset]) return o;
        const { order, closed } = updateOrderWithPrice(o, prices[o.asset]);
        if (closed) {
          closedTrades.push(closed);
          recordOutcome(o.asset, "AI Live", closed.result === "WIN", 60);
          toast.success(
            `IA fechou ${o.asset} (${closed.result}) ${closed.pnl >= 0 ? "+" : ""}$${closed.pnl}`,
          );
        }
        return order;
      });

      qc.setQueryData<PaperOrder[]>(["paper-orders"], next);
      if (closedTrades.length) {
        qc.setQueryData<Trade[]>(["trades", 50], (prev) => [
          ...closedTrades,
          ...(prev ?? []),
        ]);
        qc.invalidateQueries({ queryKey: ["trades"] });
      }
    }

    async function generate() {
      const orders = qc.getQueryData<PaperOrder[]>(["paper-orders"]) ?? [];
      const openCount = orders.filter((o) => o.status === "OPEN").length;
      if (openCount >= maxOpen) {
        setStatus(`aguardando · ${openCount}/${maxOpen} ordens abertas`);
        return;
      }
      const asset = opts.assets[tickRef.current % opts.assets.length];
      tickRef.current += 1;
      setStatus(`analisando ${asset}…`);
      try {
        const sig = await fetchSignalForAsset(asset, "5m");
        if (!sig || !alive) return;
        setLastSignal(sig);
        qc.setQueryData<AISignal[]>(["signals", 10], (prev) =>
          [sig, ...(prev ?? [])].slice(0, 10),
        );
        if (sig.kind === "WAIT" || sig.confidence < minConf) {
          setStatus(`${asset}: ${sig.kind} ${sig.confidence}% (abaixo do limiar)`);
          return;
        }
        // Abre ordem paper
        const order: PaperOrder = {
          id: `live-${Date.now()}`,
          asset: sig.asset,
          side: sig.kind === "BUY" ? "BUY" : "SELL",
          qty: sig.qty,
          entry: sig.entry,
          current: sig.entry,
          stop: sig.stop,
          target: sig.target,
          pnl: 0,
          status: "OPEN",
          openedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        };
        qc.setQueryData<PaperOrder[]>(["paper-orders"], (prev) => [order, ...(prev ?? [])]);
        toast.success(`IA abriu ${order.side} ${order.asset} @ ${order.entry} (${sig.confidence}%)`);
        setStatus(`abriu ${order.side} ${order.asset}`);
      } catch (err) {
        setStatus(`erro: ${(err as Error).message}`);
      }
    }

    // Roda imediatamente e depois em intervalos
    generate();
    refreshPrices();
    const i1 = setInterval(generate, intervalMs);
    const i2 = setInterval(refreshPrices, priceMs);
    return () => {
      alive = false;
      clearInterval(i1);
      clearInterval(i2);
    };
  }, [enabled, qc, opts.assets, opts.intervalMs, opts.priceMs, opts.minConfidence, opts.maxOpen]);

  return { status, lastSignal };
}
