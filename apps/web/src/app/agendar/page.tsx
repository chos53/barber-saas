'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Service = {
  id: string
  name: string
  price: number
  duration_minutes: number
}

type Professional = {
  id: string
  name: string
  role: string | null
}

export default function PublicBookingPage() {
  const [companyId, setCompanyId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [services, setServices] = useState<Service[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])

  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('')

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: settings } = await supabase
      .from('company_settings')
      .select('company_id, company_name')
      .limit(1)
      .single()

    if (!settings?.company_id) return

    setCompanyId(settings.company_id)
    setCompanyName(settings.company_name || '')

    const { data: servicesData } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('company_id', settings.company_id)
      .eq('active', true)
      .order('name')

    const { data: professionalsData } = await supabase
      .from('professionals')
      .select('id, name, role')
      .eq('company_id', settings.company_id)
      .eq('active', true)
      .order('name')

    setServices(servicesData || [])
    setProfessionals(professionalsData || [])
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-zinc-900 p-8">
          <h1 className="text-4xl font-bold">Agendar horário</h1>

          <p className="mt-2 text-zinc-400">
            {companyName}
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-zinc-900 p-8">
          <h2 className="text-2xl font-bold">Escolha um serviço</h2>

          <div className="mt-6 space-y-3">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => setSelectedServiceId(service.id)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selectedServiceId === service.id
                    ? 'border-white bg-zinc-700'
                    : 'border-zinc-800 bg-zinc-800 hover:bg-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{service.name}</p>
                    <p className="text-sm text-zinc-400">
                      {service.duration_minutes} min
                    </p>
                  </div>

                  <strong className="text-lg">
                    R$ {Number(service.price).toFixed(2)}
                  </strong>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-zinc-900 p-8">
          <h2 className="text-2xl font-bold">Escolha um profissional</h2>

          <div className="mt-6 space-y-3">
            {professionals.map((professional) => (
              <button
                key={professional.id}
                onClick={() => setSelectedProfessionalId(professional.id)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  selectedProfessionalId === professional.id
                    ? 'border-white bg-zinc-700'
                    : 'border-zinc-800 bg-zinc-800 hover:bg-zinc-700'
                }`}
              >
                <p className="font-bold">{professional.name}</p>
                <p className="text-sm text-zinc-400">{professional.role}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl bg-zinc-900 p-8">
          <h2 className="text-2xl font-bold">Seus dados</h2>

          <input
            type="date"
            className="rounded-lg bg-zinc-800 p-3"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <input
            type="time"
            className="rounded-lg bg-zinc-800 p-3"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />

          <input
            placeholder="Seu nome"
            className="rounded-lg bg-zinc-800 p-3"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />

          <input
            placeholder="Seu telefone"
            className="rounded-lg bg-zinc-800 p-3"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
          />

          <button
            className="rounded-lg bg-white p-3 font-bold text-black"
          >
            Confirmar agendamento
          </button>
        </div>
      </div>
    </main>
  )
}