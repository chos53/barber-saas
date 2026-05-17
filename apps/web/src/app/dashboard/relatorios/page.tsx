'use client'

import { useEffect, useState } from 'react'
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

type RevenueItem = {
  appointment_date: string
  previsto: number
  realizado: number
}

export default function ReportsPage() {
  const [expectedRevenue, setExpectedRevenue] = useState(0)
  const [realizedRevenue, setRealizedRevenue] = useState(0)
  const [appointmentsCount, setAppointmentsCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [cancelledCount, setCancelledCount] = useState(0)
  const [period, setPeriod] = useState('30')
  const [chartData, setChartData] = useState<RevenueItem[]>([])

  useEffect(() => {
    loadData()
  }, [period])

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) return

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - Number(period))

    const formattedStartDate = startDate
      .toISOString()
      .split('T')[0]

    const { data: revenueData } = await supabase
      .from('appointment_financial_summary')
      .select('price, status, appointment_date')
      .eq('company_id', profile.company_id)
      .gte('appointment_date', formattedStartDate)

    const totalExpected =
      revenueData
        ?.filter((item) => item.status !== 'cancelled')
        .reduce((sum, item) => sum + Number(item.price), 0) || 0

    const totalRealized =
      revenueData
        ?.filter((item) => item.status === 'completed')
        .reduce((sum, item) => sum + Number(item.price), 0) || 0

    const groupedRevenue: Record<string, RevenueItem> = {}

    revenueData?.forEach((item) => {
      const date = item.appointment_date

      if (!groupedRevenue[date]) {
        groupedRevenue[date] = {
          appointment_date: date,
          previsto: 0,
          realizado: 0,
        }
      }

      if (item.status !== 'cancelled') {
        groupedRevenue[date].previsto += Number(item.price)
      }

      if (item.status === 'completed') {
        groupedRevenue[date].realizado += Number(item.price)
      }
    })

    setChartData(Object.values(groupedRevenue))

    setExpectedRevenue(totalExpected)
    setRealizedRevenue(totalRealized)

    const { count: totalAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .gte('appointment_date', formattedStartDate)

    const { count: completedAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('status', 'completed')
      .gte('appointment_date', formattedStartDate)

    const { count: cancelledAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('status', 'cancelled')
      .gte('appointment_date', formattedStartDate)

    setAppointmentsCount(totalAppointments || 0)
    setCompletedCount(completedAppointments || 0)
    setCancelledCount(cancelledAppointments || 0)
  }

  return (
    <div>
      <h1 className="text-4xl font-bold">Relatórios</h1>

      <p className="mt-2 text-zinc-400">
        Indicadores financeiros e operacionais.
      </p>

      <div className="mt-4 flex gap-2">
        {['1', '7', '30'].map((value) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={`rounded-lg px-4 py-2 ${
              period === value
                ? 'bg-white text-black'
                : 'bg-zinc-800'
            }`}
          >
            {value === '1' ? 'Hoje' : `${value} dias`}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">Faturamento previsto</p>
          <strong className="mt-2 block text-4xl">
            R$ {expectedRevenue.toFixed(2)}
          </strong>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">Faturamento realizado</p>
          <strong className="mt-2 block text-4xl text-green-400">
            R$ {realizedRevenue.toFixed(2)}
          </strong>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">Agendamentos</p>
          <strong className="mt-2 block text-4xl">
            {appointmentsCount}
          </strong>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">Concluídos</p>
          <strong className="mt-2 block text-4xl text-green-400">
            {completedCount}
          </strong>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">Cancelados</p>
          <strong className="mt-2 block text-4xl text-red-400">
            {cancelledCount}
          </strong>
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">
          Faturamento por dia
        </h2>

        <div className="mt-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="appointment_date" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: '12px',
                  color: '#ffffff',
                }}
                labelStyle={{
                  color: '#ffffff',
                }}
              />
        
              <Bar dataKey="previsto" name="Previsto" />
              <Bar dataKey="realizado" name="Realizado" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}