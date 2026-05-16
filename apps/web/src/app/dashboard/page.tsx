'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [clientsCount, setClientsCount] = useState(0)
  const [servicesCount, setServicesCount] = useState(0)
  const [professionalsCount, setProfessionalsCount] = useState(0)
  const [appointmentsCount, setAppointmentsCount] = useState(0)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
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

    const companyId = profile.company_id

    const { count: clients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)

    const { count: services } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)

    const { count: professionals } = await supabase
      .from('professionals')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)

    const { count: appointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)

    setClientsCount(clients || 0)
    setServicesCount(services || 0)
    setProfessionalsCount(professionals || 0)
    setAppointmentsCount(appointments || 0)
  }

  return (
    <div>
      <h1 className="text-4xl font-bold">
        Dashboard
      </h1>

      <p className="mt-2 text-zinc-400">
        Resumo geral da empresa.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">Clientes</p>
          <strong className="mt-2 block text-4xl">{clientsCount}</strong>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">Serviços</p>
          <strong className="mt-2 block text-4xl">{servicesCount}</strong>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">Profissionais</p>
          <strong className="mt-2 block text-4xl">{professionalsCount}</strong>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">Agendamentos</p>
          <strong className="mt-2 block text-4xl">{appointmentsCount}</strong>
        </div>
      </div>
    </div>
  )
}