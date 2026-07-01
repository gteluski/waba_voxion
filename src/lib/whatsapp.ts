const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
const FB_GRAPH_API_VERSION = process.env.FB_GRAPH_API_VERSION || 'v22.0';

const BASE_URL = `https://graph.facebook.com/${FB_GRAPH_API_VERSION}`;

/**
 * Helper genérico para realizar chamadas HTTP à API Graph da Meta
 */
async function callGraphApi(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${BASE_URL}${path}`;
  
  const headers = {
    'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const responseText = await response.text();
  let data: any;

  try {
    data = JSON.parse(responseText);
  } catch (err) {
    // Se não for JSON e o status de resposta for de erro, lance o erro com o texto original
    if (!response.ok) {
      throw new Error(`Graph API HTTP Error ${response.status}: ${responseText}`);
    }
    return responseText;
  }

  // A API Graph frequentemente retorna erros com status HTTP 200, encapsulando-os em um campo "error".
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }

  if (!response.ok) {
    throw new Error(`Graph API Error ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Solicita um código de verificação via SMS para o registro do número.
 * POST /{phoneId}/request_code?code_method=SMS&language=pt_BR
 */
export async function requestVerificationCode(phoneId: string): Promise<any> {
  if (!phoneId) {
    throw new Error('phoneId é obrigatório para requestVerificationCode');
  }
  return callGraphApi(`/${phoneId}/request_code?code_method=SMS&language=pt_BR`, {
    method: 'POST',
  });
}

/**
 * Verifica o código OTP enviado via SMS.
 * POST /{phoneId}/verify_code?code={otpCode}
 */
export async function verifyCode(phoneId: string, otpCode: string): Promise<any> {
  if (!phoneId || !otpCode) {
    throw new Error('phoneId e otpCode são obrigatórios para verifyCode');
  }
  return callGraphApi(`/${phoneId}/verify_code?code=${otpCode}`, {
    method: 'POST',
  });
}

/**
 * Registra o número de telefone na rede do WhatsApp Cloud API após validação do OTP.
 * POST /{phoneId}/register
 * body: { messaging_product: 'whatsapp', pin }
 */
export async function registerNumber(phoneId: string, pin: string): Promise<any> {
  if (!phoneId || !pin) {
    throw new Error('phoneId e pin são obrigatórios para registerNumber');
  }
  return callGraphApi(`/${phoneId}/register`, {
    method: 'POST',
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      pin,
    }),
  });
}

/**
 * Envia uma mensagem de texto simples para um contato.
 * POST /{WHATSAPP_PHONE_NUMBER_ID}/messages
 * body: { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { preview_url: false, body } }
 */
export async function sendTextMessage(to: string, body: string): Promise<any> {
  if (!WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID não está configurado nas variáveis de ambiente');
  }
  if (!to || !body) {
    throw new Error('Parâmetros "to" e "body" são obrigatórios para sendTextMessage');
  }
  return callGraphApi(`/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body,
      },
    }),
  });
}

/**
 * Envia uma mensagem com modelo (template) pré-aprovado.
 * POST /{WHATSAPP_PHONE_NUMBER_ID}/messages
 * body: { messaging_product: 'whatsapp', to, type: 'template', template: { name: templateName, language: { code: languageCode }, components } }
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  components: any[]
): Promise<any> {
  if (!WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error('WHATSAPP_PHONE_NUMBER_ID não está configurado nas variáveis de ambiente');
  }
  if (!to || !templateName || !languageCode) {
    throw new Error('Parâmetros "to", "templateName" e "languageCode" são obrigatórios para sendTemplateMessage');
  }
  return callGraphApi(`/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components,
      },
    }),
  });
}

/**
 * Busca os templates de mensagem aprovados ou pendentes de qualidade para a conta de negócios.
 * GET /{WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates?fields=name,language,status,components,category&limit=1000
 * Filtra a resposta para apenas templates com status APPROVED ou QUALITY_PENDING.
 */
export async function getApprovedTemplates(): Promise<any[]> {
  if (!WHATSAPP_BUSINESS_ACCOUNT_ID) {
    throw new Error('WHATSAPP_BUSINESS_ACCOUNT_ID não está configurado nas variáveis de ambiente');
  }
  
  const data = await callGraphApi(
    `/${WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates?fields=name,language,status,components,category&limit=1000`,
    {
      method: 'GET',
    }
  );

  if (!data || !Array.isArray(data.data)) {
    return [];
  }

  // Filtrar templates cujo status seja APPROVED ou QUALITY_PENDING
  return data.data.filter(
    (template: any) => template.status === 'APPROVED' || template.status === 'QUALITY_PENDING'
  );
}
