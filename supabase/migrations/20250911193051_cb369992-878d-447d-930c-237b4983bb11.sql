-- Remover políticas existentes se existirem
DROP POLICY IF EXISTS "Anyone can view coins" ON coins;
DROP POLICY IF EXISTS "Anyone can view latest markets" ON latest_markets;
DROP POLICY IF EXISTS "Anyone can view markets history" ON markets_history;

-- Recriar as políticas
CREATE POLICY "Anyone can view coins" 
ON coins FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view latest markets" 
ON latest_markets FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view markets history" 
ON markets_history FOR SELECT 
USING (true);

-- Criar tabelas de notificações se não existirem
CREATE TABLE IF NOT EXISTS email_notifications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    coin_id VARCHAR(100) REFERENCES coins(id),
    price_threshold DECIMAL(20, 8) NOT NULL,
    threshold_type VARCHAR(10) CHECK (threshold_type IN ('above', 'below')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_log (
    id SERIAL PRIMARY KEY,
    email_notification_id INTEGER REFERENCES email_notifications(id),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    price_at_notification DECIMAL(20, 8),
    status VARCHAR(20) DEFAULT 'sent'
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Políticas para as novas tabelas
CREATE POLICY "Anyone can view email notifications" 
ON email_notifications FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create email notifications" 
ON email_notifications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view notification log" 
ON notification_log FOR SELECT 
USING (true);