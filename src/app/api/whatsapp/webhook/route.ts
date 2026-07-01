import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../lib/supabase';

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';
const FB_APP_SECRET = process.env.FB_APP_SECRET || '';

/**
 * Validação de Assinatura do Webhook (x-hub-signature-256)
 * Previne que payloads não autenticados sejam processados.
 */
function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return false;
  }

  const expectedSignature = parts[1];
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const actualSignature = hmac.digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(actualSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    return false;
  }
}

/**
 * GET: Verificação do Webhook pela Meta
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    console.log('[Webhook] Webhook verificado com sucesso.');
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[Webhook] Falha na verificação do webhook. Token incorreto.');
  return new NextResponse('Forbidden', { status: 403 });
}

/**
 * POST: Processamento de Mensagens e Eventos do WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Se FB_APP_SECRET estiver configurado, valida a assinatura HMAC SHA-256
    if (FB_APP_SECRET) {
      const signature = request.headers.get('x-hub-signature-256');
      if (!verifySignature(rawBody, signature, FB_APP_SECRET)) {
        console.warn('[Webhook] Assinatura do webhook inválida (x-hub-signature-256). Ignorando silenciosamente.');
        // Retorna 200 com status ok para que a Meta não repita a requisição, mas não processa nada
        return NextResponse.json({ status: 'ok' }, { status: 200 });
      }
    }

    const payload = JSON.parse(rawBody);

    // Verifica se é uma notificação do WhatsApp Business Account
    if (payload.object === 'whatsapp_business_account') {
      const entries = payload.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];

        for (const change of changes) {
          // Apenas processa se for o campo de mensagens
          if (change.field === 'messages') {
            const value = change.value;
            const messages = value?.messages || [];

            for (const message of messages) {
              // Somente processa e salva mensagens de texto recebidas
              if (message.type === 'text' && message.text?.body) {
                const fromNumber = message.from;
                const body = message.text.body;
                const waMessageId = message.id;
                
                // Converte timestamp do WhatsApp (Unix em segundos) para ISO
                const receivedAt = message.timestamp
                  ? new Date(parseInt(message.timestamp) * 1000).toISOString()
                  : new Date().toISOString();

                console.log(`[Webhook] Nova mensagem recebida de ${fromNumber}: "${body}" (ID: ${waMessageId})`);

                // Insere no Supabase utilizando o cliente administrativo (supabaseAdmin) para bypassar RLS
                const { error } = await supabaseAdmin
                  .from('whatsapp_messages')
                  .insert({
                    from_number: fromNumber,
                    body: body,
                    wa_message_id: waMessageId,
                    raw_payload: value, // Persiste os metadados e contatos da mudança
                    received_at: receivedAt,
                  });

                if (error) {
                  console.error('[Webhook] Erro ao persistir mensagem no Supabase:', error);
                } else {
                  console.log(`[Webhook] Mensagem ${waMessageId} persistida com sucesso.`);
                }
              }
            }
          }
        }
      }
    }

    // Retorna resposta rápida para o Meta
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error: any) {
    console.error('[Webhook] Erro geral no processamento do webhook:', error);
    // Sempre responde 200 para evitar que o Meta tente enviar o mesmo payload problemático repetidamente
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }
}
