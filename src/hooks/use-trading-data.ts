import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import {
  evaluateStrategyPerformance,
  executePaperOrder,
  fetchAssets,
  fetchCandles,
  fetchPaperOrders,
  fetchProfile,
  fetchRiskSettings,
  fetchSignals,
  fetchStrategies,
  fetchTrades,
  generateAISignal,
  runBacktest,
  updateMarketData,
  updateRiskSettings,
} from "@/integrations/supabase/api";
import { mapEquityFromTrades } from "@/integrations/supabase/mappers";
import {
  mockAssets,
  mockEquityCurve,
  mockPaperOrders,
  mockPriceCandles,
  mockSignals,
  mockStrategies,
  mockTrades,
} from "@/lib/mock-data";
import type { RiskSettings } from "@/lib/types";

const stale = 30_000;

function useLiveEnabled() {
  const { mode, loading } = useAuth();
  return { enabled: !loading && mode === "live", isMock: mode === "mock" };
}

export function useAssets() {
  const { enabled, isMock } = useLiveEnabled();
  return useQuery({
    queryKey: ["assets"],
    queryFn: fetchAssets,
    enabled,
    staleTime: stale,
    placeholderData: isMock ? mockAssets : undefined,
    initialData: isMock ? mockAssets : undefined,
  });
}

export function useSignals(limit = 10) {
  const { enabled, isMock } = useLiveEnabled();
  return useQuery({
    queryKey: ["signals", limit],
    queryFn: () => fetchSignals(limit),
    enabled,
    staleTime: stale,
    initialData: isMock ? mockSignals.slice(0, limit) : undefined,
  });
}

export function usePaperOrders() {
  const { enabled, isMock } = useLiveEnabled();
  return useQuery({
    queryKey: ["paper-orders"],
    queryFn: fetchPaperOrders,
    enabled,
    staleTime: stale,
    initialData: isMock ? mockPaperOrders : undefined,
  });
}

export function useTrades(limit = 50) {
  const { enabled, isMock } = useLiveEnabled();
  return useQuery({
    queryKey: ["trades", limit],
    queryFn: () => fetchTrades(limit),
    enabled,
    staleTime: stale,
    initialData: isMock ? mockTrades : undefined,
  });
}

export function useStrategies() {
  const { enabled, isMock } = useLiveEnabled();
  return useQuery({
    queryKey: ["strategies"],
    queryFn: fetchStrategies,
    enabled,
    staleTime: stale,
    initialData: isMock ? mockStrategies : undefined,
  });
}

export function useRiskSettings() {
  const { enabled, isMock } = useLiveEnabled();
  return useQuery({
    queryKey: ["risk-settings"],
    queryFn: fetchRiskSettings,
    enabled,
    staleTime: stale,
    initialData: isMock
      ? {
          maxRiskPerTrade: 1,
          maxDailyLoss: 3,
          maxDrawdown: 10,
          maxOpenPositions: 5,
          paperBalance: 10000,
        }
      : undefined,
  });
}

export function useProfile() {
  const { enabled } = useLiveEnabled();
  return useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
    enabled,
    staleTime: stale,
  });
}

export function useCandles(asset: string, timeframe: string) {
  const { enabled, isMock } = useLiveEnabled();
  return useQuery({
    queryKey: ["candles", asset, timeframe],
    queryFn: () => fetchCandles(asset, timeframe),
    enabled: enabled && Boolean(asset),
    staleTime: stale,
    initialData: isMock ? mockPriceCandles : undefined,
  });
}

export function useEquityCurve() {
  const trades = useTrades();
  const risk = useRiskSettings();
  const { isMock } = useLiveEnabled();

  if (isMock) return { data: mockEquityCurve, isLoading: false };

  const balance = risk.data?.paperBalance ?? 10000;
  const curve = trades.data?.length
    ? mapEquityFromTrades(trades.data, balance)
    : mockEquityCurve;

  return { data: curve, isLoading: trades.isLoading || risk.isLoading };
}

export function useDashboardStats() {
  const orders = usePaperOrders();
  const trades = useTrades();
  const risk = useRiskSettings();
  const { isMock } = useLiveEnabled();

  const openPnl = (orders.data ?? []).reduce((s, o) => s + o.pnl, 0);
  const todayPnl = isMock ? 340.8 : openPnl;
  const balance = isMock ? 12480.55 : (risk.data?.paperBalance ?? 10000) + openPnl;
  const wins = (trades.data ?? []).filter((t) => t.result === "WIN").length;
  const total = trades.data?.length ?? 0;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : "—";

  return {
    balance,
    dailyPnl: todayPnl,
    winRate,
    openOrders: orders.data?.length ?? 0,
    maxRisk: risk.data?.maxRiskPerTrade ?? 1,
    isLoading: orders.isLoading,
  };
}

export function useGenerateSignal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ asset, timeframe }: { asset: string; timeframe?: string }) =>
      generateAISignal(asset, timeframe ?? "1h"),
    onSuccess: (signal) => {
      // Insere o sinal no topo do cache (funciona em mock e live)
      qc.setQueryData<unknown[]>(["signals", 5], (prev) => [signal, ...(prev ?? [])].slice(0, 5));
      qc.setQueryData<unknown[]>(["signals", 10], (prev) => [signal, ...(prev ?? [])].slice(0, 10));
      qc.setQueryData<unknown[]>(["signals", 3], (prev) => [signal, ...(prev ?? [])].slice(0, 3));
      qc.invalidateQueries({ queryKey: ["signals"] });
    },
  });
}

export function useExecutePaperOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (signalId: string) => {
      await executePaperOrder(signalId);
      return signalId;
    },
    onSuccess: () => {
      // Em mock, adiciona uma ordem fictícia ao cache
      qc.setQueryData<import("@/lib/types").PaperOrder[]>(["paper-orders"], (prev) => {
        const entry = 42000 + Math.random() * 4000;
        const newOrder: import("@/lib/types").PaperOrder = {
          id: `mock-${Date.now()}`,
          asset: "BTC/USDT",
          side: "BUY",
          qty: 0.05,
          entry: +entry.toFixed(2),
          current: +entry.toFixed(2),
          stop: +(entry * 0.98).toFixed(2),
          target: +(entry * 1.025).toFixed(2),
          pnl: 0,
          status: "OPEN",
          openedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        };
        return [newOrder, ...(prev ?? [])];
      });
      qc.invalidateQueries({ queryKey: ["paper-orders"] });
      qc.invalidateQueries({ queryKey: ["signals"] });
    },
  });
}

export function useRunBacktest() {
  return useMutation({
    mutationFn: runBacktest,
  });
}

export function useUpdateMarketData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (symbols?: string[]) => updateMarketData(symbols),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candles"] });
    },
  });
}

export function useSaveRiskSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: RiskSettings) => updateRiskSettings(settings),
    onSuccess: (_, settings) => {
      // Persiste no cache (mock e live)
      qc.setQueryData(["risk-settings"], settings);
      qc.invalidateQueries({ queryKey: ["risk-settings"] });
    },
  });
}

export function useEvaluatePerformance() {
  return useMutation({
    mutationFn: (strategyId?: string) => evaluateStrategyPerformance(strategyId),
  });
}

export function useRefreshMarketOnMount(asset: string) {
  const update = useUpdateMarketData();
  const { mode } = useAuth();

  return useQuery({
    queryKey: ["market-sync", asset],
    queryFn: async () => {
      if (mode === "live") {
        await update.mutateAsync([asset]);
      }
      return true;
    },
    enabled: mode === "live" && Boolean(asset),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
