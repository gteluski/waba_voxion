import { supabaseAdmin } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Send, MessageSquare, Percent, MessageCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  // 1. Busca contagem de leads
  const { count: leadsCount } = await supabaseAdmin
    .from('leads')
    .select('*', { count: 'exact', head: true })

  // 2. Busca contagem de mensagens enviadas (outbound)
  const { count: sentMessagesCount } = await supabaseAdmin
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('direction', 'outbound')
    .eq('status', 'sent')

  // 3. Busca contagem de conversas
  const { count: conversationsCount } = await supabaseAdmin
    .from('conversations')
    .select('*', { count: 'exact', head: true })

  // 4. Busca leads com status 'sent' para cálculo da taxa de resposta
  const { count: sentLeadsCount } = await supabaseAdmin
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent')

  // Cálculo da Taxa de Resposta (Conversas criadas / Leads disparados)
  const calculatedRate = sentLeadsCount && sentLeadsCount > 0
    ? Math.round(((conversationsCount || 0) / sentLeadsCount) * 100)
    : 0
  const responseRate = Math.min(calculatedRate, 100)

  // 5. Busca as últimas 5 mensagens recebidas (inbound)
  const { data: recentMessages } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(5)

  const stats = [
    {
      title: 'Total Leads',
      value: leadsCount || 0,
      icon: Users,
      description: 'Leads importados na base',
    },
    {
      title: 'Mensagens Enviadas',
      value: sentMessagesCount || 0,
      icon: Send,
      description: 'Disparos efetuados com sucesso',
    },
    {
      title: 'Conversas Ativas',
      value: conversationsCount || 0,
      icon: MessageSquare,
      description: 'Conversas iniciadas com SDR',
    },
    {
      title: 'Taxa de Resposta',
      value: `${responseRate}%`,
      icon: Percent,
      description: 'Retorno sobre mensagens enviadas',
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#31251f]">Dashboard</h2>
        <p className="text-sm text-gray-500">
          Visão geral do desempenho dos disparos e interações do agente SDR.
        </p>
      </div>

      {/* Grid de Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <Card key={i} className="border-[#d8c5b6] bg-white shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f18535]/10 text-[#f18535]">
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#31251f]">{stat.value}</div>
                <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Layout inferior: Mensagens Recentes */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <Card className="col-span-1 lg:col-span-2 border-[#d8c5b6] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#31251f] flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-[#f18535]" />
              Últimas Mensagens Recebidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentMessages && recentMessages.length > 0 ? (
              <div className="space-y-4">
                {recentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex flex-col space-y-1 p-3 rounded-lg bg-[#f1f1f1]/50 border border-gray-100 hover:bg-[#f1f1f1] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#31251f]">
                        +{msg.phone}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(msg.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{msg.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-36 flex-col items-center justify-center text-center">
                <p className="text-sm text-gray-400">Nenhuma mensagem recebida ainda.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card informativo Voxion */}
        <Card className="border-[#d8c5b6] bg-[#31251f] text-white shadow-sm flex flex-col justify-between p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#f18535]">Voxion Studio</h3>
            <p className="text-sm text-[#d8c5b6] leading-relaxed">
              Esta plataforma conecta o seu número comercial diretamente à API Oficial da Meta (Cloud API),
              eliminando intermediários e garantindo a máxima estabilidade e entrega das suas mensagens.
            </p>
            <p className="text-sm text-[#d8c5b6] leading-relaxed">
              O agente inteligente SDR qualifica os seus leads em tempo real, respondendo dúvidas e
              agendando chamadas.
            </p>
          </div>
          <div className="border-t border-[#4d3c33] pt-4 mt-6 text-xs text-[#d8c5b6]/60">
            Suporte técnico: contato@voxion.com.br
          </div>
        </Card>
      </div>
    </div>
  )
}
