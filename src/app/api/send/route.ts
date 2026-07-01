import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendTextMessage } from '@/lib/meta'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, message } = body

    if (!phone || !message) {
      return Response.json({ error: 'Telefone e mensagem são obrigatórios.' }, { status: 400 })
    }

    // Envia a mensagem usando a Meta API
    const { wamid } = await sendTextMessage(phone, message)

    // Grava a mensagem outbound na tabela messages do Supabase
    const { error: insertError } = await supabaseAdmin.from('messages').insert({
      wamid,
      phone,
      direction: 'outbound',
      type: 'text',
      content: message,
      status: 'sent',
    })

    if (insertError) {
      console.error('[Send API] Error logging manual message to Supabase:', insertError)
      // Não interrompe o retorno pois a mensagem já foi enviada no WhatsApp
    }

    return Response.json({ success: true, wamid })
  } catch (error: any) {
    console.error('[Send API] Error:', error)
    return Response.json(
      { error: error.message || 'Falha interna ao enviar a mensagem.' },
      { status: 500 }
    )
  }
}
