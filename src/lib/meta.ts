const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || ''
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || ''
const BASE_URL = 'https://graph.facebook.com/v22.0'

export async function sendTextMessage(phone: string, text: string): Promise<{ wamid: string }> {
  const url = `${BASE_URL}/${PHONE_NUMBER_ID}/messages`
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: text },
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Meta API error: ${response.status} ${response.statusText} - ${errorData}`)
    }

    const data = await response.json()
    const wamid = data.messages?.[0]?.id
    if (!wamid) {
      throw new Error('No message ID returned from Meta API')
    }

    return { wamid }
  } catch (error) {
    console.error('[sendTextMessage] Error sending message:', error)
    throw error
  }
}

export async function markMessageAsRead(wamid: string): Promise<void> {
  const url = `${BASE_URL}/${PHONE_NUMBER_ID}/messages`
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: wamid,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Meta API error: ${response.status} ${response.statusText} - ${errorData}`)
    }
  } catch (error) {
    console.error('[markMessageAsRead] Error marking message as read:', error)
    throw error
  }
}

export async function getMediaUrl(mediaId: string): Promise<string> {
  const url = `${BASE_URL}/${mediaId}`
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Meta API error: ${response.status} ${response.statusText} - ${errorData}`)
    }

    const data = await response.json()
    if (!data.url) {
      throw new Error('No URL field returned for media ID')
    }

    return data.url
  } catch (error) {
    console.error('[getMediaUrl] Error getting media URL:', error)
    throw error
  }
}

export async function downloadMedia(mediaUrl: string): Promise<Buffer> {
  try {
    const response = await fetch(mediaUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Meta API error: ${response.status} ${response.statusText} - ${errorData}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('[downloadMedia] Error downloading media:', error)
    throw error
  }
}

export function verifyWebhook(mode: string, token: string, challenge: string): string | null {
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return challenge
  }
  console.warn('[verifyWebhook] Webhook verification failed')
  return null
}
