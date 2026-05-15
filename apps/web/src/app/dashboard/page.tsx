'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')

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
    <main className="min-h-screen bg-black p-10 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>

          <p className="mt-2 text-zinc-400">{email}</p>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg bg-white px-4 py-2 font-bold text-black"
        >
          Sair
        </button>
      </div>
    </main>
  )
}