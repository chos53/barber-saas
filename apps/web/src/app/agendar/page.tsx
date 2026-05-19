'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Service = {
  id: string
  name: string
  price: number
  duration_minutes: number
}

export default function PublicBookingPage() {
  const [companyName, setCompanyName] = useState('')
  const [services, setServices] = useState<Service[]>([])

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

    setCompanyName(settings.company_name || '')

    const { data: servicesData } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('company_id', settings.company_id)
      .eq('active', true)
      .order('name')

    setServices(servicesData || [])
  }

  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-zinc-900 p-8">
          <h1 className="text-4xl font-bold">
            Agendar horário
          </h1>

          <p className="mt-2 text-zinc-400">
            {companyName}
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-zinc-900 p-8">
          <h2 className="text-2xl font-bold">
            Escolha um serviço
          </h2>

          <div className="mt-6 space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="rounded-xl border border-zinc-800 bg-zinc-800 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">
                      {service.name}
                    </p>

                    <p className="text-sm text-zinc-400">
                      {service.duration_minutes} min
                    </p>
                  </div>

                  <strong className="text-lg">
                    R$ {Number(service.price).toFixed(2)}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
} 