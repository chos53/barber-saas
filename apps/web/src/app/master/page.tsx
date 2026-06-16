'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Company = {
  id: string
  created_at: string | null
}

type CompanySettings = {
  company_id: string
  company_name: string | null
}

type SaasPlan = {
  id: string
  name: string
  price: number
  active: boolean
  max_users: number
  max_professionals: number
  max_monthly_appointments: number
}

type CompanySubscription = {
  id: string
  company_id: string
  plan_id: string | null
  status: string
  trial_ends_at: string | null
  subscription_starts_at: string | null
  subscription_ends_at: string | null
  blocked_at: string | null
  created_at: string | null
  saas_plans?: SaasPlan | null
}

type CompanyMetrics = {
  users: number
  clients: number
  appointments: number
  professionals: number
  revenue: number
}

type CompanyRow = {
  id: string
  name: string
  created_at: string | null
  subscription: CompanySubscription | null
  metrics: CompanyMetrics
}

const masterEmails = ['caheolsa@yahoo.com.br']

export default function MasterPage() {
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [plans, setPlans] = useState<SaasPlan[]>([])
  const [subscriptions, setSubscriptions] = useState<CompanySubscription[]>([])
  const [currentEmail, setCurrentEmail] = useState('')
  const [savingCompanyId, setSavingCompanyId] = useState('')
  const [search, setSearch] = useState('')
  
  // Controle de Abas do Dashboard Reorganizado
  const [activeTab, setActiveTab] = useState<'companies' | 'plans' | 'metrics'>('companies')

  // States para Nova Empresa
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newOwnerEmail, setNewOwnerEmail] = useState('')
  const [newCompanyPlanId, setNewCompanyPlanId] = useState('')
  const [newCompanyTrialDays, setNewCompanyTrialDays] = useState('14')
  const [creatingCompany, setCreatingCompany] = useState(false)

  // States para Novo Plano
  const [newPlanName, setNewPlanName] = useState('')
  const [newPlanPrice, setNewPlanPrice] = useState('')
  const [newPlanMaxUsers, setNewPlanMaxUsers] = useState('1')
  const [newPlanMaxProfessionals, setNewPlanMaxProfessionals] = useState('3')
  const [newPlanMaxAppointments, setNewPlanMaxAppointments] = useState('100')
  const [creatingPlan, setCreatingPlan] = useState(false)

  // States para Edição de Plano Existente
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [editPlanName, setEditPlanName] = useState('')
  const [editPlanPrice, setEditPlanPrice] = useState('')
  const [editPlanMaxUsers, setEditPlanMaxUsers] = useState('1')
  const [editPlanMaxProfessionals, setEditPlanMaxProfessionals] = useState('3')
  const [editPlanMaxAppointments, setEditPlanMaxAppointments] = useState('100')
  const [savingPlan, setSavingPlan] = useState(false)

  useEffect(() => {
    loadMasterData()
  }, [])

  const activeSubscriptions = useMemo(() => {
    return subscriptions.filter((subscription) => subscription.status === 'active')
  }, [subscriptions])

  const trialSubscriptions = useMemo(() => {
    return subscriptions.filter((subscription) => subscription.status === 'trial')
  }, [subscriptions])

  const suspendedSubscriptions = useMemo(() => {
    return subscriptions.filter((subscription) => subscription.status === 'suspended')
  }, [subscriptions])

  const cancelledSubscriptions = useMemo(() => {
    return subscriptions.filter((subscription) => subscription.status === 'cancelled')
  }, [subscriptions])

  const estimatedMrr = useMemo(() => {
    return activeSubscriptions.reduce((sum, subscription) => {
      return sum + Number(subscription.saas_plans?.price || 0)
    }, 0)
  }, [activeSubscriptions])

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    if (!normalizedSearch) return companies

    return companies.filter((company) => {
      return (
        company.name.toLowerCase().includes(normalizedSearch) ||
        company.id.toLowerCase().includes(normalizedSearch) ||
        String(company.subscription?.saas_plans?.name || '').toLowerCase().includes(normalizedSearch) ||
        String(company.subscription?.status || '').toLowerCase().includes(normalizedSearch)
      )
    })
  }, [companies, search])

  const totalUsers = useMemo(() => {
    return companies.reduce((sum, company) => sum + company.metrics.users, 0)
  }, [companies])

  const totalClients = useMemo(() => {
    return companies.reduce((sum, company) => sum + company.metrics.clients, 0)
  }, [companies])

  const totalAppointments = useMemo(() => {
    return companies.reduce((sum, company) => sum + company.metrics.appointments, 0)
  }, [companies])

  const planDistribution = useMemo(() => {
    const distribution: { [key: string]: number } = {}
    companies.forEach((c) => {
      const pId = c.subscription?.plan_id
      if (pId) {
        distribution[pId] = (distribution[pId] || 0) + 1
      }
    })
    return distribution
  }, [companies])

  async function loadMasterData() {
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const userEmail = user?.email?.toLowerCase() || ''
      setCurrentEmail(userEmail)

      if (!user || !masterEmails.includes(userEmail)) {
        window.location.href = '/dashboard'
        return
      }

      const [
        companiesResult,
        companySettingsResult,
        subscriptionsResult,
        plansResult,
        profilesResult,
        clientsResult,
        appointmentsResult,
        professionalsResult,
        financialResult,
      ] = await Promise.all([
        supabase
          .from('companies')
          .select('id, created_at')
          .order('created_at', { ascending: false }),

        supabase
          .from('company_settings')
          .select('company_id, company_name'),

        supabase
          .from('company_subscriptions')
          .select(`
            id,
            company_id,
            plan_id,
            status,
            trial_ends_at,
            subscription_starts_at,
            subscription_ends_at,
            blocked_at,
            created_at,
            saas_plans (
              id,
              name,
              price,
              active,
              max_users,
              max_professionals,
              max_monthly_appointments
            )
          `)
          .order('created_at', { ascending: false }),

        supabase
          .from('saas_plans')
          .select('id, name, price, active, max_users, max_professionals, max_monthly_appointments')
          .order('price', { ascending: true }),

        supabase
          .from('profiles')
          .select('company_id'),

        supabase
          .from('clients')
          .select('company_id'),

        supabase
          .from('appointments')
          .select('company_id'),

        supabase
          .from('professionals')
          .select('company_id'),

        supabase
          .from('financial_transactions')
          .select('company_id, type, amount, status'),
      ])

      if (companiesResult.error) throw companiesResult.error
      if (subscriptionsResult.error) throw subscriptionsResult.error

      const loadedCompanies = (companiesResult.data || []) as Company[]
      const loadedSettings = (companySettingsResult.data || []) as CompanySettings[]
      const loadedSubscriptions = (subscriptionsResult.data || []) as CompanySubscription[]
      const loadedPlans = (plansResult.data || []) as SaasPlan[]
      const loadedProfiles = (profilesResult.data || []) as Array<{ company_id: string | null }>
      const loadedClients = (clientsResult.data || []) as Array<{ company_id: string | null }>
      const loadedAppointments = (appointmentsResult.data || []) as Array<{ company_id: string | null }>
      const loadedProfessionals = (professionalsResult.data || []) as Array<{ company_id: string | null }>
      const loadedFinancialTransactions = (financialResult.data || []) as Array<{
        company_id: string | null
        type: string | null
        amount: number | null
        status: string | null
      }>

      const settingsByCompany = new Map<string, CompanySettings>()
      const subscriptionByCompany = new Map<string, CompanySubscription>()

      loadedSettings.forEach((setting) => {
        settingsByCompany.set(setting.company_id, setting)
      })

      loadedSubscriptions.forEach((subscription) => {
        subscriptionByCompany.set(subscription.company_id, subscription)
      })

      function countByCompany(items: Array<{ company_id: string | null }>) {
        const map = new Map<string, number>()
        items.forEach((item) => {
          if (!item.company_id) return
          map.set(item.company_id, (map.get(item.company_id) || 0) + 1)
        })
        return map
      }

      const usersByCompany = countByCompany(loadedProfiles)
      const clientsByCompany = countByCompany(loadedClients)
      const appointmentsByCompany = countByCompany(loadedAppointments)
      const professionalsByCompany = countByCompany(loadedProfessionals)
      const revenueByCompany = new Map<string, number>()

      loadedFinancialTransactions.forEach((transaction) => {
        if (!transaction.company_id) return
        if (transaction.type !== 'income') return
        if (transaction.status === 'cancelled') return

        revenueByCompany.set(
          transaction.company_id,
          (revenueByCompany.get(transaction.company_id) || 0) + Number(transaction.amount || 0)
        )
      })

      const rows: CompanyRow[] = loadedCompanies.map((company) => {
        return {
          id: company.id,
          created_at: company.created_at,
          name:
            settingsByCompany.get(company.id)?.company_name ||
            `Empresa ${company.id.slice(0, 8)}`,
          subscription: subscriptionByCompany.get(company.id) || null,
          metrics: {
            users: usersByCompany.get(company.id) || 0,
            clients: clientsByCompany.get(company.id) || 0,
            appointments: appointmentsByCompany.get(company.id) || 0,
            professionals: professionalsByCompany.get(company.id) || 0,
            revenue: revenueByCompany.get(company.id) || 0,
          },
        }
      })

      setCompanies(rows)
      setSubscriptions(loadedSubscriptions)
      setPlans(loadedPlans)
    } catch (err: any) {
      console.error('Erro ao carregar dados do painel master:', err)
      alert(`Erro no carregamento: ${err.message || err}`)
    } finally {
      setLoading(false)
    }
  }

  async function createCompanyFromMaster() {
    const companyName = newCompanyName.trim()
    const ownerEmail = newOwnerEmail.trim().toLowerCase()
    const trialDays = Number(newCompanyTrialDays || 14)

    if (!companyName) {
      alert('Digite o nome da empresa.')
      return
    }
    if (!ownerEmail) {
      alert('Digite o email do proprietário.')
      return
    }
    if (!newCompanyPlanId) {
      alert('Selecione um plano.')
      return
    }
    if (!Number.isFinite(trialDays) || trialDays < 0) {
      alert('Digite uma quantidade válida de dias de trial.')
      return
    }

    setCreatingCompany(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Sessão master não encontrada. Faça login novamente.')
        return
      }

      const response = await fetch('/api/master/create-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          ownerEmail,
          planId: newCompanyPlanId,
          trialDays,
          masterUserId: user.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro desconhecido ao processar criação.')
      }

      setNewCompanyName('')
      setNewOwnerEmail('')
      setNewCompanyPlanId('')
      setNewCompanyTrialDays('14')

      if (data.action_link) {
        try {
          await navigator.clipboard.writeText(data.action_link)
        } catch (clipErr) {
          console.warn('Bloqueio de cópia automática pelo navegador.')
        }
        
        // Caixa de texto nativa selecionada para garantir a cópia em qualquer navegador
        window.prompt(
          'Empresa criada com sucesso e integrada ao Asaas!\n\nSe o link não foi para a sua área de transferência automaticamente, copie-o manualmente abaixo (Ctrl+C):',
          data.action_link
        )
      } else {
        alert('Empresa criada com sucesso e integrada ao Asaas, mas o link de convite não pôde ser gerado (e-mail possivelmente já cadastrado no Auth).')
      }

      await loadMasterData()
    } catch (err: any) {
      alert(`Falha na criação da empresa: ${err.message}`)
    } finally {
      setCreatingCompany(false)
    }
  }

  async function createPlan() {
    if (!newPlanName.trim()) {
      alert('Digite o nome do plano.')
      return
    }
    if (Number(newPlanPrice) < 0 || newPlanPrice === '') {
      alert('Digite um valor válido para o preço.')
      return
    }

    setCreatingPlan(true)

    const { error } = await supabase.from('saas_plans').insert({
      name: newPlanName.trim(),
      price: Number(newPlanPrice),
      max_users: Number(newPlanMaxUsers),
      max_professionals: Number(newPlanMaxProfessionals),
      max_monthly_appointments: Number(newPlanMaxAppointments),
      active: true,
    })

    if (error) {
      alert(`Erro ao criar plano: ${error.message}`)
      setCreatingPlan(false)
      return
    }

    setNewPlanName('')
    setNewPlanPrice('')
    setNewPlanMaxUsers('1')
    setNewPlanMaxProfessionals('3')
    setNewPlanMaxAppointments('100')
    setCreatingPlan(false)

    alert('Plano criado com sucesso!')
    await loadMasterData()
  }

  function startEditingPlan(plan: SaasPlan) {
    setEditingPlanId(plan.id)
    setEditPlanName(plan.name)
    setEditPlanPrice(String(plan.price))
    setEditPlanMaxUsers(String(plan.max_users))
    setEditPlanMaxProfessionals(String(plan.max_professionals))
    setEditPlanMaxAppointments(String(plan.max_monthly_appointments))
  }

  async function savePlanEdits() {
    if (!editingPlanId) return

    if (!editPlanName.trim()) {
      alert('Digite o nome do plano.')
      return
    }
    if (Number(editPlanPrice) < 0 || editPlanPrice === '') {
      alert('Digite um preço válido.')
      return
    }

    setSavingPlan(true)

    const { data, error } = await supabase
      .from('saas_plans')
      .update({
        name: editPlanName.trim(),
        price: Number(editPlanPrice),
        max_users: Number(editPlanMaxUsers),
        max_professionals: Number(editPlanMaxProfessionals),
        max_monthly_appointments: Number(editPlanMaxAppointments),
      })
      .eq('id', editingPlanId)
      .select()

    setSavingPlan(false)

    if (error) {
      alert(`Erro ao atualizar plano: ${error.message}`)
      return
    }

    setPlans((prevPlans) =>
      prevPlans.map((p) =>
        p.id === editingPlanId
          ? {
              ...p,
              name: editPlanName.trim(),
              price: Number(editPlanPrice),
              max_users: Number(editPlanMaxUsers),
              max_professionals: Number(editPlanMaxProfessionals),
              max_monthly_appointments: Number(editPlanMaxAppointments),
            }
          : p
      )
    )

    setEditingPlanId(null)
    alert('Plano updated com sucesso!')
    await loadMasterData()
  }

  async function togglePlanStatus(plan: SaasPlan) {
    const nextActiveState = !plan.active

    const { error } = await supabase
      .from('saas_plans')
      .update({ active: nextActiveState })
      .eq('id', plan.id)

    if (error) {
      alert(`Erro ao alternar status do plano: ${error.message}`)
      return
    }

    setPlans((prevPlans) =>
      prevPlans.map((p) => (p.id === plan.id ? { ...p, active: nextActiveState } : p))
    )
  }

  async function deletePlan(planId: string) {
    const isPlanInUse = subscriptions.some((sub) => sub.plan_id === planId)
    if (isPlanInUse) {
      alert('Não é possível excluir este plano porque existem empresas vinculadas a ele. Se deseja desativá-lo para novos cadastros, utilize a função "Inativar".')
      return
    }

    if (!confirm('Tem certeza absoluta que deseja excluir este plano? Esta ação não pode ser desfeita.')) {
      return
    }

    const { error } = await supabase
      .from('saas_plans')
      .delete()
      .eq('id', planId)

    if (error) {
      alert(`Erro ao excluir plano: ${error.message}`)
      return
    }

    setPlans((prevPlans) => prevPlans.filter((p) => p.id !== planId))
    alert('Plano excluído com sucesso!')
  }

  function getDateInputValue(value: string | null | undefined) {
    if (!value) return ''
    return value.split('T')[0]
  }

  async function saveCompanySubscription(
    company: CompanyRow,
    nextPlanId: string,
    nextStatus: string,
    nextTrialEndsAt: string,
    nextSubscriptionEndsAt: string
  ) {
    if (!nextPlanId) {
      alert('Selecione um plano.')
      return
    }
    if (!nextStatus) {
      alert('Selecione um status.')
      return
    }

    setSavingCompanyId(company.id)

    const { error } = await supabase
      .from('company_subscriptions')
      .upsert(
        {
          company_id: company.id,
          plan_id: nextPlanId,
          status: nextStatus,
          trial_ends_at: nextTrialEndsAt ? `${nextTrialEndsAt}T23:59:59` : null,
          subscription_starts_at:
            company.subscription?.subscription_starts_at || new Date().toISOString(),
          subscription_ends_at: nextSubscriptionEndsAt
            ? `${nextSubscriptionEndsAt}T23:59:59`
            : null,
          blocked_at:
            nextStatus === 'suspended'
              ? company.subscription?.blocked_at || new Date().toISOString()
              : null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'company_id',
        }
      )

    setSavingCompanyId('')

    if (error) {
      alert(`Erro ao salvar assinatura: ${error.message}`)
      return
    }

    await loadMasterData()
  }

  async function updateCompanyStatus(company: CompanyRow, nextStatus: string) {
    if (!company.subscription?.plan_id) {
      alert('Esta empresa ainda não tem plano definido.')
      return
    }

    await saveCompanySubscription(
      company,
      company.subscription.plan_id,
      nextStatus,
      getDateInputValue(company.subscription.trial_ends_at),
      getDateInputValue(company.subscription.subscription_ends_at)
    )
  }

  async function resendInvite(company: CompanyRow) {
    const ownerEmail = prompt(
      `Digite o email do proprietário da empresa "${company.name}":`
    )

    if (!ownerEmail?.trim()) {
      return
    }
  
    const { data, error } = await supabase.functions.invoke(
      'create-company-owner',
      {
        body: {
          companyId: company.id,
          companyName: company.name,
          ownerEmail: ownerEmail.trim().toLowerCase(),
        },
      }
    )
  
    if (error) {
      alert(`Erro ao gerar convite: ${error.message || 'E-mail possivelmente já existente no sistema Auth.'}`)
      return
    }
  
    if (data?.action_link) {
      try {
        await navigator.clipboard.writeText(data.action_link)
      } catch (err) {}

      window.prompt(
        'Novo convite gerado!\n\nSe não copiou automaticamente, copie o link abaixo manualmente (Ctrl+C):',
        data.action_link
      )
      return
    }
  
    alert('Aviso: O convite não pôde ser gerado. Certifique-se de que este e-mail não pertence a um administrador ou usuário já ativo no sistema.')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  function formatDate(value: string | null) {
    if (!value) return '-'
    const date = new Date(value)
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR')
  }

  function getStatusLabel(status: string | null | undefined) {
    if (status === 'active') return 'Ativa'
    if (status === 'trial') return 'Trial'
    if (status === 'suspended') return 'Suspensa'
    if (status === 'cancelled') return 'Cancelada'
    return 'Sem assinatura'
  }

  function getStatusClass(status: string | null | undefined) {
    if (status === 'active') return 'bg-green-500 text-black'
    if (status === 'trial') return 'bg-blue-500 text-white'
    if (status === 'suspended') return 'bg-yellow-500 text-black'
    if (status === 'cancelled') return 'bg-red-500 text-white'
    return 'bg-zinc-700 text-zinc-300'
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-8 py-6">
          <p className="text-zinc-400">Carregando Dashboard Master Avançado...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">Barber SaaS</p>
            <h1 className="mt-2 text-4xl font-bold">Dashboard Master</h1>
            <p className="mt-2 text-zinc-400">Gestão centralizada e automação de faturamento do ecossistema.</p>
            <p className="mt-1 text-xs text-zinc-600">Acesso mestre: {currentEmail}</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadMasterData}
              className="rounded-xl bg-zinc-800 px-5 py-3 font-bold text-white transition hover:bg-zinc-700"
            >
              Atualizar
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-white px-5 py-3 font-bold text-black transition hover:bg-zinc-200"
            >
              Sair
            </button>
          </div>
        </header>

        {/* KPIs Globais */}
        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-blue-900 bg-blue-950/30 p-5">
            <p className="text-sm text-blue-300">Empresas</p>
            <strong className="mt-2 block text-4xl">{companies.length}</strong>
          </div>
          <div className="rounded-2xl border border-green-900 bg-green-950/30 p-5">
            <p className="text-sm text-green-300">Ativas</p>
            <strong className="mt-2 block text-4xl">{activeSubscriptions.length}</strong>
          </div>
          <div className="rounded-2xl border border-cyan-900 bg-cyan-950/30 p-5">
            <p className="text-sm text-cyan-300">Trial</p>
            <strong className="mt-2 block text-4xl">{trialSubscriptions.length}</strong>
          </div>
          <div className="rounded-2xl border border-yellow-900 bg-yellow-950/30 p-5">
            <p className="text-sm text-yellow-300">Suspensas</p>
            <strong className="mt-2 block text-4xl">{suspendedSubscriptions.length}</strong>
          </div>
          <div className="rounded-2xl border border-purple-900 bg-purple-950/30 p-5">
            <p className="text-sm text-purple-300">MRR Estimado</p>
            <strong className="mt-2 block text-3xl">{formatCurrency(estimatedMrr)}</strong>
          </div>
        </section>

        {/* Tabs de Navegação */}
        <div className="mt-8 flex gap-2 border-b border-zinc-800 pb-px">
          <button
            type="button"
            onClick={() => setActiveTab('companies')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition outline-none ${
              activeTab === 'companies' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Empresas e Assinaturas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('plans')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition outline-none ${
              activeTab === 'plans' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Configurar Planos SaaS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition outline-none ${
              activeTab === 'metrics' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Métricas Avançadas
          </button>
        </div>

        {/* ABA 1: EMPRESAS E ASSINATURAS */}
        {activeTab === 'companies' && (
          <div className="mt-6 space-y-6">
            <section className="rounded-2xl border border-blue-900 bg-blue-950/20 p-6">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <h2 className="text-2xl font-bold">Nova empresa</h2>
                  <p className="mt-1 text-sm text-blue-100">
                    Provisiona a empresa no banco de dados local e cria automaticamente os contratos de assinatura recorrente no Asaas Gateway.
                  </p>
                </div>
                <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-white">Asaas Active</span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_1fr_0.7fr_auto]">
                <input
                  placeholder="Nome da empresa"
                  className="rounded-xl border border-zinc-800 bg-black p-3 text-white outline-none"
                  value={newCompanyName}
                  onChange={(event) => setNewCompanyName(event.target.value)}
                />
                <input
                  type="email"
                  placeholder="Email do proprietário"
                  className="rounded-xl border border-zinc-800 bg-black p-3 text-white outline-none"
                  value={newOwnerEmail}
                  onChange={(event) => setNewOwnerEmail(event.target.value)}
                />
                <select
                  value={newCompanyPlanId}
                  onChange={(event) => setNewCompanyPlanId(event.target.value)}
                  className="rounded-xl border border-zinc-800 bg-black p-3 text-white outline-none"
                >
                  <option value="">Selecione o plano</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} — {formatCurrency(Number(plan.price || 0))}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  placeholder="Dias de Trial"
                  className="rounded-xl border border-zinc-800 bg-black p-3 text-white outline-none"
                  value={newCompanyTrialDays}
                  onChange={(event) => setNewCompanyTrialDays(event.target.value)}
                />
                <button
                  type="button"
                  disabled={creatingCompany}
                  onClick={createCompanyFromMaster}
                  className="rounded-xl bg-white px-5 py-3 font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
                >
                  {creatingCompany ? 'Processando...' : 'Criar empresa'}
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <h2 className="text-2xl font-bold">Empresas Cadastradas</h2>
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300">
                  {cancelledSubscriptions.length} cancelada(s)
                </span>
              </div>

              <div className="mt-5">
                <input
                  placeholder="Pesquisar por empresa, plano, status ou identificador ID..."
                  className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-white outline-none"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500">
                      <th className="py-3 pr-4">Empresa</th>
                      <th className="py-3 pr-4">Métricas de Uso</th>
                      <th className="py-3 pr-4">Plano Atual</th>
                      <th className="py-3 pr-4">Status Licença</th>
                      <th className="py-3 pr-4">Trial Válido Até</th>
                      <th className="py-3 pr-4">Data Vencimento</th>
                      <th className="py-3 pr-4">Ações Base</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map((company) => (
                      <tr key={company.id} className="border-b border-zinc-800">
                        <td className="py-4 pr-4">
                          <strong className="block text-white">{company.name}</strong>
                          <span className="text-xs text-zinc-600">{company.id}</span>
                        </td>
                        <td className="py-4 pr-4 text-zinc-300">
                          <div className="grid gap-1 text-xs text-zinc-400">
                            <span>Usuários: <strong className="text-white">{company.metrics.users}</strong></span>
                            <span>Clientes: <strong className="text-white">{company.metrics.clients}</strong></span>
                            <span>Agendamentos: <strong className="text-white">{company.metrics.appointments}</strong></span>
                            <span>Profissionais: <strong className="text-white">{company.metrics.professionals}</strong></span>
                            <span>Receita: <strong className="text-green-300">{formatCurrency(company.metrics.revenue)}</strong></span>
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-zinc-300">
                          <select
                            defaultValue={company.subscription?.plan_id || ''}
                            id={`plan-${company.id}`}
                            className="w-full rounded-lg border border-zinc-800 bg-black p-2 text-sm text-white outline-none"
                          >
                            <option value="">Selecione</option>
                            {plans.map((plan) => (
                              <option key={plan.id} value={plan.id}>{plan.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-4 pr-4">
                          <select
                            defaultValue={company.subscription?.status || 'trial'}
                            id={`status-${company.id}`}
                            className="w-full rounded-lg border border-zinc-800 bg-black p-2 text-sm text-white outline-none"
                          >
                            <option value="trial">Trial</option>
                            <option value="active">Ativa</option>
                            <option value="suspended">Suspensa</option>
                            <option value="cancelled">Cancelada</option>
                          </select>
                          <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(company.subscription?.status)}`}>
                            {getStatusLabel(company.subscription?.status)}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-zinc-400">
                          <input
                            type="date"
                            defaultValue={getDateInputValue(company.subscription?.trial_ends_at)}
                            id={`trial-${company.id}`}
                            className="w-full rounded-lg border border-zinc-800 bg-black p-2 text-sm text-white outline-none"
                          />
                        </td>
                        <td className="py-4 pr-4 text-zinc-400">
                          <input
                            type="date"
                            defaultValue={getDateInputValue(company.subscription?.subscription_ends_at)}
                            id={`ends-${company.id}`}
                            className="w-full rounded-lg border border-zinc-800 bg-black p-2 text-sm text-white outline-none"
                          />
                        </td>
                        <td className="py-4 pr-4 text-zinc-400">
                          <div className="space-y-2">
                            <p className="text-xs text-zinc-500">Criada em {formatDate(company.created_at)}</p>
                            <button
                              type="button"
                              disabled={savingCompanyId === company.id}
                              onClick={() => {
                                const planInput = document.getElementById(`plan-${company.id}`) as HTMLSelectElement | null
                                const statusInput = document.getElementById(`status-${company.id}`) as HTMLSelectElement | null
                                const trialInput = document.getElementById(`trial-${company.id}`) as HTMLInputElement | null
                                const endsInput = document.getElementById(`ends-${company.id}`) as HTMLInputElement | null

                                saveCompanySubscription(
                                  company,
                                  planInput?.value || '',
                                  statusInput?.value || 'trial',
                                  trialInput?.value || '',
                                  endsInput?.value || ''
                                )
                              }}
                              className="w-full rounded-lg bg-white px-3 py-2 text-xs font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
                            >
                              {savingCompanyId === company.id ? 'Salvando...' : 'Salvar'}
                            </button>
                            <button
                              type="button"
                              disabled={savingCompanyId === company.id}
                              onClick={() => updateCompanyStatus(company, 'active')}
                              className="w-full rounded-lg bg-green-500 px-3 py-2 text-xs font-bold text-black transition hover:bg-green-400 disabled:opacity-50"
                            >
                              Ativar
                            </button>
                            <button
                              type="button"
                              onClick={() => resendInvite(company)}
                              className="w-full rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-black transition hover:bg-cyan-400"
                            >
                              Reenviar convite
                            </button>
                            <button
                              type="button"
                              disabled={savingCompanyId === company.id}
                              onClick={() => updateCompanyStatus(company, 'suspended')}
                              className="w-full rounded-lg bg-yellow-500 px-3 py-2 text-xs font-bold text-black transition hover:bg-yellow-400 disabled:opacity-50"
                            >
                              Suspender
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredCompanies.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-500">Nenhuma empresa encontrada na pesquisa.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ABA 2: CONFIGURAÇÃO DE PLANOS */}
        {activeTab === 'plans' && (
          <div className="mt-6">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
                <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 h-fit">
                  <h3 className="mb-3 text-sm font-bold text-zinc-300">Criar Novo Plano</h3>
                  <div className="grid gap-3">
                    <input
                      type="text"
                      placeholder="Nome do Plano"
                      value={newPlanName}
                      onChange={(e) => setNewPlanName(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-black p-2 text-sm text-white outline-none"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Preço Mensal (R$)"
                      value={newPlanPrice}
                      onChange={(e) => setNewPlanPrice(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-black p-2 text-sm text-white outline-none"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-zinc-400">Usuários</label>
                        <input
                          type="number"
                          min={1}
                          value={newPlanMaxUsers}
                          onChange={(e) => setNewPlanMaxUsers(e.target.value)}
                          className="w-full rounded-lg border border-zinc-700 bg-black p-2 text-sm text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-zinc-400">Profissionais</label>
                        <input
                          type="number"
                          min={1}
                          value={newPlanMaxProfessionals}
                          onChange={(e) => setNewPlanMaxProfessionals(e.target.value)}
                          className="w-full rounded-lg border border-zinc-700 bg-black p-2 text-sm text-white outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-zinc-400">Agendamentos/Mês (0 = Ilimitado)</label>
                      <input
                        type="number"
                        min={0}
                        value={newPlanMaxAppointments}
                        onChange={(e) => setNewPlanMaxAppointments(e.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-black p-2 text-sm text-white outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={creatingPlan}
                      onClick={createPlan}
                      className="mt-1 w-full rounded-lg bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
                    >
                      {creatingPlan ? 'Criando...' : 'Criar Plano'}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 content-start">
                  {plans.map((plan) => (
                    <div key={plan.id} className="rounded-xl border border-zinc-800 bg-black/30 p-4 h-fit flex flex-col justify-between min-h-[240px]">
                      {editingPlanId === plan.id ? (
                        <div className="space-y-2 w-full">
                          <input type="text" value={editPlanName} onChange={(e) => setEditPlanName(e.target.value)} className="w-full rounded border border-zinc-700 bg-black p-1 text-xs text-white outline-none" />
                          <input type="number" min={0} value={editPlanPrice} onChange={(e) => setEditPlanPrice(e.target.value)} className="w-full rounded border border-zinc-700 bg-black p-1 text-xs text-white outline-none" />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-zinc-500 block">Usuários</label>
                              <input type="number" min={1} value={editPlanMaxUsers} onChange={(e) => setEditPlanMaxUsers(e.target.value)} className="w-full rounded border border-zinc-700 bg-black p-1 text-xs text-white outline-none" />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-500 block">Profissionais</label>
                              <input type="number" min={1} value={editPlanMaxProfessionals} onChange={(e) => setEditPlanMaxProfessionals(e.target.value)} className="w-full rounded border border-zinc-700 bg-black p-1 text-xs text-white outline-none" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-500 block">Agendamentos/Mês</label>
                            <input type="number" min={0} value={editPlanMaxAppointments} onChange={(e) => setEditPlanMaxAppointments(e.target.value)} className="w-full rounded border border-zinc-700 bg-black p-1 text-xs text-white outline-none" />
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button type="button" disabled={savingPlan} onClick={savePlanEdits} className="flex-1 rounded bg-green-600 px-2 py-1 text-xs font-bold text-white transition hover:bg-green-500">{savingPlan ? 'Salvando...' : 'Salvar'}</button>
                            <button type="button" onClick={() => setEditingPlanId(null)} className="flex-1 rounded bg-zinc-700 px-2 py-1 text-xs font-bold text-zinc-300">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <div className="flex items-center justify-between gap-3">
                              <strong>{plan.name}</strong>
                              <span className={`rounded-full px-2 py-1 text-xs font-bold ${plan.active ? 'bg-green-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>{plan.active ? 'Ativo' : 'Inativo'}</span>
                            </div>
                            <p className="mt-2 text-2xl font-bold text-green-400">{formatCurrency(Number(plan.price || 0))}</p>
                            <p className="mt-2 text-sm text-zinc-500">Usuários: {plan.max_users} · Profissionais: {plan.max_professionals}</p>
                            <p className="mt-1 text-sm text-zinc-500">Agendamentos/mês: {plan.max_monthly_appointments === 0 ? 'Ilimitado' : plan.max_monthly_appointments}</p>
                          </div>
                          <div className="mt-4 space-y-2">
                            <div className="flex gap-2">
                              <button type="button" onClick={() => startEditingPlan(plan)} className="flex-1 rounded-lg bg-zinc-800 py-1.5 text-xs font-bold text-white transition hover:bg-zinc-700">Editar</button>
                              <button type="button" onClick={() => togglePlanStatus(plan)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${plan.active ? 'bg-zinc-800 text-red-400 hover:bg-zinc-700' : 'bg-green-600 text-white hover:bg-green-500'}`}>{plan.active ? 'Inativar' : 'Ativar'}</button>
                            </div>
                            <button type="button" onClick={() => deletePlan(plan.id)} className="w-full rounded-lg bg-red-950/40 text-red-400 border border-red-900/40 py-1 text-xs font-bold transition hover:bg-red-900 hover:text-white">Excluir Plano</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ABA 3: MÉTRICAS AVANÇADAS */}
        {activeTab === 'metrics' && (
          <div className="mt-6 space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm text-zinc-400">Usuários totais integrados</p>
                <strong className="mt-2 block text-3xl">{totalUsers}</strong>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm text-zinc-400">Clientes finais indexados</p>
                <strong className="mt-2 block text-3xl">{totalClients}</strong>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-sm text-zinc-400">Agendamentos operados</p>
                <strong className="mt-2 block text-3xl">{totalAppointments}</strong>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-xl font-bold mb-2">Distribuição de Empresas por Plano</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-5">
                {plans.map((plan) => {
                  const count = planDistribution[plan.id] || 0
                  const percentage = companies.length > 0 ? ((count / companies.length) * 100).toFixed(1) : '0.0'
                  return (
                    <div key={plan.id} className="rounded-xl border border-zinc-800 bg-black/40 p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">{plan.name}</span>
                        <strong className="block text-3xl mt-1 font-bold text-white">{count} <span className="text-sm font-normal text-zinc-400">empresa(s)</span></strong>
                      </div>
                      <div className="mt-4">
                        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="text-xs text-zinc-400 mt-1 block text-right">{percentage}% do SaaS</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}