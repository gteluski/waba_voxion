export type Lead = {
  id: string
  name: string
  phone: string
  status: 'pending' | 'sent' | 'failed'
  sent_at: string | null
  created_at: string
}

export type Message = {
  id: string
  wamid: string | null
  phone: string
  direction: 'inbound' | 'outbound'
  type: 'text' | 'audio' | 'image' | 'file'
  content: string | null
  media_url: string | null
  status: string
  created_at: string
}

export type Conversation = {
  id: string
  phone: string
  name: string | null
  ai_memory: Array<{role: string; content: string}>
  stage: 'new' | 'qualified' | 'converted' | 'lost'
  updated_at: string
  created_at: string
}

export type Campaign = {
  id: string
  name: string
  message: string
  total: number
  sent: number
  failed: number
  status: 'pending' | 'running' | 'done' | 'error'
  created_at: string
}

export type CampaignLead = {
  campaign_id: string
  lead_id: string
  status: 'pending' | 'sent' | 'failed'
  error_msg: string | null
}
