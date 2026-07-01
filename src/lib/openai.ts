import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'placeholder-openai-key',
})

const SYSTEM_PROMPT = `Você é um assistente comercial da Voxion Studio, agência de marketing digital em Santo Antônio da Platina/PR. Sua função é qualificar leads interessados em marketing digital (sites, redes sociais, tráfego pago), responder dúvidas sobre os serviços e agendar uma conversa com o time comercial. Seja simpático, objetivo e profissional. Nunca invente preços. Se o lead demonstrar interesse real, peça o melhor horário para uma ligação. Responda sempre em português do Brasil.`

export async function getSDRResponse(
  phone: string,
  newMessage: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> {
  try {
    // Mantém apenas as últimas 10 mensagens do histórico para contexto
    const slicedHistory = conversationHistory.slice(-10)

    // Formata o histórico para o formato esperado pela OpenAI API
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...slicedHistory.map((msg) => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: newMessage },
    ]

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
    })

    const reply = response.choices[0]?.message?.content
    if (!reply) {
      throw new Error('OpenAI returned an empty response')
    }

    return reply
  } catch (error) {
    console.error('[getSDRResponse] Error calling OpenAI API:', error)
    throw error
  }
}
