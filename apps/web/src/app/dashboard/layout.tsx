'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const menuItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Agenda', href: '/dashboard/agenda' },
  { label: 'Clientes', href: '/dashboard/clientes' },
  { label: 'Serviços', href: '/dashboard/servicos' },
  { label: 'Profissionais', href: '/dashboard/profissionais' },
  { label: 'Relatórios', href: '/dashboard/relatorios' },
  { label: 'Configurações', href: '/dashboard/configuracoes' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  const [companyName, setCompanyName] =
    useState('Barber SaaS')

  useEffect(() => {
    loadCompanyName()
  }, [])

  async function loadCompanyName() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) return

    const { data: settings } = await supabase
      .from('company_settings')
      .select('company_name')
      .eq('company_id', profile.company_id)
      .single()

    if (settings?.company_name) {
      setCompanyName(settings.company_name)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="flex min-h-screen bg-black text-white">
      <aside className="flex w-72 flex-col border-r border-zinc-800 bg-zinc-950 p-6">
        <div>
          <h1 className="text-2xl font-bold">
            {companyName}
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Painel administrativo
          </p>
        </div>

        <nav className="mt-10 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-xl p-3 transition ${
                  isActive
                    ? 'bg-white font-bold text-black'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto rounded-xl bg-white p-3 font-bold text-black transition hover:bg-zinc-200"
        >
          Sair
        </button>
      </aside>

      <section className="flex-1 p-10">
        {children}
      </section>
    </main>
  )
}