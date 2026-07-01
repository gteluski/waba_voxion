'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Message } from '@/types'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, User, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

type ChatWindowProps = {
  selectedPhone: string
  selectedName: string
  initialStage: 'new' | 'qualified' | 'converted' | 'lost'
  onStageChange?: (newStage: 'new' | 'qualified' | 'converted' | 'lost') => void
}

export function ChatWindow({ selectedPhone, selectedName, initialStage, onStageChange }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [stage, setStage] = useState(initialStage)
  const [showStageMenu, setShowStageMenu] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const stages: Array<{ value: 'new' | 'qualified' | 'converted' | 'lost'; label: string; color: string }> = [
    { value: 'new', label: 'Novo', color: 'bg-blue-500 text-white' },
    { value: 'qualified', label: 'Qualificado', color: 'bg-yellow-500 text-white' },
    { value: 'converted', label: 'Convertido', color: 'bg-green-500 text-white' },
    { value: 'lost', label: 'Perdido', color: 'bg-red-500 text-white' },
  ]

  // Atualiza o estágio local se o initialStage mudar
  useEffect(() => {
    setStage(initialStage)
  }, [initialStage])

  // Busca inicial das mensagens e inscrição no realtime
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('phone', selectedPhone)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
      } else {
        setMessages(data || [])
      }
    }

    fetchMessages()

    const channel = supabase
      .channel(`chat_messages_${selectedPhone}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `phone=eq.${selectedPhone}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id || (m.wamid && m.wamid === newMsg.wamid))) {
              return prev
            }
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedPhone])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const handleStageChange = async (newStage: 'new' | 'qualified' | 'converted' | 'lost') => {
    setStage(newStage)
    setShowStageMenu(false)

    const { error } = await supabase
      .from('conversations')
      .update({ stage: newStage })
      .eq('phone', selectedPhone)

    if (error) {
      toast.error('Erro ao atualizar estágio do lead.')
    } else {
      toast.success(`Estágio alterado para: ${newStage.toUpperCase()}`)
      if (onStageChange) onStageChange(newStage)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || sending) return

    const msg = inputText
    setInputText('')
    setSending(true)

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: selectedPhone, message: msg }),
      })

      if (!res.ok) {
        throw new Error('Falha no envio da mensagem.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar mensagem.')
      // Restaura o texto no input em caso de falha
      setInputText(msg)
    } finally {
      setSending(false)
    }
  }

  const currentStage = stages.find((s) => s.value === stage) || stages[0]

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] border border-[#d8c5b6] rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header do Chat */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#f1f1f1]/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#31251f]/15 text-[#31251f]">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#31251f]">{selectedName || 'Desconhecido'}</h3>
            <p className="text-xs text-gray-500">+{selectedPhone}</p>
          </div>
        </div>

        {/* Seletor de Estágio */}
        <div className="relative">
          <button
            onClick={() => setShowStageMenu(!showStageMenu)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${currentStage.color} shadow-sm transition-all`}
          >
            Estágio: {currentStage.label}
            <ChevronDown className="h-3 w-3" />
          </button>

          {showStageMenu && (
            <div className="absolute right-0 mt-2 w-36 rounded-lg bg-white shadow-lg border border-gray-100 z-50 overflow-hidden">
              {stages.map((st) => (
                <button
                  key={st.value}
                  onClick={() => handleStageChange(st.value)}
                  className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-gray-50 transition-colors ${
                    st.value === stage ? 'text-[#f18535] bg-[#f18535]/5' : 'text-[#31251f]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Janela de Mensagens */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f9f9f9]">
        {messages.length > 0 ? (
          messages.map((msg) => {
            const isOutbound = msg.direction === 'outbound'
            return (
              <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm text-sm ${
                    isOutbound
                      ? 'bg-[#f18535] text-white rounded-tr-none'
                      : 'bg-white border border-[#d8c5b6]/35 text-[#262626] rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <span
                    className={`block text-[10px] mt-1 text-right ${
                      isOutbound ? 'text-white/80' : 'text-gray-400'
                    }`}
                  >
                    {formatDate(msg.created_at)}
                  </span>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex h-full items-center justify-center text-center">
            <p className="text-sm text-gray-400">Nenhuma mensagem registrada. Inicie a conversa!</p>
          </div>
        )}

        {/* Indicador de Digitação (Typing Indicator) */}
        {sending && (
          <div className="flex justify-end">
            <div className="bg-[#f18535]/15 text-[#f18535] px-4 py-2.5 rounded-2xl rounded-tr-none text-xs font-medium flex items-center gap-1.5">
              <span>Enviando mensagem</span>
              <span className="flex gap-0.5">
                <span className="h-1.5 w-1.5 bg-[#f18535] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 bg-[#f18535] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 bg-[#f18535] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Caixa de Texto inferior */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 bg-white flex items-center gap-3">
        <Input
          type="text"
          placeholder="Digite sua mensagem..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={sending}
          className="flex-1 border-[#d8c5b6] focus-visible:ring-[#f18535] rounded-lg"
        />
        <Button
          type="submit"
          disabled={!inputText.trim() || sending}
          className="bg-[#f18535] text-white hover:bg-[#d8722a] transition-all px-4 py-2 rounded-lg flex items-center justify-center"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
