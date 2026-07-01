'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/sidebar'
import { Bell } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setAuthenticated(true)
      }
      setLoading(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/login')
      } else {
        setAuthenticated(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f1f1f1]">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#f18535] border-t-transparent mx-auto" />
          <p className="text-sm font-semibold text-[#31251f]">Carregando painel...</p>
        </div>
      </div>
    )
  }

  if (!authenticated) return null

  return (
    <div className="min-h-screen bg-[#f1f1f1]">
      <Sidebar />
      <div className="pl-60">
        {/* Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#d8c5b6] bg-white px-8 shadow-sm">
          <h1 className="text-lg font-bold text-[#31251f]">Painel Administrativo</h1>
          <div className="flex items-center gap-4">
            <button className="relative rounded-full p-2 text-[#31251f]/70 hover:bg-gray-100 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[#f18535]" />
            </button>
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f18535]/15 text-sm font-semibold text-[#f18535]">
                V
              </div>
              <span className="text-sm font-medium text-gray-700">Usuário Voxion</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
