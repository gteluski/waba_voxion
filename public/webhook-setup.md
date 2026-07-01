# Como configurar o Webhook na Meta

Este guia orienta o processo de configuração do webhook para que sua aplicação Next.js WABA Voxion receba atualizações de mensagens do WhatsApp em tempo real.

## Passo a Passo

1. **Acesse o Portal do Facebook Developers**:
   Vá para [developers.facebook.com](https://developers.facebook.com/) e selecione o aplicativo correspondente.

2. **Navegue até a Seção do WhatsApp**:
   No menu lateral, expanda **WhatsApp** e clique em **Configuration** (Configuração).

3. **Editar Webhook**:
   Na área **Webhook**, clique no botão **Edit** (Editar).

4. **Configurar os Campos**:
   - **Callback URL**: `https://seu-dominio.com/api/webhook` (Substitua `seu-dominio.com` pela URL de deploy da sua aplicação HTTPS, como a gerada pela Vercel).
   - **Verify Token**: `waba_voxion_secret` (Ou o valor correspondente definido no `.env.local` em `WHATSAPP_VERIFY_TOKEN`).

5. **Salvar**:
   Clique em **Verify and Save** (Verificar e Salvar). A Meta enviará uma requisição GET para seu endpoint para validar o token.

6. **Assinar as Mensagens**:
   Na tabela **Webhook Fields** (Campos de Webhook), localize a linha **messages** e clique em **Subscribe** (Assinar) para que o aplicativo passe a receber as mensagens dos usuários.
