import { NextRequest } from 'next/server'
import { verifyWebhook, markMessageAsRead, sendTextMessage } from '@/lib/meta'
import { supabaseAdmin } from '@/lib/supabase'
import { getSDRResponse } from '@/lib/openai'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode') || ''
  const token = searchParams.get('hub.verify_token') || ''
  const challenge = searchParams.get('hub.challenge') || ''

  const responseChallenge = verifyWebhook(mode, token, challenge)

  if (responseChallenge !== null) {
    return new Response(responseChallenge, { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log para fins de debug e auditoria
    console.log('[Webhook] Received payload:', JSON.stringify(body, null, 2))

    // Se o payload for de alteração de status da mensagem, apenas respondemos 200
    const entry = body.entry?.[0]
    const change = entry?.changes?.[0]
    const value = change?.value

    if (!value || !value.messages || value.messages.length === 0) {
      console.log('[Webhook] No messages to process (status update or other event)')
      return new Response('Success', { status: 200 })
    }

    const message = value.messages[0]
    const contact = value.contacts?.[0]

    const phone = contact?.wa_id || message.from
    const name = contact?.profile?.name || 'Desconhecido'
    const messageId = message.id

    // Tratar o tipo de mensagem e seu conteúdo correspondente
    let type: 'text' | 'audio' | 'image' | 'file' = 'text'
    let content = ''

    if (message.type === 'text') {
      type = 'text'
      content = message.text?.body || ''
    } else if (message.type === 'audio') {
      type = 'audio'
      content = '[Áudio recebido - transcrição não disponível]'
    } else if (message.type === 'image') {
      type = 'image'
      content = '[Imagem recebida]'
    } else if (message.type === 'document') {
      type = 'file'
      content = '[Arquivo recebido]'
    } else {
      type = 'file'
      content = `[Mídia recebida: ${message.type}]`
    }

    // 1. Marca a mensagem como lida
    try {
      await markMessageAsRead(messageId)
    } catch (e) {
      console.error('[Webhook] Failed to mark message as read:', e)
    }

    // 2. Salva a mensagem recebida no Supabase
    const { error: msgInsertError } = await supabaseAdmin.from('messages').insert({
      wamid: messageId,
      phone,
      direction: 'inbound',
      type,
      content,
      status: 'received',
    })

    if (msgInsertError) {
      console.error('[Webhook] Error inserting inbound message:', msgInsertError)
    }

    // 3. Upsert na tabela de conversas
    const { data: convs, error: convSelectError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('phone', phone)

    if (convSelectError) {
      console.error('[Webhook] Error fetching conversation:', convSelectError)
    }

    const existingConv = convs && convs.length > 0 ? convs[0] : null
    let conversationHistory: Array<{ role: string; content: string }> = []

    if (existingConv) {
      conversationHistory = existingConv.ai_memory || []
      // Atualiza o nome se ele mudou ou não estava definido
      const { error: convUpdateError } = await supabaseAdmin
        .from('conversations')
        .update({
          name: existingConv.name || name,
          updated_at: new Date().toISOString(),
        })
        .eq('phone', phone)

      if (convUpdateError) {
        console.error('[Webhook] Error updating conversation:', convUpdateError)
      }
    } else {
      const { error: convInsertError } = await supabaseAdmin.from('conversations').insert({
        phone,
        name,
        stage: 'new',
        ai_memory: [],
      })

      if (convInsertError) {
        console.error('[Webhook] Error inserting conversation:', convInsertError)
      }
    }

    // 4. Chama a IA do SDR para obter uma resposta
    let sdrResponse = ''
    try {
      sdrResponse = await getSDRResponse(phone, content, conversationHistory)
    } catch (e) {
      console.error('[Webhook] OpenAI Error:', e)
      sdrResponse = 'Olá! Desculpe, tive um pequeno problema ao processar sua resposta. Posso te ajudar com algo mais?'
    }

    // 5. Envia a resposta do SDR para o WhatsApp do lead
    let outboundWamid: string | null = null
    try {
      const sendResult = await sendTextMessage(phone, sdrResponse)
      outboundWamid = sendResult.wamid
    } catch (e) {
      console.error('[Webhook] Error sending message via Meta API:', e)
    }

    // 6. Salva a resposta enviada nas mensagens do Supabase
    const { error: outboundMsgInsertError } = await supabaseAdmin.from('messages').insert({
      wamid: outboundWamid,
      phone,
      direction: 'outbound',
      type: 'text',
      content: sdrResponse,
      status: outboundWamid ? 'sent' : 'failed',
    })

    if (outboundMsgInsertError) {
      console.error('[Webhook] Error inserting outbound message:', outboundMsgInsertError)
    }

    // 7. Atualiza o histórico de conversas no Supabase (limite de 20 itens / 10 pares)
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', content },
      { role: 'assistant', content: sdrResponse },
    ]
    const limitedHistory = updatedHistory.slice(-20)

    const { error: convHistoryUpdateError } = await supabaseAdmin
      .from('conversations')
      .update({
        ai_memory: limitedHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('phone', phone)

    if (convHistoryUpdateError) {
      console.error('[Webhook] Error updating conversation history:', convHistoryUpdateError)
    }

    return new Response('Success', { status: 200 })
  } catch (error) {
    console.error('[Webhook] Internal Server Error:', error)
    // Sempre retorna 200 para evitar que a Meta tente reenviar e trave
    return new Response('Success', { status: 200 })
  }
}
