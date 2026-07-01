import { NextRequest, NextResponse } from 'next/server';
import { sendTextMessage } from '../../../../lib/whatsapp';

/**
 * POST: Rota de envio de mensagem de texto simples pelo WhatsApp Cloud API
 * Body esperado: { to: string, message: string }
 */
export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Corpo da requisição deve ser um JSON válido contendo "to" e "message".' },
        { status: 400 }
      );
    }

    const { to, message } = body;

    // Valida os campos obrigatórios
    if (!to || typeof to !== 'string') {
      return NextResponse.json(
        { error: 'O parâmetro "to" (número do destinatário) é obrigatório e deve ser uma string.' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'O parâmetro "message" (conteúdo da mensagem) é obrigatório e deve ser uma string.' },
        { status: 400 }
      );
    }

    console.log(`[Send API] Enviando mensagem para ${to}...`);
    
    // Dispara a mensagem através da biblioteca centralizada
    const metaResponse = await sendTextMessage(to, message);

    console.log(`[Send API] Mensagem enviada com sucesso para ${to}. ID: ${metaResponse?.messages?.[0]?.id}`);
    
    return NextResponse.json(metaResponse, { status: 200 });
  } catch (error: any) {
    console.error('[Send API] Erro ao enviar mensagem pelo WhatsApp:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao enviar mensagem pelo WhatsApp Cloud API.',
        message: error.message || String(error)
      },
      { status: 500 }
    );
  }
}
