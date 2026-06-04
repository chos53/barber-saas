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

type CompanyRow = {
  id: string
  name: string
  created_at: string | null
  subscription: CompanySubscription | null
}

const masterEmails = ['caheolsa@yahoo.com.br']

export default function MasterPage() {
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [plans, setPlans] = useState<SaasPlan[]>([])
  const [subscriptions, setSubscriptions] = useState<CompanySubscription[]>([])
  const [currentEmail, setCurrentEmail] = useState('')

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
    console.log('PLANOS', loadedPlans)
console.log('ERRO PLANOS', plansResult.error)
console.log('ASSINATURAS', loadedSubscriptions)
console.log('ERRO ASSINATURAS', subscriptionsResult.error)
    const settingsByCompany = new Map<string, CompanySettings>()
    const subscriptionByCompany = new Map<string, CompanySubscription>()

    loadedSettings.forEach((setting) => {
      settingsByCompany.set(setting.company_id, setting)
    })

    loadedSubscriptions.forEach((subscription) => {
      subscriptionByCompany.set(subscription.company_id, subscription)
    })

    const rows: CompanyRow[] = loadedCompanies.map((company) => {
      return {
        id: company.id,
        created_at: company.created_at,
        name:
          settingsByCompany.get(company.id)?.company_name ||
          `Empresa ${company.id.slice(0, 8)}`,
        subscription: subscriptionByCompany.get(company.id) || null,
      }
    })

    setCompanies(rows)
    setSubscriptions(loadedSubscriptions)
    setPlans(loadedPlans)
    setLoading(false)
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

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500">
                    <th className="py-3 pr-4">Empresa</th>
                    <th className="py-3 pr-4">Plano</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Trial até</th>
                    <th className="py-3 pr-4">Vencimento</th>
                    <th className="py-3 pr-4">Criada em</th>
                  </tr>
                </thead>

                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id} className="border-b border-zinc-800">
                      <td className="py-4 pr-4">
                        <strong className="block text-white">{company.name}</strong>
                        <span className="text-xs text-zinc-600">{company.id}</span>
                      </td>

                      <td className="py-4 pr-4 text-zinc-300">
                        {company.subscription?.saas_plans?.name || '-'}
                      </td>

                      <td className="py-4 pr-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(company.subscription?.status)}`}>
                          {getStatusLabel(company.subscription?.status)}
                        </span>
                      </td>

                      <td className="py-4 pr-4 text-zinc-400">
                        {formatDate(company.subscription?.trial_ends_at || null)}
                      </td>

                      <td className="py-4 pr-4 text-zinc-400">
                        {formatDate(company.subscription?.subscription_ends_at || null)}
                      </td>

                      <td className="py-4 pr-4 text-zinc-400">
                        {formatDate(company.created_at)}
                      </td>
                    </tr>
                  ))}

                  {companies.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
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
