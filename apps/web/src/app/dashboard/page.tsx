'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Appointment = {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  clients: { name: string } | null
  services: { name: string } | null
  professionals: { name: string } | null
}

type FinancialTransaction = {
  id: string
  type: string
  amount: number
  status: string | null
  transaction_date: string
}

type DashboardStats = {
  todayAppointments: number
  scheduledAppointments: number
  completedAppointments: number
  clientsCount: number
  activeProfessionals: number
  activeServices: number
  todayIncome: number
  todayExpenses: number
  monthIncome: number
  monthExpenses: number
}

export default function DashboardPage() {
  const [companyId, setCompanyId] = useState('')
  const [companyName, setCompanyName] = useState('Barber SaaS')
  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState('')
  const [monthStartDate, setMonthStartDate] = useState('')
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    scheduledAppointments: 0,
    completedAppointments: 0,
    clientsCount: 0,
    activeProfessionals: 0,
    activeServices: 0,
    todayIncome: 0,
    todayExpenses: 0,
    monthIncome: 0,
    monthExpenses: 0,
  })
  const [upcomingAppointments, setUpcomingAppointments] = useState<
    Appointment[]
  >([])

  useEffect(() => {
    const now = new Date()
    const currentDate = formatDate(now)
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    setToday(currentDate)
    setMonthStartDate(formatDate(firstDayOfMonth))
    loadDashboard(currentDate, formatDate(firstDayOfMonth))
  }, [])

  function formatDate(date: Date) {
    return date.toISOString().split('T')[0]
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  async function loadDashboard(currentDate: string, firstDayOfMonth: string) {
    setLoading(true)

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

    if (!profile?.company_id) {
      setLoading(false)
      return
    }

    setCompanyId(profile.company_id)

    const { data: settings } = await supabase
      .from('company_settings')
      .select('company_name')
      .eq('company_id', profile.company_id)
      .maybeSingle()

    if (settings?.company_name) {
      setCompanyName(settings.company_name)
    }

    const [
      todayAppointmentsResult,
      clientsResult,
      professionalsResult,
      servicesResult,
      todayTransactionsResult,
      monthTransactionsResult,
      upcomingAppointmentsResult,
    ] = await Promise.all([
      supabase
        .from('appointments')
        .select('id, status', { count: 'exact' })
        .eq('company_id', profile.company_id)
        .eq('appointment_date', currentDate),

      supabase
        .from('clients')
        .select('id', { count: 'exact' })
        .eq('company_id', profile.company_id)
        .eq('active', true),

      supabase
        .from('professionals')
        .select('id', { count: 'exact' })
        .eq('company_id', profile.company_id)
        .eq('active', true),

      supabase
        .from('services')
        .select('id', { count: 'exact' })
        .eq('company_id', profile.company_id)
        .eq('active', true),

      supabase
        .from('financial_transactions')
        .select('id, type, amount, status, transaction_date')
        .eq('company_id', profile.company_id)
        .eq('transaction_date', currentDate),

      supabase
        .from('financial_transactions')
        .select('id, type, amount, status, transaction_date')
        .eq('company_id', profile.company_id)
        .gte('transaction_date', firstDayOfMonth)
        .lte('transaction_date', currentDate),

      supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          clients ( name ),
          services ( name ),
          professionals ( name )
        `)
        .eq('company_id', profile.company_id)
        .gte('appointment_date', currentDate)
        .neq('status', 'cancelled')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })
        .limit(8),
    ])

    const todayAppointments = todayAppointmentsResult.data || []
    const todayTransactions =
      (todayTransactionsResult.data || []) as FinancialTransaction[]
    const monthTransactions =
      (monthTransactionsResult.data || []) as FinancialTransaction[]

    const todayIncome = todayTransactions
      .filter(
        (transaction) =>
          transaction.type === 'income' && transaction.status !== 'cancelled'
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)

    const todayExpenses = todayTransactions
      .filter(
        (transaction) =>
          transaction.type === 'expense' && transaction.status !== 'cancelled'
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)

    const monthIncome = monthTransactions
      .filter(
        (transaction) =>
          transaction.type === 'income' && transaction.status !== 'cancelled'
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)

    const monthExpenses = monthTransactions
      .filter(
        (transaction) =>
          transaction.type === 'expense' && transaction.status !== 'cancelled'
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)

    setStats({
      todayAppointments: todayAppointmentsResult.count || 0,
      scheduledAppointments: todayAppointments.filter(
        (appointment) => appointment.status === 'scheduled'
      ).length,
      completedAppointments: todayAppointments.filter(
        (appointment) => appointment.status === 'completed'
      ).length,
      clientsCount: clientsResult.count || 0,
      activeProfessionals: professionalsResult.count || 0,
      activeServices: servicesResult.count || 0,
      todayIncome,
      todayExpenses,
      monthIncome,
      monthExpenses,
    })

    setUpcomingAppointments(
      (upcomingAppointmentsResult.data || []) as Appointment[]
    )

    setLoading(false)
  }

  const monthBalance = useMemo(() => {
    return stats.monthIncome - stats.monthExpenses
  }, [stats.monthIncome, stats.monthExpenses])

  const todayBalance = useMemo(() => {
    return stats.todayIncome - stats.todayExpenses
  }, [stats.todayIncome, stats.todayExpenses])

  const shortcuts = [
    {
      label: 'Abrir Agenda',
      href: '/dashboard/agenda',
      description: 'Criar, concluir e reagendar atendimentos.',
    },
    {
      label: 'Clientes',
      href: '/dashboard/clientes',
      description: 'Cadastrar e consultar clientes.',
    },
    {
      label: 'Serviços',
      href: '/dashboard/servicos',
      description: 'Gerenciar preços e duração dos serviços.',
    },
    {
      label: 'Profissionais',
      href: '/dashboard/profissionais',
      description: 'Disponibilidade, comissão e permissões.',
    },
    {
      label: 'Financeiro',
      href: '/dashboard/financeiro',
      description: 'Entradas, despesas e caixa.',
    },
    {
      label: 'Relatórios',
      href: '/dashboard/relatorios',
      description: 'Análises e desempenho do salão.',
    },
  ]

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-8 py-6">
          <p className="text-zinc-400">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
            Painel do proprietário
          </p>

          <h1 className="mt-2 text-4xl font-bold">{companyName}</h1>

          <p className="mt-2 text-zinc-400">
            Resumo operacional e financeiro do seu negócio.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadDashboard(today, monthStartDate)}
          className="rounded-xl bg-white px-5 py-3 font-bold text-black transition hover:bg-zinc-200"
        >
          Atualizar
        </button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Faturamento hoje</p>
          <p className="mt-3 text-3xl font-bold text-green-300">
            {formatCurrency(stats.todayIncome)}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Saldo: {formatCurrency(todayBalance)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Agendamentos hoje</p>
          <p className="mt-3 text-3xl font-bold">
            {stats.todayAppointments}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            {stats.scheduledAppointments} agendado(s) ·{' '}
            {stats.completedAppointments} concluído(s)
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Clientes ativos</p>
          <p className="mt-3 text-3xl font-bold text-blue-300">
            {stats.clientsCount}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Base cadastrada no sistema.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Profissionais ativos</p>
          <p className="mt-3 text-3xl font-bold text-purple-300">
            {stats.activeProfessionals}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            {stats.activeServices} serviço(s) ativo(s).
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Faturamento do mês</p>
          <p className="mt-3 text-3xl font-bold text-green-300">
            {formatCurrency(stats.monthIncome)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Despesas do mês</p>
          <p className="mt-3 text-3xl font-bold text-red-300">
            {formatCurrency(stats.monthExpenses)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Lucro do mês</p>
          <p
            className={`mt-3 text-3xl font-bold ${
              monthBalance >= 0 ? 'text-blue-300' : 'text-red-300'
            }`}
          >
            {formatCurrency(monthBalance)}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Próximos agendamentos</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Atendimentos futuros e do dia.
              </p>
            </div>

            <Link
              href="/dashboard/agenda"
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-black"
            >
              Ver agenda
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {upcomingAppointments.length === 0 && (
              <p className="rounded-xl bg-zinc-950 p-4 text-zinc-500">
                Nenhum agendamento futuro encontrado.
              </p>
            )}

            {upcomingAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <p className="font-bold">
                      {appointment.clients?.name || 'Cliente não informado'}
                    </p>

                    <p className="mt-1 text-sm text-zinc-400">
                      {appointment.services?.name || 'Serviço'} ·{' '}
                      {appointment.professionals?.name || 'Profissional'}
                    </p>
                  </div>

                  <div className="text-sm text-zinc-400 md:text-right">
                    <p>{appointment.appointment_date}</p>
                    <p className="font-bold text-white">
                      {appointment.appointment_time.slice(0, 5)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">Atalhos rápidos</h2>

          <div className="mt-5 grid gap-3">
            {shortcuts.map((shortcut) => (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-white"
              >
                <p className="font-bold">{shortcut.label}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {shortcut.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
