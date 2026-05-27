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

  const [period, setPeriod] = useState('30')

  const [upcomingAppointments, setUpcomingAppointments] =
    useState<UpcomingAppointment[]>([])

  const [revenueChartData, setRevenueChartData] = useState<
    RevenueChartItem[]
  >([])

  const [professionalsRanking, setProfessionalsRanking] =
    useState<ProfessionalRanking[]>([])

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