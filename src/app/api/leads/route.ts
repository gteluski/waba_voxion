import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { formatPhone } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let query = supabaseAdmin.from('leads').select('*')

    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('[Leads API GET] Error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json(data || [])
  } catch (error) {
    console.error('[Leads API GET] Error:', error)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rawLeads = body.leads || []
    const errors: string[] = []
    const validLeads = []

    for (const lead of rawLeads) {
      if (!lead.name || !lead.phone) {
        errors.push(`Lead inválido: nome e telefone são obrigatórios.`)
        continue
      }

      const digits = lead.phone.replace(/\D/g, '')
      if (digits.length < 10 || digits.length > 13) {
        errors.push(`Telefone inválido para ${lead.name}: deve conter entre 10 e 13 dígitos.`)
        continue
      }

      const formattedPhone = formatPhone(lead.phone)
      validLeads.push({
        name: lead.name,
        phone: formattedPhone,
        status: 'pending',
      })
    }

    let insertedCount = 0
    if (validLeads.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .upsert(validLeads, { onConflict: 'phone' })
        .select()

      if (error) {
        console.error('[Leads API POST] Supabase upsert error:', error)
        errors.push(`Erro ao salvar no banco de dados: ${error.message}`)
      } else {
        insertedCount = data?.length || 0
      }
    }

    return Response.json({ inserted: insertedCount, errors })
  } catch (error) {
    console.error('[Leads API POST] Error:', error)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const ids = body.ids || []

    if (ids.length === 0) {
      return Response.json({ deleted: 0 })
    }

    const { data, error } = await supabaseAdmin
      .from('leads')
      .delete()
      .in('id', ids)
      .eq('status', 'pending')
      .select()

    if (error) {
      console.error('[Leads API DELETE] Supabase delete error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ deleted: data?.length || 0 })
  } catch (error) {
    console.error('[Leads API DELETE] Error:', error)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
