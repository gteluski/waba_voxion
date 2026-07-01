'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message || 'Erro ao fazer login. Verifique suas credenciais.')
      } else {
        toast.success('Login realizado com sucesso!')
        router.push('/')
        router.refresh()
      }
    } catch (err: any) {
      toast.error('Erro inesperado durante o login.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f1f1f1] px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md border-[#d8c5b6] bg-white shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-[#31251f]">
            WABA <span className="text-[#f18535]">Voxion</span>
          </CardTitle>
          <CardDescription className="text-sm text-[#262626]/70">
            Plataforma de WhatsApp Oficial
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#31251f]">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-[#d8c5b6] focus-visible:ring-[#f18535]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-[#31251f]">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-[#d8c5b6] focus-visible:ring-[#f18535]"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#f18535] text-white hover:bg-[#d8722a] transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar na Plataforma'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
