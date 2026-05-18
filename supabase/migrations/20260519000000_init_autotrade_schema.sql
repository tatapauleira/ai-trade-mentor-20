-- AutoTrade AI — schema inicial (paper trading apenas)
-- Tabelas: profiles, assets, market_candles, ai_signals, strategies,
--          backtests, paper_orders, trades, risk_settings, ai_learning_logs

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE signal_kind AS ENUM ('BUY', 'SELL', 'WAIT');
CREATE TYPE order_side AS ENUM ('BUY', 'SELL');
CREATE TYPE order_status AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');
CREATE TYPE trade_result AS ENUM ('WIN', 'LOSS', 'BREAKEVEN');
CREATE TYPE backtest_status AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE learning_decision AS ENUM ('GENERATED', 'APPROVED', 'REJECTED', 'AUTO_EXECUTED', 'BLOCKED');
CREATE TYPE asset_class AS ENUM ('crypto', 'stock', 'forex');

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  paper_balance NUMERIC(18, 2) NOT NULL DEFAULT 10000.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- assets
-- ---------------------------------------------------------------------------
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  asset_class asset_class NOT NULL DEFAULT 'crypto',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- market_candles
-- ---------------------------------------------------------------------------
CREATE TABLE public.market_candles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  timeframe TEXT NOT NULL DEFAULT '1h',
  open NUMERIC(18, 8) NOT NULL,
  high NUMERIC(18, 8) NOT NULL,
  low NUMERIC(18, 8) NOT NULL,
  close NUMERIC(18, 8) NOT NULL,
  volume NUMERIC(24, 8) NOT NULL DEFAULT 0,
  candle_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (asset_id, timeframe, candle_time)
);

CREATE INDEX idx_market_candles_asset_tf_time
  ON public.market_candles (asset_id, timeframe, candle_time DESC);

-- ---------------------------------------------------------------------------
-- strategies
-- ---------------------------------------------------------------------------
CREATE TABLE public.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  win_rate NUMERIC(5, 2) DEFAULT 0,
  total_trades INTEGER DEFAULT 0,
  profit_factor NUMERIC(8, 4) DEFAULT 0,
  weight NUMERIC(5, 4) NOT NULL DEFAULT 0.1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- ai_signals
