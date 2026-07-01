# WABA Voxion — Plataforma de WhatsApp com Meta Cloud API

Aplicativo web próprio conectado diretamente à Meta Cloud API (WABA) oficial do WhatsApp. Uma solução robusta, rápida e estável para qualificação automatizada de leads via inteligência artificial SDR e controle de disparos em massa, sem depender de intermediários (como Evolution, n8n, Chatwoot, Redis ou Google Sheets).

## 🚀 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- **Banco de Dados & Auth**: [Supabase](https://supabase.com/)
- **Estilização**: Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/)
- **Integração de Mensagens**: Meta Cloud API (Graph API v22.0)
- **Inteligência Artificial (SDR)**: OpenAI (`gpt-4o-mini`)
- **Deploy**: Vercel ou Hostinger

---

## ⚙️ Variáveis de Ambiente (`.env.local`)

Crie o arquivo `.env.local` na raiz do projeto com a seguinte estrutura:

| Variável | Descrição | Exemplo / Placeholder |
| :--- | :--- | :--- |
| `WHATSAPP_TOKEN` | Token de Acesso Permanente da Meta API | `EAAG...` |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do Número de Telefone Comercial na Meta | `104592...` |
| `WHATSAPP_VERIFY_TOKEN` | Token secreto para validação do Webhook | `waba_voxion_secret` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto do Supabase | `https://hjysxoejbqnzezusxvfk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima pública do Supabase | `eyJhbG...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta Admin do Supabase (ignora RLS) | `eyJhbG...` |
| `OPENAI_API_KEY` | Chave da OpenAI API para o agente SDR | `sk-proj-...` |
| `NEXT_PUBLIC_APP_URL` | URL pública onde o aplicativo está rodando | `http://localhost:3000` |

---

## 💾 Estrutura do Banco de Dados (SQL Supabase)

Execute o script SQL abaixo no **SQL Editor** do seu console do Supabase para criar as tabelas necessárias:

```sql
-- 1. Tabela de Leads
CREATE TABLE leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text UNIQUE NOT NULL, -- adicionado unique para permitir upsert por telefone
  status text DEFAULT 'pending', -- pending | sent | failed
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2. Tabela de Mensagens
CREATE TABLE messages (
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

-- 3. Tabela de Conversas (Contexto SDR)
CREATE TABLE conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phone text UNIQUE NOT NULL,
  name text,
  ai_memory jsonb DEFAULT '[]',   -- últimas N mensagens para o GPT
  stage text DEFAULT 'new',       -- new | qualified | converted | lost
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 4. Tabela de Campanhas
CREATE TABLE campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  message text NOT NULL,
  total int DEFAULT 0,
  sent int DEFAULT 0,
  failed int DEFAULT 0,
  status text DEFAULT 'pending',  -- pending | running | done | error
  created_at timestamptz DEFAULT now()
);

-- 5. Tabela de Junção de Leads da Campanha
CREATE TABLE campaign_leads (
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',  -- pending | sent | failed
  error_msg text,
  PRIMARY KEY (campaign_id, lead_id)
);
```

---

## 💻 Como Rodar Localmente

1. Clone o repositório ou navegue até a pasta:
   ```bash
   cd waba-voxion
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure o arquivo de ambiente:
   - Preencha as credenciais no arquivo `.env.local` na raiz.

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 🔗 Configuração do Webhook na Meta

Para instruções detalhadas de como vincular seu número de telefone e receber mensagens em tempo real:
Veja as instruções em [webhook-setup.md](file:///Users/teluski/.gemini/antigravity-ide/scratch/waba-voxion/public/webhook-setup.md).

---

## 🚀 Deploy

### Vercel (Recomendado)
1. Instale a CLI do Vercel (`npm install -g vercel`) ou conecte seu repositório GitHub ao painel da Vercel.
2. Execute o comando de deploy rápido:
   ```bash
   npx vercel
   ```
3. Lembre-se de adicionar todas as variáveis listadas no `.env.local` nas configurações de Environment Variables do projeto na Vercel.

### Hostinger
1. Gere a build do projeto localmente:
   ```bash
   npm run build
   ```
2. Realize o deploy da aplicação Node.js utilizando o painel hPanel da Hostinger, configurando a porta do servidor e as variáveis de ambiente equivalentes.
