'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LayoutDashboard, Send, MessageSquare, Users, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/disparos', icon: Send, label: 'Disparos' },
    { href: '/conversas', icon: MessageSquare, label: 'Conversas' },
    { href: '/leads', icon: Users, label: 'Leads' },
    { href: '/configuracoes', icon: Settings, label: 'Configurações' },
  ]

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success('Logout realizado com sucesso!')
      router.push('/login')
      router.refresh()
    } catch (err: any) {
      toast.error('Erro ao sair da conta.')
      console.error(err)
    }
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r border-[#d8c5b6] bg-[#31251f] flex flex-col justify-between shadow-md">
      <div>
        {/* Top: Logo */}
        <div className="flex h-16 items-center px-6 border-b border-[#4d3c33] bg-[#291e19]">
          <Link href="/" className="text-xl font-bold text-white tracking-tight">
            WABA <span className="text-[#f18535]">Voxion</span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="mt-6 px-4 space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[#f18535] text-white shadow-sm shadow-[#f18535]/30'
                    : 'text-[#d8c5b6] hover:bg-[#4d3c33] hover:text-white'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive ? 'text-white' : 'text-[#d8c5b6]')} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom: Version Badge & Logout */}
      <div className="p-4 border-t border-[#4d3c33] space-y-3 bg-[#291e19]">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sair da Conta
        </button>
        <div className="flex justify-between items-center px-3">
          <span className="text-[10px] text-[#d8c5b6]/60">Voxion Studio</span>
          <span className="inline-flex items-center rounded-full bg-[#f18535]/15 px-2 py-0.5 text-[10px] font-medium text-[#f18535]">
            v1.0.0
          </span>
        </div>
      </div>
    </aside>
  )
}
