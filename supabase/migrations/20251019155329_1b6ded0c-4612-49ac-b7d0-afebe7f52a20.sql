-- Limpar todas as predições existentes
DELETE FROM ai_predictions;

-- Criar tabela de locks para prevenir execuções simultâneas
CREATE TABLE IF NOT EXISTS generation_locks (
  plan subscription_plan PRIMARY KEY,
  is_generating boolean DEFAULT false,
  last_generated_at timestamptz,
  locked_at timestamptz
);

-- Inserir registros iniciais para cada plano
INSERT INTO generation_locks (plan, is_generating, last_generated_at)
VALUES 
  ('free', false, NULL),
  ('basic', false, NULL),
  ('premium', false, NULL)
ON CONFLICT (plan) DO NOTHING;

-- Criar índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_generation_locks_plan ON generation_locks(plan);

-- Garantir RLS na tabela generation_locks (leitura pública, sem modificação)
ALTER TABLE generation_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to generation_locks"
ON generation_locks FOR SELECT
TO public
USING (true);