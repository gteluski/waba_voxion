-- 1. Criar tabela para armazenar mensagens recebidas do WhatsApp (Meta Webhook bruto)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  from_number text NOT NULL,
  body text,
  wa_message_id text UNIQUE,
  raw_payload jsonb,
  received_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_wa_message_id ON whatsapp_messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from_number ON whatsapp_messages(from_number);

-- 2. Tabela de Leads
CREATE TABLE IF NOT EXISTS leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text UNIQUE NOT NULL,
  status text DEFAULT 'pending', -- pending | sent | failed
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 3. Tabela de Mensagens (Histórico de Chat da Aplicação)
CREATE TABLE IF NOT EXISTS messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  wamid text UNIQUE,              -- ID da mensagem na Meta
  phone text NOT NULL,
  direction text NOT NULL,        -- inbound | outbound
  type text NOT NULL,             -- text | audio | image | file
  content text,
  media_url text,
  status text DEFAULT 'received', -- received | read | sent | failed
  created_at timestamptz DEFAULT now()
);

-- 4. Tabela de Conversas (Contexto SDR e Inteligência Artificial)
CREATE TABLE IF NOT EXISTS conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phone text UNIQUE NOT NULL,
  name text,
  ai_memory jsonb DEFAULT '[]',   -- últimas N mensagens para o GPT
  stage text DEFAULT 'new',       -- new | qualified | converted | lost
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 5. Tabela de Campanhas
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  message text NOT NULL,
  total int DEFAULT 0,
  sent int DEFAULT 0,
  failed int DEFAULT 0,
  status text DEFAULT 'pending',  -- pending | running | done | error
  created_at timestamptz DEFAULT now()
);

-- 6. Tabela de Junção de Leads da Campanha
CREATE TABLE IF NOT EXISTS campaign_leads (
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',  -- pending | sent | failed
  error_msg text,
  PRIMARY KEY (campaign_id, lead_id)
);