-- ---------------------------------------------------------------------------
CREATE TABLE public.ai_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  signal signal_kind NOT NULL,
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  entry NUMERIC(18, 8) NOT NULL,
  stop_loss NUMERIC(18, 8) NOT NULL,
  take_profit NUMERIC(18, 8) NOT NULL,
  risk_percent NUMERIC(6, 4) NOT NULL,
  strategy TEXT NOT NULL,
  market_regime TEXT NOT NULL,
  reason TEXT NOT NULL,
  blocked BOOLEAN NOT NULL DEFAULT false,
  block_reason TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_signals_user_created
  ON public.ai_signals (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- backtests
-- ---------------------------------------------------------------------------
CREATE TABLE public.backtests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  timeframe TEXT NOT NULL DEFAULT '1h',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  initial_capital NUMERIC(18, 2) NOT NULL DEFAULT 10000,
  status backtest_status NOT NULL DEFAULT 'PENDING',
  results JSONB NOT NULL DEFAULT '{}',
  metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- paper_orders
-- ---------------------------------------------------------------------------
CREATE TABLE public.paper_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES public.ai_signals(id) ON DELETE SET NULL,
  side order_side NOT NULL,
  qty NUMERIC(18, 8) NOT NULL,
  entry_price NUMERIC(18, 8) NOT NULL,
  current_price NUMERIC(18, 8) NOT NULL,
  stop_loss NUMERIC(18, 8) NOT NULL,
  take_profit NUMERIC(18, 8) NOT NULL,
  status order_status NOT NULL DEFAULT 'OPEN',
  pnl NUMERIC(18, 2) NOT NULL DEFAULT 0,
  risk_percent NUMERIC(6, 4),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_paper_orders_user_status
  ON public.paper_orders (user_id, status);

-- ---------------------------------------------------------------------------
-- trades (histórico fechado — paper)
-- ---------------------------------------------------------------------------
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  paper_order_id UUID REFERENCES public.paper_orders(id) ON DELETE SET NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  side order_side NOT NULL,
  entry NUMERIC(18, 8) NOT NULL,
  exit NUMERIC(18, 8) NOT NULL,
  qty NUMERIC(18, 8) NOT NULL,
  pnl NUMERIC(18, 2) NOT NULL,
  result trade_result NOT NULL,
  strategy TEXT,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trades_user_closed
  ON public.trades (user_id, closed_at DESC);

-- ---------------------------------------------------------------------------
-- risk_settings
-- ---------------------------------------------------------------------------
CREATE TABLE public.risk_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_risk_per_trade_percent NUMERIC(6, 4) NOT NULL DEFAULT 1.0,
  max_daily_loss_percent NUMERIC(6, 4) NOT NULL DEFAULT 3.0,
  max_drawdown_percent NUMERIC(6, 4) NOT NULL DEFAULT 10.0,
  max_open_positions INTEGER NOT NULL DEFAULT 5,
  paper_balance NUMERIC(18, 2) NOT NULL DEFAULT 10000.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- ai_learning_logs
-- ---------------------------------------------------------------------------
CREATE TABLE public.ai_learning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES public.ai_signals(id) ON DELETE SET NULL,
  decision learning_decision NOT NULL,
  outcome TEXT,
  feedback TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_learning_logs_user_created
  ON public.ai_learning_logs (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Triggers: updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER strategies_updated_at
  BEFORE UPDATE ON public.strategies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER risk_settings_updated_at
  BEFORE UPDATE ON public.risk_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile + risk_settings on signup
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.risk_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Seed: ativos padrão
-- ---------------------------------------------------------------------------
INSERT INTO public.assets (symbol, name, asset_class) VALUES
  ('BTCUSDT', 'Bitcoin / USDT', 'crypto'),
  ('ETHUSDT', 'Ethereum / USDT', 'crypto'),
  ('SOLUSDT', 'Solana / USDT', 'crypto'),
  ('AAPL', 'Apple Inc.', 'stock'),
  ('TSLA', 'Tesla Inc.', 'stock'),
  ('NVDA', 'NVIDIA Corp.', 'stock'),
  ('EURUSD', 'Euro / US Dollar', 'forex');

-- Estratégias globais (user_id NULL = sistema)
INSERT INTO public.strategies (user_id, name, description, win_rate, total_trades, profit_factor, weight, enabled) VALUES
  (NULL, 'Média Móvel Cruzada', 'Cruzamento MM20 / MM50 para captura de tendência.', 58, 142, 1.62, 0.22, true),
  (NULL, 'RSI Reversão', 'Compra em sobrevenda, venda em sobrecompra com confirmação.', 54, 96, 1.38, 0.15, true),
  (NULL, 'Breakout Máx/Mín', 'Rompimento da máxima/mínima de N períodos com volume.', 49, 88, 1.74, 0.20, true),
  (NULL, 'Momentum + Volume', 'Aceleração de preço confirmada por volume crescente.', 61, 120, 1.81, 0.23, true),
  (NULL, 'Mean Reversion', 'Retorno à média em mercados laterais de baixa volatilidade.', 56, 104, 1.29, 0.12, true),
  (NULL, 'Adaptativa (IA)', 'Estratégia híbrida escolhida pela IA conforme regime de mercado.', 64, 78, 1.93, 0.08, true);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_candles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_learning_logs ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- assets & candles (leitura pública autenticada)
CREATE POLICY assets_select_authenticated ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY candles_select_authenticated ON public.market_candles FOR SELECT TO authenticated USING (true);

-- user-owned tables
CREATE POLICY ai_signals_own ON public.ai_signals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY strategies_select ON public.strategies FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY strategies_own ON public.strategies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY backtests_own ON public.backtests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY paper_orders_own ON public.paper_orders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY trades_own ON public.trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY risk_settings_own ON public.risk_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY ai_learning_logs_own ON public.ai_learning_logs FOR ALL USING (auth.uid() = user_id);
