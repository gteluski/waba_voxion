'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Eye, EyeOff, Copy, Check, Settings, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function ConfiguracoesPage() {
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [whatsappToken, setWhatsappToken] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [agentName, setAgentName] = useState('Assistente Voxion')
  const [systemPrompt, setSystemPrompt] = useState(
    'Você é um assistente comercial da Voxion Studio, agência de marketing digital em Santo Antônio da Platina/PR. Sua função é qualificar leads interessados em marketing digital (sites, redes sociais, tráfego pago), responder dúvidas sobre os serviços e agendar uma conversa com o time comercial. Seja simpático, objetivo e profissional. Nunca invente preços. Se o lead demonstrar interesse real, peça o melhor horário para uma ligação. Responda sempre em português do Brasil.'
  )

  // Estados de exibição de senha
  const [showToken, setShowToken] = useState(false)
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)

  // Estado do botão de cópia do webhook
  const [copied, setCopied] = useState(false)

  // URL do webhook baseado no env ou padrão localhost
  const webhookUrl = `${
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }/api/webhook`

  // Carrega configurações do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('voxion_settings')
    if (saved) {
      try {
        const config = JSON.parse(saved)
        if (config.phoneNumberId) setPhoneNumberId(config.phoneNumberId)
        if (config.whatsappToken) setWhatsappToken(config.whatsappToken)
        if (config.openaiKey) setOpenaiKey(config.openaiKey)
        if (config.agentName) setAgentName(config.agentName)
        if (config.systemPrompt) setSystemPrompt(config.systemPrompt)
      } catch (e) {
        console.error('Erro ao ler configurações do localStorage:', e)
      }
    }
  }, [])

  // Salva configurações no localStorage
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()

    const config = {
      phoneNumberId,
      whatsappToken,
      openaiKey,
      agentName,
      systemPrompt,
    }

    localStorage.setItem('voxion_settings', JSON.stringify(config))
    toast.success('Configurações salvas localmente com sucesso!')
  }

  // Copia a URL do webhook para a área de transferência
  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    toast.success('URL do Webhook copiada!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#31251f]">Configurações</h2>
        <p className="text-sm text-gray-500">
          Configure as credenciais e parâmetros de inteligência do agente SDR.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* CARD 1: Meta Cloud API */}
        <Card className="border-[#d8c5b6] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#31251f] flex items-center gap-2">
              <Settings className="h-5 w-5 text-[#f18535]" />
              WhatsApp Business API (Meta)
            </CardTitle>
            <CardDescription>
              Insira as informações da sua conta Meta Developers para habilitar a comunicação oficial.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumberId" className="text-sm font-semibold text-[#31251f]">
                WhatsApp Phone Number ID
              </Label>
              <Input
                id="phoneNumberId"
                placeholder="Ex: 10459283084928"
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                className="border-[#d8c5b6] focus-visible:ring-[#f18535]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsappToken" className="text-sm font-semibold text-[#31251f]">
                WhatsApp Permanent Access Token
              </Label>
              <div className="relative">
                <Input
                  id="whatsappToken"
                  type={showToken ? 'text' : 'password'}
                  placeholder="Seu token de acesso permanente..."
                  value={whatsappToken}
                  onChange={(e) => setWhatsappToken(e.target.value)}
                  className="border-[#d8c5b6] focus-visible:ring-[#f18535] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Webhook Read-Only */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#31251f]">Webhook Callback URL</Label>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="bg-gray-50 border-[#d8c5b6] focus-visible:ring-0 text-gray-500 font-mono text-xs flex-1 select-all"
                />
                <Button
                  type="button"
                  onClick={handleCopyWebhook}
                  variant="outline"
                  className="border-[#d8c5b6] text-gray-600 hover:bg-gray-50"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                <span className="font-bold text-[#f18535]">Importante:</span> Configure essa URL no painel
                Meta Developers &gt; WhatsApp &gt; Configurações com o token de verificação{' '}
                <code className="bg-gray-100 px-1 py-0.5 rounded text-[#31251f] font-mono">
                  waba_voxion_secret
                </code>
                .
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: OpenAI & SDR Agent */}
        <Card className="border-[#d8c5b6] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#31251f]">SDR Inteligência Artificial (OpenAI)</CardTitle>
            <CardDescription>
              Ajuste as definições de comportamento e dados de acesso da IA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openaiKey" className="text-sm font-semibold text-[#31251f]">
                OpenAI API Key
              </Label>
              <div className="relative">
                <Input
                  id="openaiKey"
                  type={showOpenaiKey ? 'text' : 'password'}
                  placeholder="sk-proj-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  className="border-[#d8c5b6] focus-visible:ring-[#f18535] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agentName" className="text-sm font-semibold text-[#31251f]">
                Nome do Agente SDR
              </Label>
              <Input
                id="agentName"
                placeholder="Ex: Assistente Voxion"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="border-[#d8c5b6] focus-visible:ring-[#f18535]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="systemPrompt" className="text-sm font-semibold text-[#31251f]">
                Prompt de Sistema (System Prompt)
              </Label>
              <textarea
                id="systemPrompt"
                rows={5}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="flex min-h-[140px] w-full rounded-md border border-[#d8c5b6] bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#f18535] disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            className="bg-[#f18535] text-white hover:bg-[#d8722a] transition-all font-bold px-6 py-2.5 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Salvar Configurações
          </Button>
        </div>
      </form>
    </div>
  )
}
