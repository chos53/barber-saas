'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type TodayAppointment = {
  id: string
  appointment_time: string
  status: string
  clients: { name: string } | null
  services: { name: string } | null
  professionals: { name: string } | null
}

export default function DashboardPage() {
  const [clientsCount, setClientsCount] = useState(0)
  const [servicesCount, setServicesCount] = useState(0)
  const [professionalsCount, setProfessionalsCount] = useState(0)
  const [appointmentsCount, setAppointmentsCount] = useState(0)
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([])

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
    const today = new Date().toISOString().split('T')[0]

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

    const { data: todayData } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_time,
        status,
        clients ( name ),
        services ( name ),
        professionals ( name )
      `)
      .eq('company_id', companyId)
      .eq('appointment_date', today)
      .order('appointment_time', { ascending: true })

    setClientsCount(clients || 0)
    setServicesCount(services || 0)
    setProfessionalsCount(professionals || 0)
    setAppointmentsCount(appointments || 0)
    setTodayAppointments((todayData || []) as TodayAppointment[])
  }

  return (
    <div>
      <h1 className="text-4xl font-bold">Dashboard</h1>

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

      <div className="mt-8 rounded-2xl bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">Agenda de hoje</h2>

        <div className="mt-4 space-y-3">
          {todayAppointments.length === 0 && (
            <p className="text-zinc-500">
              Nenhum agendamento para hoje.
            </p>
          )}

          {todayAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="rounded-xl bg-zinc-800 p-4"
            >
              <p className="font-bold">
                {appointment.appointment_time} — {appointment.clients?.name}
              </p>

              <p className="text-zinc-400">
                {appointment.services?.name} com {appointment.professionals?.name}
              </p>

              <p className="text-zinc-500">
                Status: {appointment.status}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}