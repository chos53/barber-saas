'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ReportsPage() {
  const [expectedRevenue, setExpectedRevenue] = useState(0)
  const [realizedRevenue, setRealizedRevenue] = useState(0)

  const [appointmentsCount, setAppointmentsCount] =
    useState(0)

  const [completedCount, setCompletedCount] =
    useState(0)

  const [cancelledCount, setCancelledCount] =
    useState(0)

  useEffect(() => {
    loadData()
  }, [])

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

    const { data: revenueData } = await supabase
      .from('appointment_financial_summary')
      .select('price, status')
      .eq('company_id', profile.company_id)

    const totalExpected =
      revenueData?.reduce(
        (sum, item) => sum + Number(item.price),
        0
      ) || 0

    const totalRealized =
      revenueData
        ?.filter((item) => item.status === 'completed')
        .reduce(
          (sum, item) => sum + Number(item.price),
          0
        ) || 0

    setExpectedRevenue(totalExpected)
    setRealizedRevenue(totalRealized)

    const { count: totalAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)

    const { count: completedAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('status', 'completed')

    const { count: cancelledAppointments } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', profile.company_id)
      .eq('status', 'cancelled')

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

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Faturamento previsto
          </p>

          <strong className="mt-2 block text-4xl">
            R$ {expectedRevenue.toFixed(2)}
          </strong>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Faturamento realizado
          </p>

          <strong className="mt-2 block text-4xl text-green-400">
            R$ {realizedRevenue.toFixed(2)}
          </strong>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Agendamentos
          </p>

          <strong className="mt-2 block text-4xl">
            {appointmentsCount}
          </strong>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Concluídos
          </p>

          <strong className="mt-2 block text-4xl text-green-400">
            {completedCount}
          </strong>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Cancelados
          </p>

          <strong className="mt-2 block text-4xl text-red-400">
            {cancelledCount}
          </strong>
        </div>
      </div>
    </div>
  )
}