# AutoTrade AI — Backend Supabase

Backend em **paper trading** (sem dinheiro real).

## Estrutura

| Pasta / arquivo | Descrição |
|-----------------|-----------|
| `migrations/` | Schema SQL (10 tabelas + RLS + seeds) |
| `functions/generate-ai-signal` | Gera sinal IA + validação de risco + persistência |
| `functions/run-backtest` | Executa backtest sobre candles |
| `functions/execute-paper-order` | Cria ordem simulada |
| `functions/update-market-data` | Atualiza candles (Binance para crypto) |
| `functions/evaluate-strategy-performance` | Métricas por estratégia |

## Tabelas

- `profiles`, `assets`, `market_candles`, `ai_signals`, `strategies`
- `backtests`, `paper_orders`, `trades`, `risk_settings`, `ai_learning_logs`

## Frontend

1. Copie `.env.example` para `.env.local`
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
3. No Supabase Dashboard → Authentication → Providers: habilite **Anonymous sign-ins** (para modo demo)
4. `npm run dev`

Sem variáveis de ambiente, o app usa dados mock automaticamente.

## Deploy

```bash
# Instalar CLI: https://supabase.com/docs/guides/cli
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
supabase functions deploy generate-ai-signal
supabase functions deploy run-backtest
supabase functions deploy execute-paper-order
supabase functions deploy update-market-data
supabase functions deploy evaluate-strategy-performance
```

## Exemplo: gerar sinal

```bash
curl -X POST "$SUPABASE_URL/functions/v1/generate-ai-signal" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"asset":"BTCUSDT","timeframe":"1h"}'
```

Resposta:

```json
{
  "asset": "BTCUSDT",
  "signal": "BUY",
  "confidence": 72,
  "entry": 65000,
  "stop_loss": 64200,
  "take_profit": 66300,
  "risk_percent": 1.23,
  "strategy": "Breakout Máx/Mín",
  "market_regime": "uptrend",
  "reason": "...",
  "signal_id": "uuid",
  "blocked": false
}
```

## Validação de risco

Bloqueia operação quando:

1. `risk_percent` > `max_risk_per_trade_percent`
2. Perda diária ≥ `max_daily_loss_percent` do saldo paper
3. Drawdown ≥ `max_drawdown_percent`
4. Posições abertas ≥ `max_open_positions`

Todos os sinais (incluindo bloqueados) são salvos em `ai_signals` e `ai_learning_logs`.

## Variáveis (Edge Functions)

Definidas automaticamente no Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.
