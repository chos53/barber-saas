'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="flex min-h-screen bg-black text-white">
      <aside className="flex w-72 flex-col border-r border-zinc-800 bg-zinc-950 p-6">
        <div>
          <h1 className="text-2xl font-bold">Barber SaaS</h1>
          <p className="mt-1 text-sm text-zinc-500">Painel</p>
        </div>

        <nav className="mt-10 space-y-2">
          <Link href="/dashboard" className="block rounded-lg p-3 text-zinc-400 hover:bg-zinc-900 hover:text-white">
            Dashboard
          </Link>

          <Link href="/dashboard/agenda" className="block rounded-lg p-3 text-zinc-400 hover:bg-zinc-900 hover:text-white">
            Agenda
          </Link>

          <Link href="/dashboard/clientes" className="block rounded-lg p-3 text-zinc-400 hover:bg-zinc-900 hover:text-white">
            Clientes
          </Link>

          <Link href="/dashboard/servicos" className="block rounded-lg p-3 text-zinc-400 hover:bg-zinc-900 hover:text-white">
            Serviços
          </Link>

          <Link href="/dashboard/profissionais" className="block rounded-lg p-3 text-zinc-400 hover:bg-zinc-900 hover:text-white">
            Profissionais
          </Link>
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto rounded-lg bg-white p-3 font-bold text-black"
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