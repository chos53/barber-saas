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
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newOwnerEmail, setNewOwnerEmail] = useState('')
  const [newCompanyPlanId, setNewCompanyPlanId] = useState('')
  const [newCompanyTrialDays, setNewCompanyTrialDays] = useState('14')
  const [creatingCompany, setCreatingCompany] = useState(false)

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

  async function loadMasterData() {
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

    if (companiesResult.error) {
      alert(`Erro ao carregar empresas: ${companiesResult.error.message}`)
    }

    if (subscriptionsResult.error) {
      alert(`Erro ao carregar assinaturas: ${subscriptionsResult.error.message}`)
    }

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
    setLoading(false)
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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setCreatingCompany(false)
      alert('Usuário master não encontrado. Faça login novamente.')
      return
    }

    const companySlug = companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName,
        slug: `${companySlug}-${Date.now()}`,
        owner_id: user?.id,
      })
      .select('id')
      .single()

    if (companyError || !company?.id) {
      setCreatingCompany(false)
      alert(`Erro ao criar empresa: ${companyError?.message || 'empresa não criada'}`)
      return
    }

    const { error: settingsError } = await supabase
      .from('company_settings')
      .insert({
        company_id: company.id,
        company_name: companyName,
        opening_time: '08:00',
        closing_time: '20:00',
        interval_minutes: 30,
      })

    if (settingsError) {
      setCreatingCompany(false)
      alert(`Empresa criada, mas houve erro ao criar configurações: ${settingsError.message}`)
      return
    }

    const now = new Date()
    const trialEndDate = new Date(now)

    trialEndDate.setDate(trialEndDate.getDate() + trialDays)

    const { error: subscriptionError } = await supabase
      .from('company_subscriptions')
      .insert({
        company_id: company.id,
        plan_id: newCompanyPlanId,
        status: trialDays > 0 ? 'trial' : 'active',
        trial_ends_at: trialDays > 0 ? trialEndDate.toISOString() : null,
        subscription_starts_at: now.toISOString(),
        subscription_ends_at: trialDays > 0 ? trialEndDate.toISOString() : null,
      })

    if (subscriptionError) {
      setCreatingCompany(false)
      alert(`Empresa criada, mas houve erro ao criar assinatura: ${subscriptionError.message}`)
      return
    }
    const { data: ownerData, error: ownerError } =
      await supabase.functions.invoke('create-company-owner', {
        body: {
          companyId: company.id,
          companyName,
          ownerEmail,
        },
      })
    
    if (ownerError) {
      setCreatingCompany(false)
    
      alert(
        `Empresa criada, mas houve erro ao criar o proprietário: ${ownerError.message}`
      )
    
      return
    }
    setNewCompanyName('')
    setNewOwnerEmail('')
    setNewCompanyPlanId('')
    setNewCompanyTrialDays('14')
    setCreatingCompany(false)

    if (ownerData?.action_link) {
      await navigator.clipboard.writeText(ownerData.action_link)

      alert(
        `Empresa criada com sucesso!\n\nLink de convite copiado para a área de transferência:\n\n${ownerData.action_link}`
      )
    } else {
      alert(
        'Empresa criada com sucesso, mas o link de convite não foi retornado.'
      )
    }

    await loadMasterData()
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

    return new Date(value).toLocaleDateString('pt-BR')
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
          <p className="text-zinc-400">Carregando Dashboard Master...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
              Barber SaaS
            </p>

            <h1 className="mt-2 text-4xl font-bold">
              Dashboard Master
            </h1>

            <p className="mt-2 text-zinc-400">
              Gestão central das empresas, planos e assinaturas do SaaS.
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              Acesso master: {currentEmail}
            </p>
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

        <section className="mt-8 rounded-2xl border border-blue-900 bg-blue-950/20 p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <h2 className="text-2xl font-bold">Nova empresa</h2>

              <p className="mt-1 text-sm text-blue-100">
                Crie a empresa, as configurações iniciais e a assinatura. O usuário proprietário será criado por convite seguro no próximo passo.
              </p>
            </div>

            <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-white">
              SaaS
            </span>
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
              placeholder="Trial"
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
              {creatingCompany ? 'Criando...' : 'Criar empresa'}
            </button>
          </div>
        </section>

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
            <p className="text-sm text-purple-300">MRR estimado</p>
            <strong className="mt-2 block text-3xl">{formatCurrency(estimatedMrr)}</strong>
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">Usuários cadastrados</p>
            <strong className="mt-2 block text-3xl">{totalUsers}</strong>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">Clientes cadastrados</p>
            <strong className="mt-2 block text-3xl">{totalClients}</strong>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">Agendamentos totais</p>
            <strong className="mt-2 block text-3xl">{totalAppointments}</strong>
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-bold">Empresas e assinaturas</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Primeira visão geral das empresas cadastradas no SaaS.
                </p>
              </div>

              <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300">
                {cancelledSubscriptions.length} cancelada(s)
              </span>
            </div>

            <div className="mt-5">
              <input
                placeholder="Pesquisar empresa, plano, status ou ID..."
                className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-white outline-none"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="mt-4 rounded-xl border border-blue-900 bg-blue-950/20 p-4 text-sm text-blue-100">
              Altere plano, status, trial e vencimento diretamente na linha da empresa e clique em Salvar.
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500">
                    <th className="py-3 pr-4">Empresa</th>
                    <th className="py-3 pr-4">Uso</th>
                    <th className="py-3 pr-4">Plano</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Trial até</th>
                    <th className="py-3 pr-4">Vencimento</th>
                    <th className="py-3 pr-4">Ações</th>
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
                            <option key={plan.id} value={plan.id}>
                              {plan.name}
                            </option>
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
                          <p className="text-xs text-zinc-500">
                            Criada em {formatDate(company.created_at)}
                          </p>

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

                  {companies.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-500">
                        Nenhuma empresa encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-bold">Planos</h2>

            <div className="mt-5 space-y-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-xl border border-zinc-800 bg-black/30 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong>{plan.name}</strong>

                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${
                        plan.active
                          ? 'bg-green-500 text-black'
                          : 'bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      {plan.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <p className="mt-2 text-2xl font-bold text-green-400">
                    {formatCurrency(Number(plan.price || 0))}
                  </p>

                  <p className="mt-2 text-sm text-zinc-500">
                    Usuários: {plan.max_users} · Profissionais: {plan.max_professionals}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    Agendamentos/mês: {plan.max_monthly_appointments}
                  </p>
                </div>
              ))}

              {plans.length === 0 && (
                <p className="rounded-xl bg-black/30 p-4 text-sm text-zinc-500">
                  Nenhum plano cadastrado.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
