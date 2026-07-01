import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendTextMessage } from '@/lib/meta'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Campaigns GET] Error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json(data || [])
  } catch (error) {
    console.error('[Campaigns GET] Error:', error)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, message, lead_ids } = body

    if (!name || !message || !lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return Response.json(
        { error: 'Nome, mensagem e pelo menos um lead são obrigatórios.' },
        { status: 400 }
      )
    }

    // 1. Insere a campanha com status "running"
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .insert({
        name,
        message,
        total: lead_ids.length,
        sent: 0,
        failed: 0,
        status: 'running',
      })
      .select()
      .single()

    if (campaignError || !campaign) {
      console.error('[Campaigns POST] Error inserting campaign:', campaignError)
      return Response.json({ error: campaignError?.message || 'Falha ao criar campanha' }, { status: 500 })
    }

    const campaignId = campaign.id

    // 2. Insere registros na tabela campaign_leads com status "pending"
    const campaignLeads = lead_ids.map((leadId: string) => ({
      campaign_id: campaignId,
      lead_id: leadId,
      status: 'pending',
    }))

    const { error: campaignLeadsError } = await supabaseAdmin
      .from('campaign_leads')
      .insert(campaignLeads)

    if (campaignLeadsError) {
      console.error('[Campaigns POST] Error inserting campaign_leads:', campaignLeadsError)
      // Atualiza o status da campanha para erro caso falhe a inserção dos leads
      await supabaseAdmin.from('campaigns').update({ status: 'error' }).eq('id', campaignId)
      return Response.json({ error: campaignLeadsError.message }, { status: 500 })
    }

    // 3. Dispara o envio das mensagens em background (Fire and Forget)
    runCampaign(campaignId, message, lead_ids)

    // 4. Retorna a campanha criada imediatamente
    return Response.json(campaign)
  } catch (error) {
    console.error('[Campaigns POST] Error:', error)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// Função executada em background para disparar as mensagens respeitando os limites de taxa
async function runCampaign(campaignId: string, message: string, leadIds: string[]) {
  try {
    for (let i = 0; i < leadIds.length; i += 5) {
      const batch = leadIds.slice(i, i + 5)

      const batchPromises = batch.map(async (leadId) => {
        try {
          // Busca os dados do lead
          const { data: lead, error: leadError } = await supabaseAdmin
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single()

          if (leadError || !lead) {
            throw new Error(leadError?.message || 'Lead não encontrado')
          }

          // Envia a mensagem do WhatsApp
          const { wamid } = await sendTextMessage(lead.phone, message)

          // Salva a mensagem no Supabase para manter o chat atualizado
          await supabaseAdmin.from('messages').insert({
            wamid,
            phone: lead.phone,
            direction: 'outbound',
            type: 'text',
            content: message,
            status: 'sent',
          })

          // Atualiza status na tabela de junção campaign_leads
          await supabaseAdmin
            .from('campaign_leads')
            .update({ status: 'sent' })
            .eq('campaign_id', campaignId)
            .eq('lead_id', leadId)

          // Atualiza o status de envio do próprio lead
          await supabaseAdmin
            .from('leads')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', leadId)

          // Incrementa as mensagens enviadas na campanha
          const { data: currentCamp } = await supabaseAdmin
            .from('campaigns')
            .select('sent')
            .eq('id', campaignId)
            .single()

          const currentSent = currentCamp?.sent || 0
          await supabaseAdmin
            .from('campaigns')
            .update({ sent: currentSent + 1 })
            .eq('id', campaignId)

        } catch (error: any) {
          console.error(`[runCampaign] Error sending message to lead ${leadId}:`, error)

          // Atualiza o status do campaign_leads para falho e registra a mensagem de erro
          await supabaseAdmin
            .from('campaign_leads')
            .update({
              status: 'failed',
              error_msg: error.message || 'Erro no disparo da Meta API',
            })
            .eq('campaign_id', campaignId)
            .eq('lead_id', leadId)

          // Atualiza status do lead para falho
          await supabaseAdmin
            .from('leads')
            .update({ status: 'failed' })
            .eq('id', leadId)

          // Incrementa as mensagens que falharam na campanha
          const { data: currentCamp } = await supabaseAdmin
            .from('campaigns')
            .select('failed')
            .eq('id', campaignId)
            .single()

          const currentFailed = currentCamp?.failed || 0
          await supabaseAdmin
            .from('campaigns')
            .update({ failed: currentFailed + 1 })
            .eq('id', campaignId)
        }
      })

      // Aguarda o término de todo o lote atual
      await Promise.all(batchPromises)

      // Se houver mais leads, aguarda 500ms antes do próximo lote (rate limit safety)
      if (i + 5 < leadIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    // Após processar todos os leads, atualiza o status final da campanha
    await supabaseAdmin
      .from('campaigns')
      .update({ status: 'done' })
      .eq('id', campaignId)

  } catch (error) {
    console.error(`[runCampaign] Fatal error executing campaign ${campaignId}:`, error)
    await supabaseAdmin
      .from('campaigns')
      .update({ status: 'error' })
      .eq('id', campaignId)
  }
}
