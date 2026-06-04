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

type Client = {
  id: string
  name: string
  phone: string | null
  birth_date: string | null
  active: boolean
  created_at: string
}

type Comanda = {
  id: string
  client_id: string | null
  status: string
  total: number
  discount?: number | null
  discount_type?: 'amount' | 'percentage' | null
  discount_value?: number | null
  surcharge?: number | null
  surcharge_type?: 'amount' | 'percentage' | null
  surcharge_value?: number | null
  created_at: string
  closed_at?: string | null
}

type ComandaItem = {
  id: string
  comanda_id: string
  description?: string | null
  quantity: number
  price: number
  product_id?: string | null
  professional_id?: string | null
}

type LoyaltyRedemption = {
  id: string
  client_id: string
  reward_description: string
  created_at: string
}

type Professional = {
  id: string
  name: string
}

type RankingItem = {
  id: string
  name: string
  quantity: number
  revenue: number
}

type CommercialStats = {
  averageTicket: number
  birthdayClientsThisMonth: number
  birthdayClientsToday: number
  recoveredClients: number
  loyaltyRedemptionsThisMonth: number
  newClientsThisMonth: number
  clientsWithoutBirthday: number
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
  const [commercialStats, setCommercialStats] = useState<CommercialStats>({
    averageTicket: 0,
    birthdayClientsThisMonth: 0,
    birthdayClientsToday: 0,
    recoveredClients: 0,
    loyaltyRedemptionsThisMonth: 0,
    newClientsThisMonth: 0,
    clientsWithoutBirthday: 0,
  })
  const [topServices, setTopServices] = useState<RankingItem[]>([])
  const [topProducts, setTopProducts] = useState<RankingItem[]>([])
  const [topProfessionals, setTopProfessionals] = useState<RankingItem[]>([])

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

  function getComandaFinalTotal(comanda: Comanda, items: ComandaItem[]) {
    const itemsTotal = items.reduce((sum, item) => {
      return sum + Number(item.price || 0) * Number(item.quantity || 0)
    }, 0)

    const subtotal = itemsTotal > 0 ? itemsTotal : Number(comanda.total || 0)
    const discountValue = Number(comanda.discount_value ?? comanda.discount ?? 0)
    const discountType =
      comanda.discount_type === 'percentage' ? 'percentage' : 'amount'
    const discount =
      discountType === 'percentage'
        ? Math.min((subtotal * discountValue) / 100, subtotal)
        : Math.min(discountValue, subtotal)

    const surchargeValue = Number(comanda.surcharge_value ?? comanda.surcharge ?? 0)
    const surchargeType =
      comanda.surcharge_type === 'percentage' ? 'percentage' : 'amount'
    const surcharge =
      surchargeType === 'percentage'
        ? (subtotal * surchargeValue) / 100
        : surchargeValue

    return Math.max(Number((subtotal - discount + surcharge).toFixed(2)), 0)
  }

  function isClientRecoveredThisMonth(
    clientId: string,
    clientComandas: Comanda[],
    firstDayOfMonth: string,
    currentDate: string
  ) {
    const closedComandas = clientComandas
      .filter((comanda) => comanda.client_id === clientId)
      .sort((a, b) => {
        return (
          new Date(a.closed_at || a.created_at).getTime() -
          new Date(b.closed_at || b.created_at).getTime()
        )
      })

    if (closedComandas.length < 2) return false

    const visitsThisMonth = closedComandas.filter((comanda) => {
      const visitDate = comanda.closed_at || comanda.created_at

      return visitDate >= firstDayOfMonth && visitDate <= currentDate
    })

    if (visitsThisMonth.length === 0) return false

    const firstVisitThisMonth = visitsThisMonth[0]
    const firstVisitDate = new Date(
      firstVisitThisMonth.closed_at || firstVisitThisMonth.created_at
    )

    const previousVisits = closedComandas.filter((comanda) => {
      const visitDate = new Date(comanda.closed_at || comanda.created_at)

      return visitDate.getTime() < firstVisitDate.getTime()
    })

    if (previousVisits.length === 0) return false

    const lastPreviousVisit = previousVisits[previousVisits.length - 1]
    const lastPreviousVisitDate = new Date(
      lastPreviousVisit.closed_at || lastPreviousVisit.created_at
    )

    const diffDays = Math.floor(
      (firstVisitDate.getTime() - lastPreviousVisitDate.getTime()) /
        1000 /
        60 /
        60 /
        24
    )

    return diffDays >= 60
  }

  function renderRankingCard(
    title: string,
    description: string,
    items: RankingItem[],
    emptyMessage: string
  ) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          </div>

          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300">
            Top {items.length}
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {items.length === 0 && (
            <p className="rounded-xl bg-zinc-950 p-4 text-sm text-zinc-500">
              {emptyMessage}
            </p>
          )}

          {items.map((item, index) => (
            <div
              key={item.id}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-black">
                      #{index + 1}
                    </span>

                    <strong className="text-white">{item.name}</strong>
                  </div>

                  <p className="mt-2 text-sm text-zinc-500">
                    Quantidade: {item.quantity.toLocaleString('pt-BR')}
                  </p>
                </div>

                <strong className="text-lg text-green-400">
                  {formatCurrency(item.revenue)}
                </strong>
              </div>
            </div>
          ))}
        </div>
      </section>
    )
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
      clientsCommercialResult,
      closedComandasResult,
      monthLoyaltyRedemptionsResult,
      professionalsRankingResult,
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

      supabase
        .from('clients')
        .select('id, name, phone, birth_date, active, created_at')
        .eq('company_id', profile.company_id),

      supabase
        .from('comandas')
        .select(
          'id, client_id, status, total, discount, discount_type, discount_value, surcharge, surcharge_type, surcharge_value, created_at, closed_at'
        )
        .eq('company_id', profile.company_id)
        .eq('status', 'closed')
        .lte('closed_at', currentDate + 'T23:59:59.999Z'),

      supabase
        .from('loyalty_redemptions')
        .select('id, client_id, reward_description, created_at')
        .eq('company_id', profile.company_id)
        .gte('created_at', firstDayOfMonth + 'T00:00:00.000Z')
        .lte('created_at', currentDate + 'T23:59:59.999Z'),

      supabase
        .from('professionals')
        .select('id, name')
        .eq('company_id', profile.company_id),
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

    const commercialClients = (clientsCommercialResult.data || []) as Client[]
    const allClosedComandas = (closedComandasResult.data || []) as Comanda[]
    const monthLoyaltyRedemptions =
      (monthLoyaltyRedemptionsResult.data || []) as LoyaltyRedemption[]

    const closedComandaIds = allClosedComandas.map((comanda) => comanda.id)

    const { data: comandaItemsData } =
      closedComandaIds.length > 0
        ? await supabase
            .from('comanda_items')
            .select('id, comanda_id, description, quantity, price, product_id, professional_id')
            .in('comanda_id', closedComandaIds)
        : { data: [] }

    const itemsByComanda = new Map<string, ComandaItem[]>()

    ;((comandaItemsData || []) as ComandaItem[]).forEach((item) => {
      const currentItems = itemsByComanda.get(item.comanda_id) || []

      currentItems.push({
        id: item.id,
        comanda_id: item.comanda_id,
        description: item.description || 'Item sem descrição',
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        product_id: item.product_id || null,
        professional_id: item.professional_id || null,
      })

      itemsByComanda.set(item.comanda_id, currentItems)
    })

    const monthClosedComandas = allClosedComandas.filter((comanda) => {
      const closedDate = comanda.closed_at || comanda.created_at

      return closedDate >= firstDayOfMonth && closedDate <= currentDate + 'T23:59:59.999Z'
    })

    const monthComandaRevenue = monthClosedComandas.reduce((sum, comanda) => {
      return sum + getComandaFinalTotal(comanda, itemsByComanda.get(comanda.id) || [])
    }, 0)

    const averageTicket =
      monthClosedComandas.length > 0
        ? monthComandaRevenue / monthClosedComandas.length
        : 0

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentDay = now.getDate()

    const birthdayClientsThisMonth = commercialClients.filter((client) => {
      if (!client.birth_date) return false

      const [, month] = client.birth_date.split('-').map(Number)

      return month === currentMonth
    }).length

    const birthdayClientsToday = commercialClients.filter((client) => {
      if (!client.birth_date) return false

      const [, month, day] = client.birth_date.split('-').map(Number)

      return month === currentMonth && day === currentDay
    }).length

    const clientsWithoutBirthday = commercialClients.filter((client) => {
      return !client.birth_date
    }).length

    const newClientsThisMonth = commercialClients.filter((client) => {
      return client.created_at >= firstDayOfMonth && client.created_at <= currentDate + 'T23:59:59.999Z'
    }).length

    const recoveredClients = commercialClients.filter((client) => {
      return isClientRecoveredThisMonth(
        client.id,
        allClosedComandas,
        firstDayOfMonth,
        currentDate + 'T23:59:59.999Z'
      )
    }).length

    const professionalsMap = new Map(
      ((professionalsRankingResult.data || []) as Professional[]).map((professional) => [
        professional.id,
        professional.name,
      ])
    )

    const serviceRankingMap = new Map<string, RankingItem>()
    const productRankingMap = new Map<string, RankingItem>()
    const professionalRankingMap = new Map<string, RankingItem>()

    monthClosedComandas.forEach((comanda) => {
      const items = itemsByComanda.get(comanda.id) || []

      items.forEach((item) => {
        const quantity = Number(item.quantity || 0)
        const revenue = Number(item.price || 0) * quantity
        const itemName = item.description || 'Item sem descrição'

        if (item.product_id) {
          const currentProduct = productRankingMap.get(item.product_id) || {
            id: item.product_id,
            name: itemName,
            quantity: 0,
            revenue: 0,
          }

          currentProduct.quantity += quantity
          currentProduct.revenue += revenue
          productRankingMap.set(item.product_id, currentProduct)
          return
        }

        const serviceKey = itemName.toLowerCase().trim()
        const currentService = serviceRankingMap.get(serviceKey) || {
          id: serviceKey,
          name: itemName,
          quantity: 0,
          revenue: 0,
        }

        currentService.quantity += quantity
        currentService.revenue += revenue
        serviceRankingMap.set(serviceKey, currentService)

        if (item.professional_id) {
          const professionalName =
            professionalsMap.get(item.professional_id) || 'Profissional não informado'
          const currentProfessional = professionalRankingMap.get(item.professional_id) || {
            id: item.professional_id,
            name: professionalName,
            quantity: 0,
            revenue: 0,
          }

          currentProfessional.quantity += quantity
          currentProfessional.revenue += revenue
          professionalRankingMap.set(item.professional_id, currentProfessional)
        }
      })
    })

    setTopServices(
      Array.from(serviceRankingMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
    )

    setTopProducts(
      Array.from(productRankingMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
    )

    setTopProfessionals(
      Array.from(professionalRankingMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
    )

    setCommercialStats({
      averageTicket,
      birthdayClientsThisMonth,
      birthdayClientsToday,
      recoveredClients,
      loyaltyRedemptionsThisMonth: monthLoyaltyRedemptions.length,
      newClientsThisMonth,
      clientsWithoutBirthday,
    })

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
            Resumo operacional, financeiro e comercial do seu negócio.
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


      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Indicadores Comerciais</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Visão rápida de relacionamento, fidelidade e retorno de clientes no mês.
            </p>
          </div>

          <Link
            href="/dashboard/clientes"
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-black"
          >
            Ver clientes
          </Link>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-purple-900 bg-purple-950/30 p-5">
            <p className="text-sm text-purple-300">Ticket médio geral</p>
            <p className="mt-3 break-words text-3xl font-bold text-white">
              {formatCurrency(commercialStats.averageTicket)}
            </p>
            <p className="mt-2 text-sm text-purple-100">
              Base: comandas fechadas do mês.
            </p>
          </div>

          <div className="rounded-2xl border border-pink-900 bg-pink-950/30 p-5">
            <p className="text-sm text-pink-300">Aniversariantes do mês</p>
            <p className="mt-3 text-3xl font-bold text-white">
              {commercialStats.birthdayClientsThisMonth}
            </p>
            <p className="mt-2 text-sm text-pink-100">
              {commercialStats.birthdayClientsToday} aniversariante(s) hoje.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-900 bg-orange-950/30 p-5">
            <p className="text-sm text-orange-300">Clientes recuperados</p>
            <p className="mt-3 text-3xl font-bold text-white">
              {commercialStats.recoveredClients}
            </p>
            <p className="mt-2 text-sm text-orange-100">
              Voltaram após 60+ dias sem visita.
            </p>
          </div>

          <div className="rounded-2xl border border-green-900 bg-green-950/30 p-5">
            <p className="text-sm text-green-300">Recompensas resgatadas</p>
            <p className="mt-3 text-3xl font-bold text-white">
              {commercialStats.loyaltyRedemptionsThisMonth}
            </p>
            <p className="mt-2 text-sm text-green-100">
              {commercialStats.newClientsThisMonth} novo(s) cliente(s) no mês.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-sm text-zinc-500">Clientes sem nascimento</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {commercialStats.clientsWithoutBirthday}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Complete o cadastro para campanhas de aniversário.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-sm text-zinc-500">Novos clientes no mês</p>
            <p className="mt-2 text-2xl font-bold text-blue-300">
              {commercialStats.newClientsThisMonth}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Clientes cadastrados desde o início do mês.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-sm text-zinc-500">Ações sugeridas</p>
            <p className="mt-2 text-sm text-zinc-300">
              Envie WhatsApp para aniversariantes e clientes sem retorno recente.
            </p>
          </div>
        </div>
      </div>


      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        {renderRankingCard(
          'Top serviços do mês',
          'Serviços com maior faturamento em comandas fechadas.',
          topServices,
          'Nenhum serviço vendido no mês.'
        )}

        {renderRankingCard(
          'Top produtos do mês',
          'Produtos mais vendidos em comandas fechadas.',
          topProducts,
          'Nenhum produto vendido no mês.'
        )}

        {renderRankingCard(
          'Ranking de profissionais',
          'Faturamento gerado por serviços executados.',
          topProfessionals,
          'Nenhum profissional com serviço fechado no mês.'
        )}
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
