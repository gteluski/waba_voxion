'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Conversation } from '@/types'
import { formatDate } from '@/lib/utils'
import { ChatWindow } from '@/components/conversas/chat-window'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageSquare, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function ConversasPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const stages: Record<string, { label: string; variant: 'secondary' | 'warning' | 'success' | 'destructive' }> = {
    new: { label: 'Novo', variant: 'secondary' },
    qualified: { label: 'Qualificado', variant: 'warning' },
    converted: { label: 'Convertido', variant: 'success' },
    lost: { label: 'Perdido', variant: 'destructive' },
  }

  // Busca inicial das conversas
  useEffect(() => {
    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching conversations:', {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
        })
      } else {
        setConversations(data || [])
      }
      setLoading(false)
    }

    fetchConversations()

    // Escuta mudanças de conversas (novas mensagens do webhook inserem/atualizam conversas)
    const channel = supabase
      .channel('realtime_conversations_page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newConv = payload.new as Conversation
            setConversations((prev) => {
              if (prev.some((c) => c.phone === newConv.phone)) return prev
              return [newConv, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updatedConv = payload.new as Conversation
            setConversations((prev) => {
              const filtered = prev.filter((c) => c.phone !== updatedConv.phone)
              const updatedList = [updatedConv, ...filtered]
              return updatedList.sort(
                (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
              )
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredConversations = conversations.filter((conv) => {
    const term = searchQuery.toLowerCase()
    return (
      (conv.name || '').toLowerCase().includes(term) ||
      conv.phone.includes(term)
    )
  })

  const selectedConv = conversations.find((c) => c.phone === selectedPhone)

  const handleLocalStageChange = (newStage: 'new' | 'qualified' | 'converted' | 'lost') => {
    setConversations((prev) =>
      prev.map((c) => (c.phone === selectedPhone ? { ...c, stage: newStage } : c))
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#31251f]">Conversas</h2>
        <p className="text-sm text-gray-500">
          Gerencie e interaja em tempo real com as conversas iniciadas pelo agente inteligente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Listagem de Conversas (1/3) */}
        <Card className="col-span-1 border-[#d8c5b6] bg-white shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <div className="p-4 border-b border-gray-100 bg-[#f1f1f1]/30 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar conversa ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-[#d8c5b6] focus-visible:ring-[#f18535]"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex h-36 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#f18535] border-t-transparent" />
              </div>
            ) : filteredConversations.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {filteredConversations.map((conv) => {
                  const isActive = conv.phone === selectedPhone
                  const stageInfo = stages[conv.stage] || { label: 'Novo', variant: 'secondary' }

                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedPhone(conv.phone)}
                      className={`w-full text-left p-4 flex flex-col space-y-1.5 transition-colors border-l-4 ${
                        isActive
                          ? 'bg-[#f18535]/5 border-[#f18535]'
                          : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#31251f] truncate">
                          {conv.name || 'Desconhecido'}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {formatDate(conv.updated_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-mono">+{conv.phone}</span>
                        <Badge
                          variant={
                            stageInfo.variant === 'warning'
                              ? 'outline'
                              : stageInfo.variant === 'success'
                              ? 'default'
                              : stageInfo.variant === 'destructive'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className={`text-[10px] font-semibold scale-90 ${
                            stageInfo.variant === 'warning'
                              ? 'border-yellow-500 text-yellow-600 bg-yellow-50'
                              : stageInfo.variant === 'success'
                              ? 'bg-green-500 text-white hover:bg-green-500'
                              : ''
                          }`}
                        >
                          {stageInfo.label}
                        </Badge>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-gray-400">
                Nenhuma conversa encontrada.
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Coluna Direita: Janela do Chat (2/3) */}
        <div className="col-span-1 lg:col-span-2">
          {selectedPhone && selectedConv ? (
            <ChatWindow
              selectedPhone={selectedPhone}
              selectedName={selectedConv.name || 'Desconhecido'}
              initialStage={selectedConv.stage}
              onStageChange={handleLocalStageChange}
            />
          ) : (
            <Card className="border-[#d8c5b6] bg-white shadow-sm h-[calc(100vh-12rem)] flex flex-col items-center justify-center text-center p-8">
              <CardContent className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f18535]/15 text-[#f18535] mx-auto animate-pulse">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-[#31251f]">Nenhuma conversa selecionada</h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Selecione um contato na barra lateral esquerda para visualizar o histórico de mensagens
                    e assumir o atendimento.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
