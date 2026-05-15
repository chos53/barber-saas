'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string
  name: string
  phone: string | null
  email: string | null
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [companyId, setCompanyId] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = '/login'
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) return

    setCompanyId(profile.company_id)

    const { data } = await supabase
      .from('clients')
      .select('id, name, phone, email')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    setClients(data || [])
  }

  async function createClient() {
    if (!name.trim()) {
      alert('Digite o nome do cliente.')
      return
    }

    const { error } = await supabase.from('clients').insert({
      company_id: companyId,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
    })

    if (error) {
      alert(error.message)
      return
    }

    setName('')
    setPhone('')
    setEmail('')
    loadData()
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <h1 className="text-4xl font-bold">Clientes</h1>

      <div className="mt-8 grid gap-4 rounded-2xl bg-zinc-900 p-6">
        <input
          placeholder="Nome"
          className="rounded-lg bg-zinc-800 p-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Telefone"
          className="rounded-lg bg-zinc-800 p-3"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          placeholder="Email"
          className="rounded-lg bg-zinc-800 p-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={createClient}
          className="rounded-lg bg-white p-3 font-bold text-black"
        >
          Cadastrar cliente
        </button>
      </div>

      <div className="mt-8 space-y-3">
        {clients.map((client) => (
          <div key={client.id} className="rounded-xl bg-zinc-900 p-4">
            <p className="font-bold">{client.name}</p>
            <p className="text-zinc-400">{client.phone}</p>
            <p className="text-zinc-500">{client.email}</p>
          </div>
        ))}
      </div>
    </main>
  )
}