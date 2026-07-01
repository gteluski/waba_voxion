'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Campaign, Lead } from '@/types'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

export default function DisparosPage() {
  // Estados para Criação
  const [campaignName, setCampaignName] = useState('')
  const [messageText, setMessageText] = useState('')
  const [pendingLeads, setPendingLeads] = useState<Lead[]>([])
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingLeads, setLoadingLeads] = useState(true)

  // Estados para Histórico
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)

  // Polling ref para evitar re-inscrições em loop
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Busca inicial de dados
  useEffect(() => {
    fetchPendingLeads()
    fetchCampaigns()

    return () => {
      stopPolling()
    }
  }, [])

  // Inicia ou para o Polling com base na presença de campanhas rodando (status === 'running')
  useEffect(() => {
    const hasRunningCampaign = campaigns.some((c) => c.status === 'running')

    if (hasRunningCampaign) {
      startPolling()
    } else {
      stopPolling()
    }

    return () => stopPolling()
  }, [campaigns])

  const fetchPendingLeads = async () => {
    setLoadingLeads(true)
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPendingLeads(data || [])
    } catch (error: any) {
      toast.error('Erro ao carregar leads pendentes.')
      console.error(error)
    } finally {
      setLoadingLeads(false)
    }
  }

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCampaigns(data || [])
    } catch (error: any) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoadingCampaigns(false)
    }
  }

  const startPolling = () => {
    if (pollingIntervalRef.current) return
    pollingIntervalRef.current = setInterval(() => {
      fetchCampaigns()
    }, 5000)
  }

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }

  // Ações de seleção de checkboxes
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeadIds(pendingLeads.map((lead) => lead.id))
    } else {
      setSelectedLeadIds([])
    }
  }

  const handleSelectOne = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeadIds((prev) => [...prev, leadId])
    } else {
      setSelectedLeadIds((prev) => prev.filter((id) => id !== leadId))
    }
  }

  // Criação da Campanha
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!campaignName.trim()) {
      toast.error('Informe o nome da campanha.')
      return
    }
    if (!messageText.trim()) {
      toast.error('Escreva a mensagem a ser disparada.')
      return
    }
    if (selectedLeadIds.length === 0) {
      toast.error('Selecione pelo menos um lead.')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          message: messageText,
          lead_ids: selectedLeadIds,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao criar campanha.')
      }

      toast.success(`Campanha "${campaignName}" iniciada com sucesso!`)

      // Reset form
      setCampaignName('')
      setMessageText('')
      setSelectedLeadIds([])

      // Recarrega os dados
      await fetchPendingLeads()
      await fetchCampaigns()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao disparar campanha.')
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: Campaign['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Pendente</Badge>
      case 'running':
        return (
          <Badge variant="default" className="bg-blue-500 text-white animate-pulse">
            Executando
          </Badge>
        )
      case 'done':
        return <Badge variant="default" className="bg-green-500 text-white">Concluído</Badge>
      case 'error':
        return <Badge variant="destructive">Falhou</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#31251f]">Disparar Mensagens</h2>
        <p className="text-sm text-gray-500">
          Crie campanhas de disparos em massa para leads pendentes de contato.
        </p>
      </div>

      {/* SECTION 1 — Create Campaign */}
      <Card className="border-[#d8c5b6] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#31251f]">Nova Campanha</CardTitle>
          <CardDescription>
            Defina o nome da campanha, a mensagem e selecione os leads que receberão o disparo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateCampaign} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lado Esquerdo: Formulário */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaignName" className="text-sm font-semibold text-[#31251f]">
                    Nome da Campanha
                  </Label>
                  <Input
                    id="campaignName"
                    placeholder="Ex: Campanha de Tráfego Pago - Julho"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="border-[#d8c5b6] focus-visible:ring-[#f18535]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="messageText" className="text-sm font-semibold text-[#31251f]">
                      Mensagem
                    </Label>
                    <span className="text-xs text-gray-400">
                      {messageText.length}/1000 caracteres
                    </span>
                  </div>
                  <textarea
                    id="messageText"
                    rows={6}
                    maxLength={1000}
                    placeholder="Olá! Sou o assistente da Voxion Studio. Vi que você demonstrou interesse em..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex min-h-[140px] w-full rounded-md border border-[#d8c5b6] bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#f18535] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Lado Direito: Seletor de Leads */}
              <div className="space-y-2 flex flex-col h-[280px]">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-[#31251f]">
                    Selecionar Leads{' '}
                    <Badge variant="secondary" className="bg-[#f18535]/15 text-[#f18535] ml-2">
                      {selectedLeadIds.length} selecionado(s)
                    </Badge>
                  </Label>
                </div>

                <div className="border border-[#d8c5b6] rounded-lg overflow-hidden flex-1 flex flex-col">
                  {/* Cabeçalho da Mini Tabela */}
                  <div className="flex bg-[#f1f1f1]/40 border-b border-gray-100 p-2 text-xs font-bold text-[#31251f]">
                    <div className="w-10 flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={
                          pendingLeads.length > 0 && selectedLeadIds.length === pendingLeads.length
                        }
                        onChange={handleSelectAll}
                        disabled={pendingLeads.length === 0}
                        className="rounded border-[#d8c5b6] text-[#f18535] focus:ring-[#f18535]"
                      />
                    </div>
                    <div className="flex-1">Nome</div>
                    <div className="w-32">Telefone</div>
                  </div>

                  <ScrollArea className="flex-1">
                    {loadingLeads ? (
                      <div className="flex h-36 items-center justify-center">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#f18535] border-t-transparent" />
                      </div>
                    ) : pendingLeads.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {pendingLeads.map((lead) => (
                          <div key={lead.id} className="flex p-2 text-xs items-center hover:bg-gray-50">
                            <div className="w-10 flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={selectedLeadIds.includes(lead.id)}
                                onChange={(e) => handleSelectOne(lead.id, e.target.checked)}
                                className="rounded border-[#d8c5b6] text-[#f18535] focus:ring-[#f18535]"
                              />
                            </div>
                            <div className="flex-1 font-semibold truncate text-[#31251f]">
                              {lead.name}
                            </div>
                            <div className="w-32 font-mono text-gray-500">+{lead.phone}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-gray-400">
                        Nenhum lead pendente encontrado. Importe mais leads primeiro.
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submitting || selectedLeadIds.length === 0 || !messageText.trim()}
                className="bg-[#f18535] text-white hover:bg-[#d8722a] transition-all px-6 py-2.5 font-bold"
              >
                {submitting ? 'Iniciando Disparos...' : 'Disparar Campanha'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* SECTION 2 — Campaign History */}
      <Card className="border-[#d8c5b6] bg-white shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#31251f]">Histórico de Campanhas</CardTitle>
          <CardDescription>
            Lista de campanhas enviadas. As campanhas ativas atualizam a tabela automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#f1f1f1]/40 border-b border-gray-100">
              <TableRow>
                <TableHead className="font-bold text-[#31251f] pl-6">Nome</TableHead>
                <TableHead className="font-bold text-[#31251f]">Mensagem</TableHead>
                <TableHead className="font-bold text-[#31251f] text-center">Total</TableHead>
                <TableHead className="font-bold text-[#31251f] text-center text-green-600">
                  Enviados
                </TableHead>
                <TableHead className="font-bold text-[#31251f] text-center text-red-500">
                  Falhos
                </TableHead>
                <TableHead className="font-bold text-[#31251f] text-center">Status</TableHead>
                <TableHead className="font-bold text-[#31251f] pr-6">Data de Criação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingCampaigns ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#f18535] border-t-transparent mx-auto" />
                  </TableCell>
                </TableRow>
              ) : campaigns.length > 0 ? (
                campaigns.map((camp) => (
                  <TableRow key={camp.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-bold text-sm text-[#31251f] pl-6">
                      {camp.name}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 max-w-[200px] truncate">
                      {camp.message}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-sm">{camp.total}</TableCell>
                    <TableCell className="text-center font-bold text-sm text-green-600">
                      {camp.sent}
                    </TableCell>
                    <TableCell className="text-center font-bold text-sm text-red-500">
                      {camp.failed}
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(camp.status)}</TableCell>
                    <TableCell className="text-xs text-gray-400 pr-6">
                      {formatDate(camp.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                    Nenhuma campanha registrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
