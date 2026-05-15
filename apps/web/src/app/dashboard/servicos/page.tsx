'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Service = {
  id: string
  name: string
  duration_minutes: number
  price: number
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [companyId, setCompanyId] = useState('')
  const [name, setName] = useState('')
  const [duration, setDuration] = useState('30')
  const [price, setPrice] = useState('0')

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
      .from('services')
      .select('id, name, duration_minutes, price')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    setServices(data || [])
  }

  async function createService() {
    if (!name.trim()) {
      alert('Digite o nome do serviço.')
      return
    }

    const { error } = await supabase.from('services').insert({
      company_id: companyId,
      name: name.trim(),
      duration_minutes: Number(duration),
      price: Number(price),
    })

    if (error) {
      alert(error.message)
      return
    }

    setName('')
    setDuration('30')
    setPrice('0')
    loadData()
  }

  return (
    <main className="min-h-screen bg-black p-10 text-white">
      <h1 className="text-4xl font-bold">Serviços</h1>

      <div className="mt-8 grid gap-4 rounded-2xl bg-zinc-900 p-6">
        <input
          placeholder="Nome do serviço"
          className="rounded-lg bg-zinc-800 p-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Duração em minutos"
          type="number"
          className="rounded-lg bg-zinc-800 p-3"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />

        <input
          placeholder="Preço"
          type="number"
          className="rounded-lg bg-zinc-800 p-3"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <button
          onClick={createService}
          className="rounded-lg bg-white p-3 font-bold text-black"
        >
          Cadastrar serviço
        </button>
      </div>

      <div className="mt-8 space-y-3">
        {services.map((service) => (
          <div key={service.id} className="rounded-xl bg-zinc-900 p-4">
            <p className="font-bold">{service.name}</p>
            <p className="text-zinc-400">{service.duration_minutes} minutos</p>
            <p className="text-zinc-500">R$ {service.price}</p>
          </div>
        ))}
      </div>
    </main>
  )
}