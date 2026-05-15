'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/login'
        return
      }

      setEmail(user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          company_id,
          companies (
            name
          )
        `)
        .eq('id', user.id)
        .single()

      if (profile?.companies) {
        setCompanyName(profile.companies.name)
      }

      setLoading(false)
    }

    loadUser()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Carregando...
      </main>
    )
  }

  return (
    <main className="flex min-h-screen bg-black text-white">
      <aside className="flex w-72 flex-col border-r border-zinc-800 bg-zinc-950 p-6">
        <div>
          <h1 className="text-2xl font-bold">
            Barber SaaS
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            {companyName}
          </p>
        </div>

        <nav className="mt-10 space-y-2">
          <Link
            href="/dashboard"
            className="block w-full rounded-lg bg-white p-3 text-left font-semibold text-black"
          >
            Dashboard
          </Link>

          <Link
            href="/dashboard/agenda"
            className="block w-full rounded-lg p-3 text-left text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
          >
            Agenda
          </Link>

          <Link
            href="/dashboard/clientes"
            className="block w-full rounded-lg p-3 text-left text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
          >
            Clientes
          </Link>

          <Link
            href="/dashboard/servicos"
            className="block w-full rounded-lg p-3 text-left text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
          >
            Serviços
          </Link>

          <div className="w-full rounded-lg p-3 text-left text-zinc-600">
            Profissionais
          </div>
        </nav>

        <div className="mt-auto">
          <div className="mb-4 rounded-lg bg-zinc-900 p-4">
            <p className="text-sm text-zinc-400">
              {email}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full rounded-lg bg-white p-3 font-bold text-black"
          >
            Sair
          </button>
        </div>
      </aside>

      <section className="flex-1 p-10">
        <div className="rounded-2xl bg-zinc-900 p-8">
          <h2 className="text-3xl font-bold">
            Dashboard
          </h2>

          <p className="mt-2 text-zinc-400">
            Bem-vindo ao sistema.
          </p>
        </div>
      </section>
    </main>
  )
}