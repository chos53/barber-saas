'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '@/lib/supabase'

type UpcomingAppointment = {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  clients: { name: string } | null
  services: { name: string } | null
  professionals: { name: string } | null
}

type RevenueChartItem = {
  date: string
  revenue: number
}

type ProfessionalRanking = {
  name: string
  total: number
}

type ClientRanking = {
  name: string
  total: number
  visits: number
  averageTicket: number
}

export default function DashboardPage() {
  const [clientsCount, setClientsCount] = useState(0)
  const [servicesCount, setServicesCount] = useState(0)
  const [professionalsCount, setProfessionalsCount] = useState(0)
  const [appointmentsCount, setAppointmentsCount] = useState(0)

  const [expectedRevenue, setExpectedRevenue] = useState(0)
  const [realizedRevenue, setRealizedRevenue] = useState(0)

  const [todayRevenue, setTodayRevenue] = useState(0)
  const [ticketAverage, setTicketAverage] = useState(0)
  const [cancelRate, setCancelRate] = useState(0)
  const [estimatedProfit, setEstimatedProfit] = useState(0)
  const [topService, setTopService] = useState('-')
  const [monthlyGoal, setMonthlyGoal] = useState(0)
  const [monthlyGoalInput, setMonthlyGoalInput] = useState('')
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)
  const [dashboardCompanyId, setDashboardCompanyId] = useState('')
  const [savingMonthlyGoal, setSavingMonthlyGoal] = useState(false)

  const [period, setPeriod] = useState('30')

  const [upcomingAppointments, setUpcomingAppointments] =
    useState<UpcomingAppointment[]>([])

  const [revenueChartData, setRevenueChartData] = useState<
    RevenueChartItem[]
  >([])

  const [professionalsRanking, setProfessionalsRanking] =
    useState<ProfessionalRanking[]>([])

  const [clientsRanking, setClientsRanking] =
    useState<ClientRanking[]>([])

  useEffect(() => {
    loadDashboard()
  }, [period])

  async function saveMonthlyGoal() {
    if (!dashboardCompanyId) {
      alert('Empresa não identificada. Atualize a página e tente novamente.')
      return
    }

    const goalValue = Number(monthlyGoalInput)

    if (!monthlyGoalInput || goalValue < 0) {
      alert('Informe uma meta mensal válida.')
      return
    }

    setSavingMonthlyGoal(true)

    const { error } = await supabase
      .from('company_dashboard_settings')
      .upsert({
        company_id: dashboardCompanyId,
        monthly_goal: goalValue,
        updated_at: new Date().toISOString(),
      })

    setSavingMonthlyGoal(false)

    if (error) {
      alert(`Erro ao salvar meta mensal: ${error.message}`)
      return
    }

    setMonthlyGoal(goalValue)
  }

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

    setDashboardCompanyId(companyId)

    const today = new Date()
      .toISOString()
      .split('T')[0]

    const startDate = new Date()

    startDate.setDate(
      startDate.getDate() - Number(period)
    )

    const formattedStartDate = startDate
      .toISOString()
      .split('T')[0]

    const { data: dashboardSettings } =
      await supabase
        .from('company_dashboard_settings')
        .select('monthly_goal')
        .eq('company_id', companyId)
        .maybeSingle()

    const savedMonthlyGoal = Number(
      dashboardSettings?.monthly_goal || 0
    )

    setMonthlyGoal(savedMonthlyGoal)
    setMonthlyGoalInput(
      savedMonthlyGoal > 0 ? String(savedMonthlyGoal) : ''
    )

    const { count: clients } = await supabase
      .from('clients')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('company_id', companyId)

    const { count: services } = await supabase
      .from('services')
      .select('*', {
        count: 'exact',
        head: true,
      })
      .eq('company_id', companyId)

    const { count: professionals } =
      await supabase
        .from('professionals')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('company_id', companyId)

    const { data: appointmentsData } =
      await supabase
        .from('appointments')
        .select(`
          *,
          services (
            id,
            name,
            price
          ),
          professionals (
            id,
            name
          )
        `)
        .eq('company_id', companyId)
        .gte(
          'appointment_date',
          formattedStartDate
        )

    const appointments =
      appointmentsData || []
    
    const { data: financialExpenses } =
      await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('company_id', companyId)
        .eq('type', 'expense')
        .neq('status', 'cancelled')
        .gte(
          'transaction_date',
          formattedStartDate
        )

    const { data: financialIncomeTransactions } =
      await supabase
        .from('financial_transactions')
        .select('client_id, amount')
        .eq('company_id', companyId)
        .eq('type', 'income')
        .neq('status', 'cancelled')
        .gte(
          'transaction_date',
          formattedStartDate
        )

    const monthStartDate = new Date(
      today.substring(0, 4) + '-' + today.substring(5, 7) + '-01'
    )
      .toISOString()
      .split('T')[0]

    const { data: monthlyFinancialRevenue } =
      await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('company_id', companyId)
        .eq('type', 'income')
        .neq('status', 'cancelled')
        .gte('transaction_date', monthStartDate)
        .lte('transaction_date', today)

    const totalAppointments =
      appointments.length

    const completedAppointments =
      appointments.filter(
        (item) =>
          item.status === 'completed'
      )

    const cancelledAppointments =
      appointments.filter(
        (item) =>
          item.status === 'cancelled'
      )

    const totalExpectedRevenue =
      appointments
        .filter(
          (item) =>
            item.status !== 'cancelled'
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(
              item.price ||
                item.services?.price ||
                0
            ),
          0
        )

    const totalRealizedRevenue =
      completedAppointments.reduce(
        (sum, item) =>
          sum +
          Number(
            item.price ||
              item.services?.price ||
              0
          ),
        0
      )

    const { data: todayFinancialRevenue } =
      await supabase
        .from('financial_transactions')
        .select('amount')
        .eq('company_id', companyId)
        .eq('type', 'income')
        .neq('status', 'cancelled')
        .eq('transaction_date', today)

    const todayCompletedRevenue =
      todayFinancialRevenue?.reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0
      ) || 0

    const currentMonthRevenue =
      monthlyFinancialRevenue?.reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0
      ) || 0

    setMonthlyRevenue(currentMonthRevenue)
   

        const totalExpenses =
        financialExpenses?.reduce(
          (sum, item) =>
            sum + Number(item.amount || 0),
          0
        ) || 0
      
      const estimatedProfit =
        totalRealizedRevenue - totalExpenses
      
      const ticketAverage =
        completedAppointments.length > 0
          ? totalRealizedRevenue /
            completedAppointments.length
          : 0
      
      const cancelRate =
        totalAppointments > 0
          ? (cancelledAppointments.length /
              totalAppointments) *
            100
          : 0
      
      const serviceSalesMap: Record<
        string,
        number
      > = {}
      
      appointments
        .filter(
          (item) =>
            item.status !== 'cancelled'
        )
        .forEach((appointment) => {
          const serviceName =
            appointment.services?.name ||
            'Não informado'
      
          if (
            !serviceSalesMap[serviceName]
          ) {
            serviceSalesMap[
              serviceName
            ] = 0
          }
      
          serviceSalesMap[
            serviceName
          ] += 1
        })
      
      const topServiceEntry =
        Object.entries(serviceSalesMap)
          .sort((a, b) => b[1] - a[1])[0]
      
      setTopService(
        topServiceEntry?.[0] || '-'
      )
      
      setTicketAverage(ticketAverage)
      
      setCancelRate(cancelRate)
      
      setEstimatedProfit(
        estimatedProfit
      )

    const clientIds = [
      ...new Set(
        (financialIncomeTransactions || [])
          .map((transaction) => transaction.client_id)
          .filter(Boolean)
      ),
    ]

    const { data: rankingClients } =
      clientIds.length > 0
        ? await supabase
            .from('clients')
            .select('id, name')
            .in('id', clientIds)
        : { data: [] }

    const clientsMap = new Map(
      (rankingClients || []).map((client) => [client.id, client.name])
    )

    const clientSalesMap: Record<
      string,
      ClientRanking
    > = {}

    ;(financialIncomeTransactions || [])
      .filter((transaction) => transaction.client_id)
      .forEach((transaction) => {
        const clientId = transaction.client_id as string
        const clientName = clientsMap.get(clientId) || 'Cliente não informado'

        if (!clientSalesMap[clientId]) {
          clientSalesMap[clientId] = {
            name: clientName,
            total: 0,
            visits: 0,
            averageTicket: 0,
          }
        }

        clientSalesMap[clientId].total += Number(transaction.amount || 0)
        clientSalesMap[clientId].visits += 1
      })

    const clientRanking = Object.values(clientSalesMap)
      .map((client) => ({
        ...client,
        averageTicket:
          client.visits > 0
            ? client.total / client.visits
            : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    setClientsRanking(clientRanking)

    const revenueMap: Record<
      string,
      number
    > = {}

    completedAppointments.forEach(
      (appointment) => {
        const date =
          appointment.appointment_date

        if (!revenueMap[date]) {
          revenueMap[date] = 0
        }

        revenueMap[date] += Number(
          appointment.price ||
            appointment.services?.price ||
            0
        )
      }
    )

    const chartData = Object.entries(
      revenueMap
    ).map(([date, revenue]) => ({
      date,
      revenue,
    }))

    setRevenueChartData(chartData)

    const professionalsMap: Record<
      string,
      number
    > = {}

    completedAppointments.forEach(
      (appointment) => {
        const professionalName =
          appointment.professionals
            ?.name ||
          'Não informado'

        if (
          !professionalsMap[
            professionalName
          ]
        ) {
          professionalsMap[
            professionalName
          ] = 0
        }

        professionalsMap[
          professionalName
        ] += Number(
          appointment.price ||
            appointment.services?.price ||
            0
        )
      }
    )

    const ranking = Object.entries(
      professionalsMap
    )
      .map(([name, total]) => ({
        name,
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    setProfessionalsRanking(ranking)

    const { data: upcomingData } =
      await supabase
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
        .eq('company_id', companyId)
        .gte('appointment_date', today)
        .order('appointment_date', {
          ascending: true,
        })
        .order('appointment_time', {
          ascending: true,
        })
        .limit(10)

    setClientsCount(clients || 0)
    setServicesCount(services || 0)
    setProfessionalsCount(
      professionals || 0
    )

    setAppointmentsCount(
      totalAppointments
    )

    setExpectedRevenue(
      totalExpectedRevenue
    )

    setRealizedRevenue(
      totalRealizedRevenue
    )

    setTodayRevenue(
      todayCompletedRevenue
    )

    setUpcomingAppointments(
      (upcomingData ||
        []) as UpcomingAppointment[]
    )
  }

  const topProfessional =
    useMemo(() => {
      return professionalsRanking[0]
    }, [professionalsRanking])

  const monthlyGoalProgress =
    monthlyGoal > 0
      ? Math.min((monthlyRevenue / monthlyGoal) * 100, 100)
      : 0

  const remainingToGoal = Math.max(monthlyGoal - monthlyRevenue, 0)

  const currentDate = new Date()

const currentDay =
  currentDate.getDate()

const totalDaysInMonth =
  new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate()

const dailyAverageRevenue =
  currentDay > 0
    ? monthlyRevenue / currentDay
    : 0

const projectedMonthlyRevenue =
  dailyAverageRevenue *
  totalDaysInMonth

const projectedGoalReached =
  projectedMonthlyRevenue >=
  monthlyGoal

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold">
            Dashboard
          </h1>

          <p className="mt-2 text-zinc-400">
            Resumo geral da empresa.
          </p>
        </div>

        <div className="flex gap-2">
          {['1', '7', '30'].map(
            (value) => (
              <button
                key={value}
                onClick={() =>
                  setPeriod(value)
                }
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
            )
          )}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-green-900 bg-green-950/30 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-green-300">
              Meta mensal da barbearia
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              R$ {monthlyGoal.toFixed(2)}
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              Realizado no mês: R$ {monthlyRevenue.toFixed(2)}
            </p>
          </div>

          <div className="w-full lg:max-w-md">
            <label className="text-sm text-zinc-400">
              Alterar meta mensal
            </label>

            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <input
                type="number"
                min="0"
                step="100"
                value={monthlyGoalInput}
                onChange={(event) =>
                  setMonthlyGoalInput(event.target.value)
                }
                placeholder="Ex: 15000"
                className="w-full rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
              />

              <button
                type="button"
                onClick={saveMonthlyGoal}
                disabled={savingMonthlyGoal}
                className="rounded-xl bg-green-400 px-5 py-3 font-bold text-black transition hover:bg-green-300 disabled:opacity-50"
              >
                {savingMonthlyGoal ? 'Salvando...' : 'Salvar meta'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 h-4 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-green-400 transition-all"
            style={{
              width: `${monthlyGoalProgress}%`,
            }}
          />
        </div>

        <div className="mt-3 flex flex-col gap-2 text-sm text-zinc-300 md:flex-row md:items-center md:justify-between">
          <span>
            {monthlyGoal > 0
              ? `${monthlyGoalProgress.toFixed(1)}% da meta atingida`
              : 'Defina uma meta mensal para acompanhar o progresso'}
          </span>

          <span>
            {monthlyGoal > 0
              ? `Faltam R$ ${remainingToGoal.toFixed(2)} para bater a meta`
              : 'A meta ficará salva para esta empresa'}
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-cyan-900 bg-cyan-950/30 p-6">
  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <p className="text-sm text-cyan-300">
        Projeção automática do mês
      </p>

      <h2 className="mt-2 text-3xl font-bold text-white">
        R$ {projectedMonthlyRevenue.toFixed(2)}
      </h2>

      <p className="mt-2 text-sm text-zinc-300">
        Média diária atual:
        {' '}
        R$ {dailyAverageRevenue.toFixed(2)}
      </p>
    </div>

    <div
      className={`rounded-2xl px-5 py-4 text-center ${
        projectedGoalReached
          ? 'bg-green-900/40 text-green-300'
          : 'bg-red-900/40 text-red-300'
      }`}
    >
      <p className="text-sm">
        Status da meta
      </p>

      <strong className="mt-1 block text-lg">
        {projectedGoalReached
          ? 'Meta será atingida'
          : 'Meta abaixo do esperado'}
      </strong>
    </div>
  </div>
</div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Faturamento hoje
          </p>

          <strong className="mt-3 block text-4xl text-green-400">
            R$ {todayRevenue.toFixed(2)}
          </strong>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Faturamento período
          </p>

          <strong className="mt-3 block text-4xl">
            R$ {realizedRevenue.toFixed(2)}
          </strong>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Agendamentos
          </p>

          <strong className="mt-3 block text-4xl">
            {appointmentsCount}
          </strong>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Melhor profissional
          </p>

          <strong className="mt-3 block text-2xl text-yellow-400">
            {topProfessional?.name ||
              '-'}
          </strong>

          <p className="mt-2 text-sm text-zinc-500">
            {topProfessional
              ? `R$ ${topProfessional.total.toFixed(
                  2
                )}`
              : 'Sem dados'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
  <div className="rounded-2xl border border-blue-900 bg-blue-950/30 p-6">
    <p className="text-sm text-blue-300">
      Ticket médio
    </p>

    <strong className="mt-3 block text-3xl text-white">
      R$ {ticketAverage.toFixed(2)}
    </strong>
  </div>

  <div className="rounded-2xl border border-red-900 bg-red-950/30 p-6">
    <p className="text-sm text-red-300">
      Taxa cancelamento
    </p>

    <strong className="mt-3 block text-3xl text-white">
      {cancelRate.toFixed(1)}%
    </strong>
  </div>

  <div className="rounded-2xl border border-green-900 bg-green-950/30 p-6">
    <p className="text-sm text-green-300">
      Lucro estimado
    </p>

    <strong className="mt-3 block text-3xl text-white">
      R$ {estimatedProfit.toFixed(2)}
    </strong>
  </div>

  <div className="rounded-2xl border border-yellow-900 bg-yellow-950/30 p-6">
    <p className="text-sm text-yellow-300">
      Serviço destaque
    </p>

    <strong className="mt-3 block text-xl text-white">
      {topService}
    </strong>
  </div>
</div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
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
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              Faturamento diário
            </h2>

            <span className="text-sm text-zinc-500">
              Últimos {period} dias
            </span>
          </div>

          {revenueChartData.length >
          0 ? (
            <div className="mt-6 h-[320px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={revenueChartData}
                >
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis dataKey="date" />

                  <YAxis
                    tickFormatter={(
                      value
                    ) =>
                      `R$ ${Number(
                        value
                      ).toFixed(0)}`
                    }
                  />

                  <Tooltip
                    formatter={(
                      value
                    ) =>
                      `R$ ${Number(
                        value
                      ).toFixed(2)}`
                    }
                    contentStyle={{
                      backgroundColor:
                        '#18181b',
                      border:
                        '1px solid #3f3f46',
                      borderRadius:
                        '12px',
                    }}
                  />

                  <Bar
                    dataKey="revenue"
                    fill="#22c55e"
                    radius={[
                      8,
                      8,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-6 text-zinc-500">
              Nenhum dado encontrado.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">
            Ranking profissionais
          </h2>

          <div className="mt-6 space-y-4">
            {professionalsRanking.length ===
              0 && (
              <p className="text-zinc-500">
                Nenhum dado encontrado.
              </p>
            )}

            {professionalsRanking.map(
              (
                professional,
                index
              ) => (
                <div
                  key={professional.name}
                  className="rounded-xl bg-zinc-800 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-500">
                        #{index + 1}
                      </p>

                      <strong className="mt-1 block">
                        {
                          professional.name
                        }
                      </strong>
                    </div>

                    <strong className="text-green-400">
                      R${' '}
                      {professional.total.toFixed(
                        2
                      )}
                    </strong>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            Clientes VIP
          </h2>

          <span className="rounded-full bg-yellow-900 px-3 py-1 text-sm text-yellow-300">
            Top {clientsRanking.length}
          </span>
        </div>

        <div className="mt-6 space-y-3">
          {clientsRanking.length === 0 && (
            <p className="rounded-xl bg-zinc-800 p-4 text-zinc-500">
              Nenhum cliente VIP encontrado no período.
            </p>
          )}

          {clientsRanking.map((client, index) => (
            <div
              key={`${client.name}-${index}`}
              className="rounded-2xl border border-zinc-800 bg-zinc-800 p-5"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr_auto_auto]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500 text-lg font-bold text-black">
                  {index + 1}
                </div>

                <div>
                  <p className="text-lg font-bold">
                    {client.name}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {client.visits} visita(s) no período
                  </p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">
                    Total gasto
                  </p>

                  <strong className="mt-1 block text-green-400">
                    R$ {client.total.toFixed(2)}
                  </strong>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">
                    Ticket médio
                  </p>

                  <strong className="mt-1 block text-blue-300">
                    R$ {client.averageTicket.toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            Próximos agendamentos
          </h2>

          <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-400">
            {
              upcomingAppointments.length
            }{' '}
            agendamento(s)
          </span>
        </div>

        <div className="mt-6 space-y-3">
          {upcomingAppointments.length ===
            0 && (
            <p className="rounded-xl bg-zinc-800 p-4 text-zinc-500">
              Nenhum agendamento futuro.
            </p>
          )}

          {upcomingAppointments.map(
            (appointment) => (
              <div
                key={appointment.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-800 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-bold">
                      {
                        appointment.clients
                          ?.name
                      }
                    </p>

                    <p className="mt-1 text-zinc-300">
                      {
                        appointment.services
                          ?.name
                      }
                    </p>

                    <p className="mt-2 text-sm text-zinc-500">
                      Profissional:{' '}
                      {
                        appointment
                          .professionals
                          ?.name
                      }
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold">
                      {appointment.appointment_time.slice(
                        0,
                        5
                      )}
                    </p>

                    <p className="text-sm text-zinc-500">
                      {
                        appointment.appointment_date
                      }
                    </p>

                    <span
                      className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-medium ${
                        appointment.status ===
                        'completed'
                          ? 'bg-green-900 text-green-300'
                          : appointment.status ===
                              'cancelled'
                            ? 'bg-red-900 text-red-300'
                            : appointment.status ===
                                'no_show'
                              ? 'bg-yellow-900 text-yellow-300'
                              : 'bg-blue-900 text-blue-300'
                      }`}
                    >
                      {getStatusLabel(
                        appointment.status
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}