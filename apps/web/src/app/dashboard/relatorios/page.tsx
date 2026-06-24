'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
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

type ProfessionalRevenue = {
  professional_name: string
  total: number
}

type ServiceRanking = {
  service_name: string
  total: number
}

type CommissionRanking = {
  professional_id: string
  professional_name: string
  commission_percentage: number
  revenue: number
  commission: number
}

const chartColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7']

export default function ReportsPage() {
  const [companyId, setCompanyId] = useState('')
  const [companyName, setCompanyName] = useState('Barber SaaS')
  // Novo estado para controlar se a conta está em período de Trial
  const [isTrial, setIsTrial] = useState(false)
  
  const [expectedRevenue, setExpectedRevenue] = useState(0)
  const [realizedRevenue, setRealizedRevenue] = useState(0)
  const [appointmentsCount, setAppointmentsCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [cancelledCount, setCancelledCount] = useState(0)
  const [period, setPeriod] = useState('30')
  const [chartData, setChartData] = useState<RevenueItem[]>([])
  const [professionalRevenue, setProfessionalRevenue] = useState<ProfessionalRevenue[]>([])
  const [servicesRanking, setServicesRanking] = useState<ServiceRanking[]>([])
  const [cashRevenue, setCashRevenue] = useState(0)
  const [pixRevenue, setPixRevenue] = useState(0)
  const [creditRevenue, setCreditRevenue] = useState(0)
  const [debitRevenue, setDebitRevenue] = useState(0)
  const [commissionRanking, setCommissionRanking] = useState<CommissionRanking[]>([])
  const [totalCommission, setTotalCommission] = useState(0)
  const [totalCommissionRevenue, setTotalCommissionRevenue] = useState(0)

  useEffect(() => {
    loadData()
  }, [period])

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  function escapePdfText(value: string | number | null | undefined) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  function escapeCsvValue(value: string | number | boolean | null | undefined) {
    const text = String(value ?? '')
      .replaceAll('"', '""')
      .replaceAll('\n', ' ')
      .replaceAll('\r', ' ')

    return `"${text}"`
  }

  function downloadCsv(
    filename: string,
    headers: string[],
    rows: Array<Array<string | number | boolean | null | undefined>>
  ) {
    const csvContent = [
      headers.map(escapeCsvValue).join(';'),
      ...rows.map((row) => row.map(escapeCsvValue).join(';')),
    ].join('\n')

    const blob = new Blob([`\ufeff${csvContent}`], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = filename
    link.click()

    URL.revokeObjectURL(url)
  }

  function getExportDate() {
    return new Date().toISOString().split('T')[0]
  }

  async function ensureCompanyId() {
    if (companyId) return companyId

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = '/login'
      return ''
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      alert('Empresa não identificada.')
      return ''
    }

    setCompanyId(profile.company_id)

    return profile.company_id
  }

  async function createAuditLog(description: string, metadata: Record<string, unknown> = {}) {
    const currentCompanyId = await ensureCompanyId()

    if (!currentCompanyId) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from('audit_logs').insert({
      company_id: currentCompanyId,
      user_id: user?.id || null,
      action: 'export',
      module: 'relatorios',
      description,
      metadata,
    })
  }

  // Helper para verificar se está em trial antes de exportar (segurança extra)
  function canExport() {
    if (isTrial) {
      alert('A exportação de dados é uma funcionalidade exclusiva para assinantes. Faça o upgrade do seu plano para liberar este recurso.')
      return false
    }
    return true
  }

  async function exportClientsCsv() {
    if (!canExport()) return
    const currentCompanyId = await ensureCompanyId()
    if (!currentCompanyId) return

    const { data, error } = await supabase
      .from('clients')
      .select('name, phone, email, birth_date, active, created_at')
      .eq('company_id', currentCompanyId)
      .order('name', { ascending: true })

    if (error) {
      alert(`Erro ao exportar clientes: ${error.message}`)
      return
    }

    downloadCsv(
      `clientes-${getExportDate()}.csv`,
      ['Nome', 'Telefone', 'Email', 'Nascimento', 'Ativo', 'Criado em'],
      (data || []).map((client: any) => [
        client.name,
        client.phone,
        client.email,
        client.birth_date,
        client.active ? 'Sim' : 'Não',
        client.created_at,
      ])
    )

    createAuditLog('Exportou clientes em CSV', {
      file: `clientes-${getExportDate()}.csv`,
      total: data?.length || 0,
    })
  }

  async function exportServicesCsv() {
    if (!canExport()) return
    const currentCompanyId = await ensureCompanyId()
    if (!currentCompanyId) return

    const { data, error } = await supabase
      .from('services')
      .select('name, price, duration_minutes, active, created_at')
      .eq('company_id', currentCompanyId)
      .order('name', { ascending: true })

    if (error) {
      alert(`Erro ao exportar serviços: ${error.message}`)
      return
    }

    downloadCsv(
      `servicos-${getExportDate()}.csv`,
      ['Nome', 'Preço', 'Duração em minutos', 'Ativo', 'Criado em'],
      (data || []).map((service: any) => [
        service.name,
        Number(service.price || 0).toFixed(2),
        service.duration_minutes,
        service.active ? 'Sim' : 'Não',
        service.created_at,
      ])
    )

    createAuditLog('Exportou serviços em CSV', {
      file: `servicos-${getExportDate()}.csv`,
      total: data?.length || 0,
    })
  }

  async function exportProductsCsv() {
    if (!canExport()) return
    const currentCompanyId = await ensureCompanyId()
    if (!currentCompanyId) return

    const { data, error } = await supabase
      .from('products')
      .select('name, current_stock, minimum_stock, sale_price, cost_price, active, created_at')
      .eq('company_id', currentCompanyId)
      .order('name', { ascending: true })

    if (error) {
      alert(`Erro ao exportar produtos: ${error.message}`)
      return
    }

    downloadCsv(
      `produtos-${getExportDate()}.csv`,
      ['Nome', 'Estoque atual', 'Estoque mínimo', 'Preço venda', 'Preço custo', 'Ativo', 'Criado em'],
      (data || []).map((product: any) => [
        product.name,
        product.current_stock,
        product.minimum_stock,
        Number(product.sale_price || 0).toFixed(2),
        Number(product.cost_price || 0).toFixed(2),
        product.active ? 'Sim' : 'Não',
        product.created_at,
      ])
    )

    createAuditLog('Exportou produtos em CSV', {
      file: `produtos-${getExportDate()}.csv`,
      total: data?.length || 0,
    })
  }

  async function exportFinancialCsv() {
    if (!canExport()) return
    const currentCompanyId = await ensureCompanyId()
    if (!currentCompanyId) return

    const { data, error } = await supabase
      .from('financial_transactions')
      .select('transaction_date, type, category, description, amount, payment_method, status, created_at')
      .eq('company_id', currentCompanyId)
      .order('transaction_date', { ascending: false })

    if (error) {
      alert(`Erro ao exportar financeiro: ${error.message}`)
      return
    }

    downloadCsv(
      `financeiro-${getExportDate()}.csv`,
      ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Método', 'Status', 'Criado em'],
      (data || []).map((transaction: any) => [
        transaction.transaction_date,
        transaction.type === 'income' ? 'Entrada' : 'Despesa',
        transaction.category,
        transaction.description,
        Number(transaction.amount || 0).toFixed(2),
        transaction.payment_method,
        transaction.status,
        transaction.created_at,
      ])
    )

    createAuditLog('Exportou financeiro em CSV', {
      file: `financeiro-${getExportDate()}.csv`,
      total: data?.length || 0,
    })
  }

  async function exportAppointmentsCsv() {
    if (!canExport()) return
    const currentCompanyId = await ensureCompanyId()
    if (!currentCompanyId) return

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        appointment_date,
        appointment_time,
        status,
        price,
        clients ( name ),
        services ( name ),
        professionals ( name ),
        created_at
      `)
      .eq('company_id', currentCompanyId)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })

    if (error) {
      alert(`Erro ao exportar agendamentos: ${error.message}`)
      return
    }

    downloadCsv(
      `agendamentos-${getExportDate()}.csv`,
      ['Data', 'Hora', 'Cliente', 'Serviço', 'Profissional', 'Status', 'Valor', 'Criado em'],
      (data || []).map((appointment: any) => [
        appointment.appointment_date,
        appointment.appointment_time,
        appointment.clients?.name || 'Cliente não informado',
        appointment.services?.name || 'Serviço não informado',
        appointment.professionals?.name || 'Profissional não informado',
        appointment.status,
        Number(appointment.price || 0).toFixed(2),
        appointment.created_at,
      ])
    )

    createAuditLog('Exportou agendamentos em CSV', {
      file: `agendamentos-${getExportDate()}.csv`,
      total: data?.length || 0,
    })
  }

  function generatePdfReport() {
    const today = new Date().toLocaleDateString('pt-BR')

    const commissionRows =
      commissionRanking.length > 0
        ? commissionRanking
            .map(
              (professional, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${escapePdfText(professional.professional_name)}</td>
                  <td>${professional.commission_percentage.toFixed(2)}%</td>
                  <td>${formatCurrency(professional.revenue)}</td>
                  <td>${formatCurrency(professional.commission)}</td>
                </tr>
              `
            )
            .join('')
        : `
          <tr>
            <td colspan="5">Nenhuma comissão encontrada no mês atual.</td>
          </tr>
        `

    const professionalRows =
      topProfessionals.length > 0
        ? topProfessionals
            .map(
              (professional, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${escapePdfText(professional.professional_name)}</td>
                  <td>${formatCurrency(professional.total)}</td>
                </tr>
              `
            )
            .join('')
        : `
          <tr>
            <td colspan="3">Nenhum profissional encontrado.</td>
          </tr>
        `

    const serviceRows =
      topServices.length > 0
        ? topServices
            .map(
              (service, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${escapePdfText(service.service_name)}</td>
                  <td>${service.total}</td>
                </tr>
              `
            )
            .join('')
        : `
          <tr>
            <td colspan="3">Nenhum serviço encontrado.</td>
          </tr>
        `

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Relatório Gerencial - ${escapePdfText(companyName)}</title>

          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #111827; margin: 28px; background: #ffffff; }
            h1 { margin: 0; font-size: 30px; color: #111827; }
            h2 { margin-top: 30px; border-bottom: 2px solid #111827; padding-bottom: 8px; font-size: 20px; color: #111827; }
            p { color: #4b5563; margin: 6px 0; }
            .header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; border-bottom: 3px solid #111827; padding-bottom: 18px; margin-bottom: 24px; }
            .company { font-size: 16px; font-weight: 700; color: #374151; margin-top: 6px; }
            .badge { display: inline-block; border-radius: 999px; background: #111827; color: #ffffff; padding: 8px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
            .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }
            .card { border: 1px solid #d1d5db; border-radius: 12px; padding: 14px; min-height: 86px; }
            .label { font-size: 12px; color: #6b7280; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .04em; }
            .value { font-size: 22px; font-weight: 700; color: #111827; }
            .green { color: #047857; }
            .red { color: #b91c1c; }
            .blue { color: #1d4ed8; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #f3f4f6; color: #374151; text-transform: uppercase; letter-spacing: .04em; font-size: 11px; }
            .footer { margin-top: 34px; padding-top: 14px; border-top: 1px solid #d1d5db; color: #6b7280; font-size: 11px; text-align: center; }
            @media print {
              button { display: none; }
              body { margin: 18px; }
              h2 { page-break-after: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Relatório Gerencial</h1>
              <div class="company">${escapePdfText(companyName)}</div>
              <p>Emitido em ${today}</p>
              <p>Período: últimos ${period} dia(s)</p>
            </div>
            <div><span class="badge">Barber SaaS</span></div>
          </div>

          <h2>Resumo financeiro</h2>
          <div class="grid">
            <div class="card"><div class="label">Faturamento previsto</div><div class="value">${formatCurrency(expectedRevenue)}</div></div>
            <div class="card"><div class="label">Faturamento realizado</div><div class="value green">${formatCurrency(realizedRevenue)}</div></div>
            <div class="card"><div class="label">Agendamentos</div><div class="value">${appointmentsCount}</div></div>
            <div class="card"><div class="label">Concluídos</div><div class="value green">${completedCount}</div></div>
            <div class="card"><div class="label">Cancelados</div><div class="value red">${cancelledCount}</div></div>
            <div class="card"><div class="label">Comissão total do mês</div><div class="value blue">${formatCurrency(totalCommission)}</div></div>
          </div>

          <h2>Formas de pagamento</h2>
          <div class="grid-4">
            <div class="card"><div class="label">Dinheiro</div><div class="value">${formatCurrency(cashRevenue)}</div></div>
            <div class="card"><div class="label">Pix</div><div class="value">${formatCurrency(pixRevenue)}</div></div>
            <div class="card"><div class="label">Crédito</div><div class="value">${formatCurrency(creditRevenue)}</div></div>
            <div class="card"><div class="label">Débito</div><div class="value">${formatCurrency(debitRevenue)}</div></div>
          </div>

          <h2>Relatório mensal de comissões</h2>
          <table><thead><tr><th>#</th><th>Profissional</th><th>% Comissão</th><th>Faturamento</th><th>Comissão</th></tr></thead><tbody>${commissionRows}</tbody></table>

          <h2>Ranking de profissionais</h2>
          <table><thead><tr><th>#</th><th>Profissional</th><th>Faturamento</th></tr></thead><tbody>${professionalRows}</tbody></table>

          <h2>Serviços mais vendidos</h2>
          <table><thead><tr><th>#</th><th>Serviço</th><th>Vendas</th></tr></thead><tbody>${serviceRows}</tbody></table>
          
          <div class="footer">Relatório gerado automaticamente pelo sistema em ${today}.</div>
        </body>
      </html>
    `

    const reportWindow = window.open('', '_blank')

    if (!reportWindow) {
      alert('Não foi possível abrir a janela do PDF. Verifique se o navegador bloqueou pop-ups.')
      return
    }

    reportWindow.document.write(html)
    reportWindow.document.close()
    reportWindow.focus()

    setTimeout(() => {
      reportWindow.print()
    }, 300)

    createAuditLog('Gerou relatório PDF', {
      period,
      expectedRevenue,
      realizedRevenue,
      appointmentsCount,
      completedCount,
      cancelledCount,
    })
  }

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

    setCompanyId(profile.company_id)

    // BUSCA O STATUS DA ASSINATURA PARA VER SE ESTÁ EM TRIAL
    const { data: subscription } = await supabase
      .from('company_subscriptions')
      .select('status')
      .eq('company_id', profile.company_id)
      .maybeSingle()
      
    if (subscription?.status === 'trial') {
      setIsTrial(true)
    }

    const { data: settings } = await supabase
      .from('company_settings')
      .select('company_name')
      .eq('company_id', profile.company_id)
      .maybeSingle()

    if (settings?.company_name) {
      setCompanyName(settings.company_name)
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - Number(period))

    const formattedStartDate = startDate.toISOString().split('T')[0]

    const today = new Date().toISOString().split('T')[0]

    const monthStartDate = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    )
      .toISOString()
      .split('T')[0]

    const { data: financialTransactions } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('type', 'income')
      .gte('transaction_date', formattedStartDate)

    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('company_id', profile.company_id)
      .gte('appointment_date', formattedStartDate)

    const serviceIds = [
      ...new Set(
        appointments
          ?.map((appointment) => appointment.service_id)
          .filter(Boolean)
      ),
    ]

    const professionalIds = [
      ...new Set(
        appointments
          ?.map((appointment) => appointment.professional_id)
          .filter(Boolean)
      ),
    ]

    const { data: services } =
      serviceIds.length > 0
        ? await supabase
            .from('services')
            .select('id, name, price')
            .in('id', serviceIds)
        : { data: [] }

    const { data: professionals } = await supabase
      .from('professionals')
      .select('id, name, commission_percentage')
      .eq('company_id', profile.company_id)

    const servicesMap = new Map(
      services?.map((service) => [service.id, service]) || []
    )

    const professionalsMap = new Map(
      professionals?.map((professional) => [professional.id, professional]) || []
    )

    const normalizedAppointments =
      appointments?.map((appointment) => {
        const service = servicesMap.get(appointment.service_id)
        const professional = professionalsMap.get(appointment.professional_id)

        return {
          ...appointment,
          price: Number(appointment.price || service?.price || 0),
          service_name: service?.name || 'Não informado',
          professional_name: professional?.name || 'Não informado',
        }
      }) || []

    const totalExpected = normalizedAppointments
      .filter((item) => item.status !== 'cancelled')
      .reduce((sum, item) => sum + item.price, 0)

    const totalRealized = normalizedAppointments
      .filter((item) => item.status === 'completed')
      .reduce((sum, item) => sum + item.price, 0)

    const groupedRevenue: Record<string, RevenueItem> = {}

    normalizedAppointments.forEach((item) => {
      const date = item.appointment_date

      if (!groupedRevenue[date]) {
        groupedRevenue[date] = {
          appointment_date: date,
          previsto: 0,
          realizado: 0,
        }
      }

      if (item.status !== 'cancelled') {
        groupedRevenue[date].previsto += item.price
      }

      if (item.status === 'completed') {
        groupedRevenue[date].realizado += item.price
      }
    })

    setChartData(Object.values(groupedRevenue))

    const professionalMap: Record<string, number> = {}

    normalizedAppointments
      .filter((item) => item.status === 'completed')
      .forEach((item) => {
        if (!professionalMap[item.professional_name]) {
          professionalMap[item.professional_name] = 0
        }

        professionalMap[item.professional_name] += item.price
      })

    setProfessionalRevenue(
      Object.entries(professionalMap)
        .map(([professional_name, total]) => ({
          professional_name,
          total,
        }))
        .sort((a, b) => b.total - a.total)
    )

    const soldServicesMap: Record<string, number> = {}

    normalizedAppointments
      .filter((item) => item.status !== 'cancelled')
      .forEach((item) => {
        if (!soldServicesMap[item.service_name]) {
          soldServicesMap[item.service_name] = 0
        }

        soldServicesMap[item.service_name] += 1
      })

    const cashTotal =
      financialTransactions
        ?.filter((item) => item.payment_method === 'cash')
        .reduce((sum, item) => sum + Number(item.amount), 0) || 0

    const pixTotal =
      financialTransactions
        ?.filter((item) => item.payment_method === 'pix')
        .reduce((sum, item) => sum + Number(item.amount), 0) || 0

    const creditTotal =
      financialTransactions
        ?.filter((item) => item.payment_method === 'credit_card')
        .reduce((sum, item) => sum + Number(item.amount), 0) || 0

    const debitTotal =
      financialTransactions
        ?.filter((item) => item.payment_method === 'debit_card')
        .reduce((sum, item) => sum + Number(item.amount), 0) || 0

    const { data: closedComandas } = await supabase
      .from('comandas')
      .select('id, closed_at')
      .eq('company_id', profile.company_id)
      .eq('status', 'closed')
      .gte('closed_at', `${monthStartDate}T00:00:00`)
      .lte('closed_at', `${today}T23:59:59`)

    const closedComandaIds = (closedComandas || []).map((comanda) => comanda.id)

    const { data: comandaItems } =
      closedComandaIds.length > 0
        ? await supabase
            .from('comanda_items')
            .select('professional_id, price, quantity')
            .in('comanda_id', closedComandaIds)
            .not('professional_id', 'is', null)
        : { data: [] }

    const commissionRevenueByProfessional = new Map<string, number>()

    normalizedAppointments
      .filter(
        (appointment) =>
          appointment.status === 'completed' &&
          appointment.professional_id &&
          appointment.appointment_date >= monthStartDate &&
          appointment.appointment_date <= today
      )
      .forEach((appointment) => {
        const professionalId = appointment.professional_id
        const value = Number(appointment.price || 0)

        commissionRevenueByProfessional.set(
          professionalId,
          (commissionRevenueByProfessional.get(professionalId) || 0) + value
        )
      })

    ;(comandaItems || []).forEach((item) => {
      if (!item.professional_id) return

      const value = Number(item.price || 0) * Number(item.quantity || 1)

      commissionRevenueByProfessional.set(
        item.professional_id,
        (commissionRevenueByProfessional.get(item.professional_id) || 0) + value
      )
    })

    const normalizedCommissionRanking =
      (professionals || [])
        .map((professional) => {
          const revenue = commissionRevenueByProfessional.get(professional.id) || 0
          const percentage = Number(professional.commission_percentage || 0)
          const commission = (revenue * percentage) / 100

          return {
            professional_id: professional.id,
            professional_name: professional.name,
            commission_percentage: percentage,
            revenue,
            commission,
          }
        })
        .filter((professional) => professional.revenue > 0)
        .sort((a, b) => b.commission - a.commission)

    setCommissionRanking(normalizedCommissionRanking)

    setTotalCommission(
      normalizedCommissionRanking.reduce(
        (sum, professional) => sum + professional.commission,
        0
      )
    )

    setTotalCommissionRevenue(
      normalizedCommissionRanking.reduce(
        (sum, professional) => sum + professional.revenue,
        0
      )
    )

    setCashRevenue(cashTotal)
    setPixRevenue(pixTotal)
    setCreditRevenue(creditTotal)
    setDebitRevenue(debitTotal)

    setServicesRanking(
      Object.entries(soldServicesMap)
        .map(([service_name, total]) => ({
          service_name,
          total,
        }))
        .sort((a, b) => b.total - a.total)
    )

    setExpectedRevenue(totalExpected)
    setRealizedRevenue(totalRealized)
    setAppointmentsCount(normalizedAppointments.length)
    setCompletedCount(
      normalizedAppointments.filter((item) => item.status === 'completed').length
    )
    setCancelledCount(
      normalizedAppointments.filter((item) => item.status === 'cancelled').length
    )
  }

  const topProfessionals = useMemo(() => {
    return professionalRevenue.slice(0, 5)
  }, [professionalRevenue])

  const topServices = useMemo(() => {
    return servicesRanking.slice(0, 5)
  }, [servicesRanking])

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-4xl font-bold">Relatórios</h1>

          <p className="mt-2 text-zinc-400">
            Indicadores financeiros e operacionais.
          </p>
        </div>

        <button
          type="button"
          onClick={generatePdfReport}
          className="rounded-xl bg-white px-5 py-3 font-bold text-black transition hover:bg-zinc-200"
        >
          Gerar PDF
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        {['1', '7', '30'].map((value) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={`rounded-lg px-4 py-2 transition ${
              period === value
                ? 'bg-white text-black'
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            {value === '1' ? 'Hoje' : `${value} dias`}
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-blue-900 bg-blue-950/20 p-6 relative overflow-hidden">
        {/* Camada de bloqueio visual se for Trial */}
        {isTrial && (
          <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-zinc-900 border border-amber-500/50 p-6 rounded-2xl max-w-lg shadow-[0_0_30px_rgba(245,158,11,0.1)]">
              <h3 className="text-xl font-bold text-white mb-2">Exportação Bloqueada no Teste</h3>
              <p className="text-zinc-400 text-sm mb-6">
                A exportação de planilhas CSV é uma funcionalidade exclusiva para assinantes dos nossos planos. Faça o upgrade para organizar os seus dados no Excel ou Google Sheets.
              </p>
              <button 
                className="bg-amber-500 text-black px-6 py-2.5 rounded-lg font-bold text-sm w-full hover:bg-amber-400 transition-colors"
                onClick={() => window.location.href = '/dashboard/configuracoes'} // Ajuste o link para a sua tela de pagamento/assinatura
              >
                Fazer Upgrade Agora
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Exportar dados
            </h2>

            <p className="mt-1 text-sm text-blue-200">
              Gere backups em CSV compatíveis com Excel, Google Sheets e LibreOffice.
            </p>
          </div>

          <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-white">
            Backup manual
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <button
            type="button"
            onClick={exportClientsCsv}
            disabled={isTrial}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition ${isTrial ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-200'}`}
          >
            Exportar clientes CSV
          </button>

          <button
            type="button"
            onClick={exportServicesCsv}
            disabled={isTrial}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition ${isTrial ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-200'}`}
          >
            Exportar serviços CSV
          </button>

          <button
            type="button"
            onClick={exportProductsCsv}
            disabled={isTrial}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition ${isTrial ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-200'}`}
          >
            Exportar produtos CSV
          </button>

          <button
            type="button"
            onClick={exportFinancialCsv}
            disabled={isTrial}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition ${isTrial ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-200'}`}
          >
            Exportar financeiro CSV
          </button>

          <button
            type="button"
            onClick={exportAppointmentsCsv}
            disabled={isTrial}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition ${isTrial ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-200'}`}
          >
            Exportar agendamentos CSV
          </button>
        </div>
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
          <strong className="mt-2 block text-4xl">{appointmentsCount}</strong>
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

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-green-900 bg-green-950/30 p-6">
          <p className="text-sm text-green-300">Dinheiro</p>
          <strong className="mt-2 block text-3xl text-white">
            R$ {cashRevenue.toFixed(2)}
          </strong>
        </div>

        <div className="rounded-2xl border border-cyan-900 bg-cyan-950/30 p-6">
          <p className="text-sm text-cyan-300">Pix</p>
          <strong className="mt-2 block text-3xl text-white">
            R$ {pixRevenue.toFixed(2)}
          </strong>
        </div>

        <div className="rounded-2xl border border-blue-900 bg-blue-950/30 p-6">
          <p className="text-sm text-blue-300">Crédito</p>
          <strong className="mt-2 block text-3xl text-white">
            R$ {creditRevenue.toFixed(2)}
          </strong>
        </div>

        <div className="rounded-2xl border border-purple-900 bg-purple-950/30 p-6">
          <p className="text-sm text-purple-300">Débito</p>
          <strong className="mt-2 block text-3xl text-white">
            R$ {debitRevenue.toFixed(2)}
          </strong>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-yellow-900 bg-yellow-950/30 p-6">
          <p className="text-sm text-yellow-300">
            Faturamento comissionável no mês
          </p>

          <strong className="mt-2 block text-3xl text-white">
            R$ {totalCommissionRevenue.toFixed(2)}
          </strong>
        </div>

        <div className="rounded-2xl border border-blue-900 bg-blue-950/30 p-6">
          <p className="text-sm text-blue-300">
            Comissão total do mês
          </p>

          <strong className="mt-2 block text-3xl text-white">
            R$ {totalCommission.toFixed(2)}
          </strong>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Profissionais com comissão
          </p>

          <strong className="mt-2 block text-3xl text-white">
            {commissionRanking.length}
          </strong>
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">Relatório mensal de comissões</h2>

        <p className="mt-1 text-sm text-zinc-500">
          Soma agendamentos concluídos e itens de comandas fechadas com profissional vinculado.
        </p>

        <div className="mt-6 space-y-3">
          {commissionRanking.length === 0 && (
            <p className="rounded-xl bg-zinc-800 p-4 text-zinc-500">
              Nenhuma comissão encontrada no mês atual.
            </p>
          )}

          {commissionRanking.map((professional, index) => (
            <div
              key={professional.professional_id}
              className="grid grid-cols-1 gap-3 rounded-xl bg-zinc-800 p-4 md:grid-cols-[auto_1fr_auto_auto]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 font-bold">
                #{index + 1}
              </div>

              <div>
                <p className="font-bold">{professional.professional_name}</p>
                <p className="text-sm text-zinc-500">
                  Comissão: {professional.commission_percentage.toFixed(2)}%
                </p>
              </div>

              <div className="text-left md:text-right">
                <p className="text-sm text-zinc-500">Faturamento</p>
                <strong className="text-green-400">
                  R$ {professional.revenue.toFixed(2)}
                </strong>
              </div>

              <div className="text-left md:text-right">
                <p className="text-sm text-zinc-500">Comissão</p>
                <strong className="text-blue-400">
                  R$ {professional.commission.toFixed(2)}
                </strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">Faturamento por dia</h2>

        {chartData.length > 0 ? (
          <div className="mt-6 h-[350px] w-full overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="appointment_date" />
                <YAxis tickFormatter={(value) => `R$ ${Number(value).toFixed(0)}`} />
                <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                <Bar dataKey="previsto" name="Previsto" fill="#3b82f6" />
                <Bar dataKey="realizado" name="Realizado" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-6 text-zinc-400">Nenhum dado encontrado.</p>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">Ranking de profissionais</h2>

          <div className="mt-6 space-y-4">
            {topProfessionals.map((professional) => (
              <div
                key={professional.professional_name}
                className="flex items-center justify-between rounded-xl bg-zinc-800 p-4"
              >
                <span className="font-medium">{professional.professional_name}</span>

                <strong className="text-green-400">
                  R$ {professional.total.toFixed(2)}
                </strong>
              </div>
            ))}

            {topProfessionals.length === 0 && (
              <p className="text-zinc-400">Nenhum dado encontrado.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold">Serviços mais vendidos</h2>

          {topServices.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="h-[300px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topServices}
                      dataKey="total"
                      nameKey="service_name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={95}
                      paddingAngle={4}
                    >
                      {topServices.map((_, index) => (
                        <Cell
                          key={`service-${index}`}
                          fill={chartColors[index % chartColors.length]}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={(value, name) => [
                        `${Number(value)} venda(s)`,
                        name,
                      ]}
                    />

                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {topServices.map((service, index) => (
                  <div
                    key={service.service_name}
                    className="flex items-center justify-between rounded-xl bg-zinc-800 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            chartColors[index % chartColors.length],
                        }}
                      />

                      <span className="font-medium">{service.service_name}</span>
                    </div>

                    <strong>{service.total}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-6 text-zinc-400">Nenhum dado encontrado.</p>
          )}
        </div>
      </div>
    </div>
  )
}