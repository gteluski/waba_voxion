'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Lead } from '@/types'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Trash2, Upload, FileText, Search, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { toast } from 'sonner'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Estados do upload de CSV
  const [parsedLeads, setParsedLeads] = useState<Array<{ name: string; phone: string }>>([])
  const [importing, setImporting] = useState(false)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data || [])
    } catch (error: any) {
      toast.error('Erro ao carregar leads.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Parse do arquivo CSV
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) return

      const lines = text.split('\n')
      const parsed: Array<{ name: string; phone: string }> = []

      // A primeira linha é o cabeçalho (name,phone)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const parts = line.split(',')
        if (parts.length >= 2) {
          const name = parts[0].trim().replace(/^["']|["']$/g, '')
          const phone = parts[1].trim().replace(/^["']|["']$/g, '')
          if (name && phone) {
            parsed.push({ name, phone })
          }
        }
      }

      setParsedLeads(parsed)
      toast.success(`${parsed.length} leads identificados! Por favor, revise a pré-visualização.`)
    }
    reader.readAsText(file)
    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = ''
  }

  // Envia leads para a API
  const handleImportLeads = async () => {
    if (parsedLeads.length === 0) return
    setImporting(true)

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: parsedLeads }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro na importação.')
      }

      if (data.errors && data.errors.length > 0) {
        // Se houveram erros parciais
        data.errors.forEach((err: string) => {
          toast.error(err, { duration: 6000 })
        })
      }

      toast.success(`${data.inserted} leads importados com sucesso!`)
      setParsedLeads([])
      fetchLeads()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao importar leads.')
      console.error(error)
    } finally {
      setImporting(false)
    }
  }

  // Deleta lead pendente
  const handleDeleteLead = async (leadId: string) => {
    try {
      const res = await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [leadId] }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao deletar lead.')
      }

      toast.success('Lead deletado com sucesso!')
      fetchLeads()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao deletar lead.')
      console.error(error)
    }
  }

  // Filtra leads com base no input de pesquisa
  const filteredLeads = leads.filter((lead) => {
    const query = searchQuery.toLowerCase()
    return lead.name.toLowerCase().includes(query) || lead.phone.includes(query)
  })

  // Paginação client-side
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage)
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getStatusBadge = (status: Lead['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Pendente</Badge>
      case 'sent':
        return <Badge variant="default" className="bg-green-500 text-white">Enviado</Badge>
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#31251f]">Gerenciar Leads</h2>
        <p className="text-sm text-gray-500">
          Importe contatos por CSV e administre a base de leads da Voxion.
        </p>
      </div>

      {/* PART 1 — Import Leads */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 border-[#d8c5b6] bg-white shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#31251f]">Importar Contatos</CardTitle>
            <CardDescription>
              Faça upload de arquivo CSV contendo os dados dos seus leads.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <div className="border-2 border-dashed border-[#d8c5b6] rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative cursor-pointer group">
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="h-10 w-10 text-[#f18535] mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold text-[#31251f]">Clique para fazer upload</p>
              <p className="text-xs text-gray-400 mt-1">Formato CSV (nome,telefone)</p>
            </div>

            <div className="p-3 bg-[#f1f1f1]/50 rounded-lg text-xs space-y-1 text-gray-600 border border-gray-100">
              <span className="font-bold text-[#31251f]">Exemplo de estrutura CSV:</span>
              <pre className="font-mono text-[10px] mt-1 bg-white p-1.5 rounded border border-gray-200">
                name,phone{'\n'}
                João Silva,11999999999{'\n'}
                Maria Souza,21988888888
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Pré-visualização do CSV */}
        <Card className="col-span-1 md:col-span-2 border-[#d8c5b6] bg-white shadow-sm flex flex-col h-full min-h-[300px]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-[#31251f]">Pré-visualização</CardTitle>
              <CardDescription>Revisão rápida dos contatos importados.</CardDescription>
            </div>
            {parsedLeads.length > 0 && (
              <button
                onClick={() => setParsedLeads([])}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Limpar seleção"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between overflow-hidden">
            {parsedLeads.length > 0 ? (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
                <div className="flex-1 overflow-y-auto max-h-[180px] border border-gray-100 rounded-lg">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="py-2 text-xs font-bold text-gray-600">Nome</TableHead>
                        <TableHead className="py-2 text-xs font-bold text-gray-600">Telefone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedLeads.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="py-2 text-xs text-[#31251f] font-semibold">
                            {item.name}
                          </TableCell>
                          <TableCell className="py-2 text-xs font-mono text-gray-500">
                            {item.phone}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end pt-4 mt-2">
                  <Button
                    onClick={handleImportLeads}
                    disabled={importing}
                    className="bg-[#f18535] text-white hover:bg-[#d8722a] transition-all font-bold px-5"
                  >
                    {importing ? 'Importando...' : `Confirmar Importação (${parsedLeads.length})`}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <FileText className="h-12 w-12 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">Nenhum arquivo de leads carregado.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PART 2 — Leads Table */}
      <Card className="border-[#d8c5b6] bg-white shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold text-[#31251f]">Base de Leads</CardTitle>
            <CardDescription>
              Filtre, pesquise ou remova leads pendentes da plataforma.
            </CardDescription>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar lead por nome/tel..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1) // Volta para a primeira página ao pesquisar
              }}
              className="pl-9 border-[#d8c5b6] focus-visible:ring-[#f18535]"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#f1f1f1]/40 border-b border-gray-100">
              <TableRow>
                <TableHead className="font-bold text-[#31251f] pl-6">Nome</TableHead>
                <TableHead className="font-bold text-[#31251f]">Telefone</TableHead>
                <TableHead className="font-bold text-[#31251f] text-center">Status</TableHead>
                <TableHead className="font-bold text-[#31251f] text-center">Cadastro</TableHead>
                <TableHead className="font-bold text-[#31251f] text-center pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#f18535] border-t-transparent mx-auto" />
                  </TableCell>
                </TableRow>
              ) : paginatedLeads.length > 0 ? (
                paginatedLeads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-bold text-sm text-[#31251f] pl-6">
                      {lead.name}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-gray-500">
                      +{lead.phone}
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(lead.status)}</TableCell>
                    <TableCell className="text-center text-xs text-gray-400">
                      {formatDate(lead.created_at)}
                    </TableCell>
                    <TableCell className="text-center pr-6">
                      {lead.status === 'pending' ? (
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="Excluir lead"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300 select-none">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-sm text-gray-400">
                    Nenhum lead encontrado na base.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-50 bg-white">
              <span className="text-xs text-gray-500">
                Página {currentPage} de {totalPages} ({filteredLeads.length} leads no total)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 border-[#d8c5b6]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 border-[#d8c5b6]"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
