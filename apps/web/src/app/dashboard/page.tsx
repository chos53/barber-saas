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
  const [expectedRevenue, setExpectedRevenue] = useState(0)
  const [realizedRevenue, setRealizedRevenue] = useState(0)
  const [period, setPeriod] = useState('30')
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointment[]>([])

  useEffect(() => {
    loadDashboard()
  }, [period])

  function getStatusLabel(status: string) {
    switch (status) {
      case 'scheduled':
        return 'Agendado'
      case 'completed':
        return 'Concluído'
      case 'cancelled':
        return 'Cancelado'
      case 'no_show':
        return 'Não compareceu'
      default:
        return status
    }
  }

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

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - Number(period))

    const formattedStartDate = startDate
      .toISOString()
      .split('T')[0]

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
      .gte('appointment_date', formattedStartDate)

    const { data: revenueData } = await supabase
      .from('appointment_financial_summary')
      .select('price')
      .eq('company_id', companyId)
      .neq('status', 'cancelled')
      .gte('appointment_date', formattedStartDate)

    const { data: realizedRevenueData } = await supabase
      .from('appointment_financial_summary')
      .select('price')
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .gte('appointment_date', formattedStartDate)

    const totalRevenue =
      revenueData?.reduce(
        (sum, item) => sum + Number(item.price),
        0
      ) || 0

    const totalRealizedRevenue =
      realizedRevenueData?.reduce(
        (sum, item) => sum + Number(item.price),
        0
      ) || 0

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
    setExpectedRevenue(totalRevenue)
    setRealizedRevenue(totalRealizedRevenue)
    setTodayAppointments((todayData || []) as TodayAppointment[])
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">
            Dashboard
          </h1>

          <p className="mt-2 text-zinc-400">
            Resumo geral da empresa.
          </p>
        </div>

        <div className="flex gap-2">
          {['1', '7', '30'].map((value) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`rounded-xl px-4 py-2 transition ${
                period === value
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 hover:bg-zinc-700'
              }`}
            >
              {value === '1'
                ? 'Hoje'
                : `${value} dias`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Clientes
          </p>

          <strong className="mt-3 block text-5xl">
            {clientsCount}
          </strong>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Serviços
          </p>

          <strong className="mt-3 block text-5xl">
            {servicesCount}
          </strong>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Profissionais
          </p>

          <strong className="mt-3 block text-5xl">
            {professionalsCount}
          </strong>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Agendamentos
          </p>

          <strong className="mt-3 block text-5xl">
            {appointmentsCount}
          </strong>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Faturamento previsto
          </p>

          <strong className="mt-3 block text-5xl">
            R$ {expectedRevenue.toFixed(2)}
          </strong>
        </div>

        <div className="rounded-2xl border border-green-900 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Faturamento realizado
          </p>

          <strong className="mt-3 block text-5xl text-green-400">
            R$ {realizedRevenue.toFixed(2)}
          </strong>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            Agenda de hoje
          </h2>

          <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-400">
            {todayAppointments.length} agendamento(s)
          </span>
        </div>

        <div className="mt-6 space-y-3">
          {todayAppointments.length === 0 && (
            <p className="rounded-xl bg-zinc-800 p-4 text-zinc-500">
              Nenhum agendamento para hoje.
            </p>
          )}

          {todayAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="rounded-xl border border-zinc-800 bg-zinc-800 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold">
                    {appointment.appointment_time} —{' '}
                    {appointment.clients?.name}
                  </p>

                  <p className="mt-1 text-zinc-400">
                    {appointment.services?.name} com{' '}
                    {appointment.professionals?.name}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    appointment.status === 'completed'
                      ? 'bg-green-900 text-green-300'
                      : appointment.status === 'cancelled'
                        ? 'bg-red-900 text-red-300'
                        : appointment.status === 'no_show'
                          ? 'bg-yellow-900 text-yellow-300'
                          : 'bg-blue-900 text-blue-300'
                  }`}
                >
                  {getStatusLabel(appointment.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}