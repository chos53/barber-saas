'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const menuItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Agenda', href: '/dashboard/agenda' },
  { label: 'Clientes', href: '/dashboard/clientes' },
  { label: 'Serviços', href: '/dashboard/servicos' },
  { label: 'Profissionais', href: '/dashboard/profissionais' },
  { label: 'Relatórios', href: '/dashboard/relatorios' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="flex min-h-screen bg-black text-white">
      <aside className="flex w-72 flex-col border-r border-zinc-800 bg-zinc-950 p-6">
        <div>
          <h1 className="text-2xl font-bold">
            Barber SaaS
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