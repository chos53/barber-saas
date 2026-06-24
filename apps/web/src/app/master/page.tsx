'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, Image as ImageIcon, MessageSquare, Star, Link as LinkIcon, Settings, Smartphone, Plus, Trash2, Upload } from 'lucide-react'

type Company = { id: string; created_at: string | null }
type CompanySettings = { company_id: string; company_name: string | null }
type SaasPlan = { id: string; name: string; price: number; active: boolean; max_users: number; max_professionals: number; max_monthly_appointments: number; features?: string | null }
type CompanySubscription = { id: string; company_id: string; plan_id: string | null; status: string; trial_ends_at: string | null; subscription_starts_at: string | null; subscription_ends_at: string | null; blocked_at: string | null; created_at: string | null; saas_plans?: SaasPlan | null }
type CompanyMetrics = { users: number; clients: number; appointments: number; professionals: number; revenue: number }
type CompanyRow = { id: string; name: string; created_at: string | null; subscription: CompanySubscription | null; metrics: CompanyMetrics }
type AsaasInvoice = { id: string; dueDate: string; value: number; status: string; invoiceUrl: string; billingType: string }

const masterEmails = ['caheolsa@yahoo.com.br']

export default function MasterPage() {
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [plans, setPlans] = useState<SaasPlan[]>([])
  const [subscriptions, setSubscriptions] = useState<CompanySubscription[]>([])
  const [currentEmail, setCurrentEmail] = useState('')
  const [savingCompanyId, setSavingCompanyId] = useState('')
  const [search, setSearch] = useState('')
  
  const [activeTab, setActiveTab] = useState<'companies' | 'plans' | 'metrics' | 'landing'>('companies')

  const [newCompanyName, setNewCompanyName] = useState('')
  const [newOwnerEmail, setNewOwnerEmail] = useState('')
  const [newCompanyPlanId, setNewCompanyPlanId] = useState('')
  const [newCompanyTrialDays, setNewCompanyTrialDays] = useState('14')
  const [creatingCompany, setCreatingCompany] = useState(false)

  // Planos - Novos campos
  const [newPlanName, setNewPlanName] = useState('')
  const [newPlanPrice, setNewPlanPrice] = useState('')
  const [newPlanMaxUsers, setNewPlanMaxUsers] = useState('1')
  const [newPlanMaxProfessionals, setNewPlanMaxProfessionals] = useState('3')
  const [newPlanMaxAppointments, setNewPlanMaxAppointments] = useState('100')
  const [newPlanFeatures, setNewPlanFeatures] = useState('')
  const [creatingPlan, setCreatingPlan] = useState(false)

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [editPlanName, setEditPlanName] = useState('')
  const [editPlanPrice, setEditPlanPrice] = useState('')
  const [editPlanMaxUsers, setEditPlanMaxUsers] = useState('1')
  const [editPlanMaxProfessionals, setEditPlanMaxProfessionals] = useState('3')
  const [editPlanMaxAppointments, setEditPlanMaxAppointments] = useState('100')
  const [editPlanFeatures, setEditPlanFeatures] = useState('')
  const [savingPlan, setSavingPlan] = useState(false)

  const [viewingInvoicesCompany, setViewingInvoicesCompany] = useState<string | null>(null)
  const [companyInvoices, setCompanyInvoices] = useState<AsaasInvoice[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)

  const heroImageRef = useRef<HTMLInputElement>(null)
  const [hero, setHero] = useState({ title: '', subtitle: '', image: null as File | null })
  const [cta, setCta] = useState({ text: '', link: '' })
  const [benefits, setBenefits] = useState([{ title: '', description: '' }])
  const [testimonials, setTestimonials] = useState([{ name: '', role: '', text: '', photo: null as File | null }])
  const [savingLanding, setSavingLanding] = useState(false)

  useEffect(() => {
    loadMasterData()
  }, [])

  const activeSubscriptions = useMemo(() => subscriptions.filter((s) => s.status === 'active'), [subscriptions])
  const trialSubscriptions = useMemo(() => subscriptions.filter((s) => s.status === 'trial'), [subscriptions])
  const suspendedSubscriptions = useMemo(() => subscriptions.filter((s) => s.status === 'suspended'), [subscriptions])
  const cancelledSubscriptions = useMemo(() => subscriptions.filter((s) => s.status === 'cancelled'), [subscriptions])
  const estimatedMrr = useMemo(() => activeSubscriptions.reduce((sum, s) => sum + Number(s.saas_plans?.price || 0), 0), [activeSubscriptions])

  const filteredCompanies = useMemo(() => {
    const norm = search.trim().toLowerCase()
    if (!norm) return companies
    return companies.filter((c) => c.name.toLowerCase().includes(norm) || c.id.toLowerCase().includes(norm) || String(c.subscription?.saas_plans?.name || '').toLowerCase().includes(norm) || String(c.subscription?.status || '').toLowerCase().includes(norm))
  }, [companies, search])

  const totalUsers = useMemo(() => companies.reduce((sum, c) => sum + c.metrics.users, 0), [companies])
  const totalClients = useMemo(() => companies.reduce((sum, c) => sum + c.metrics.clients, 0), [companies])
  const totalAppointments = useMemo(() => companies.reduce((sum, c) => sum + c.metrics.appointments, 0), [companies])

  const addBenefit = () => setBenefits([...benefits, { title: '', description: '' }])
  const removeBenefit = (index: number) => setBenefits(benefits.filter((_, i) => i !== index))
  const addTestimonial = () => setTestimonials([...testimonials, { name: '', role: '', text: '', photo: null }])
  const removeTestimonial = (index: number) => setTestimonials(testimonials.filter((_, i) => i !== index))

  async function handleSaveLandingPage() {
    setSavingLanding(true)
    try {
      const cleanTestimonials = testimonials.map(t => ({ name: t.name, role: t.role, text: t.text }))
      const { error } = await supabase.from('landing_settings').upsert({
        id: 'default', hero_title: hero.title, hero_subtitle: hero.subtitle, cta_text: cta.text,
        cta_link: cta.link, benefits: benefits, testimonials: cleanTestimonials, updated_at: new Date().toISOString()
      })
      if (error) throw error
      alert('Configurações da Landing Page salvas com sucesso!')
    } catch (err: any) { alert(`Erro ao salvar Landing Page: ${err.message}`) } finally { setSavingLanding(false) }
  }

  async function loadMasterData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      const userEmail = user?.email?.toLowerCase() || ''
      currentEmail || setCurrentEmail(userEmail)

      if (!user || !masterEmails.includes(userEmail)) {
        window.location.href = '/dashboard'
        return
      }

      const [
        companiesResult, companySettingsResult, subscriptionsResult, plansResult, profilesResult, clientsResult, appointmentsResult, professionalsResult, financialResult, landingResult
      ] = await Promise.all([
        supabase.from('companies').select('id, created_at').order('created_at', { ascending: false }),
        supabase.from('company_settings').select('company_id, company_name'),
        supabase.from('company_subscriptions').select(`id, company_id, plan_id, status, trial_ends_at, subscription_starts_at, subscription_ends_at, blocked_at, created_at, saas_plans (id, name, price, active, max_users, max_professionals, max_monthly_appointments)`).order('created_at', { ascending: false }),
        supabase.from('saas_plans').select('*').order('price', { ascending: true }),
        supabase.from('profiles').select('company_id'),
        supabase.from('clients').select('company_id'),
        supabase.from('appointments').select('company_id'),
        supabase.from('professionals').select('company_id'),
        supabase.from('financial_transactions').select('company_id, type, amount, status'),
        supabase.from('landing_settings').select('*').eq('id', 'default').single()
      ])

      if (companiesResult.error) throw companiesResult.error
      if (subscriptionsResult.error) throw subscriptionsResult.error

      if (landingResult.data) {
        setHero({ title: landingResult.data.hero_title || '', subtitle: landingResult.data.hero_subtitle || '', image: null })
        setCta({ text: landingResult.data.cta_text || '', link: landingResult.data.cta_link || '' })
        if (landingResult.data.benefits?.length) setBenefits(landingResult.data.benefits)
        if (landingResult.data.testimonials?.length) setTestimonials(landingResult.data.testimonials)
      }

      const loadedCompanies = (companiesResult.data || []) as unknown as Company[]
      const loadedSettings = (companySettingsResult.data || []) as unknown as CompanySettings[]
      const loadedSubscriptions = (subscriptionsResult.data || []) as unknown as CompanySubscription[]
      const loadedPlans = (plansResult.data || []) as unknown as SaasPlan[]
      const loadedProfiles = (profilesResult.data || []) as unknown as Array<{ company_id: string | null }>
      const loadedClients = (clientsResult.data || []) as unknown as Array<{ company_id: string | null }>
      const loadedAppointments = (appointmentsResult.data || []) as Array<{ company_id: string | null }>
      const loadedProfessionals = (professionalsResult.data || []) as Array<{ company_id: string | null }>
      const loadedFinancialTransactions = (financialResult.data || []) as Array<{ company_id: string | null; type: string | null; amount: number | null; status: string | null }>

      const settingsByCompany = new Map<string, CompanySettings>()
      const subscriptionByCompany = new Map<string, CompanySubscription>()
      loadedSettings.forEach((s) => settingsByCompany.set(s.company_id, s))
      loadedSubscriptions.forEach((s) => subscriptionByCompany.set(s.company_id, s))

      function countByCompany(items: Array<{ company_id: string | null }>) {
        const map = new Map<string, number>()
        items.forEach((item) => { if (item.company_id) map.set(item.company_id, (map.get(item.company_id) || 0) + 1) })
        return map
      }

      const usersByCompany = countByCompany(loadedProfiles)
      const clientsByCompany = countByCompany(loadedClients)
      const appointmentsByCompany = countByCompany(loadedAppointments)
      const professionalsByCompany = countByCompany(loadedProfessionals)
      const revenueByCompany = new Map<string, number>()

      loadedFinancialTransactions.forEach((t) => {
        if (t.company_id && t.type === 'income' && t.status !== 'cancelled') {
          revenueByCompany.set(t.company_id, (revenueByCompany.get(t.company_id) || 0) + Number(t.amount || 0))
        }
      })

      const rows: CompanyRow[] = loadedCompanies.map((c) => ({
        id: c.id,
        created_at: c.created_at,
        name: settingsByCompany.get(c.id)?.company_name || `Empresa ${c.id.slice(0, 8)}`,
        subscription: subscriptionByCompany.get(c.id) || null,
        metrics: {
          users: usersByCompany.get(c.id) || 0,
          clients: clientsByCompany.get(c.id) || 0,
          appointments: appointmentsByCompany.get(c.id) || 0,
          professionals: professionalsByCompany.get(c.id) || 0,
          revenue: revenueByCompany.get(c.id) || 0,
        },
      }))

      setCompanies(rows)
      setSubscriptions(loadedSubscriptions)
      setPlans(loadedPlans)
    } catch (err: any) {
      console.error('Erro:', err)
      alert(`Erro no carregamento: ${err.message || err}`)
    } finally {
      setLoading(false)
    }
  }

  async function openAsaasInvoicesModal(companyId: string) {
    try {
      setLoadingInvoices(true)
      setViewingInvoicesCompany('Buscando...')
      setCompanyInvoices([])
      const response = await fetch(`/api/master/company-invoices?companyId=${companyId}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erro.')
      setViewingInvoicesCompany(data.companyName)
      setCompanyInvoices(data.invoices)
    } catch (err: any) {
      alert(`Erro: ${err.message}`)
      setViewingInvoicesCompany(null)
    } finally {
      setLoadingInvoices(false)
    }
  }

  async function createCompanyFromMaster() {
    const companyName = newCompanyName.trim()
    const ownerEmail = newOwnerEmail.trim().toLowerCase()
    const trialDays = Number(newCompanyTrialDays || 14)
    if (!companyName || !ownerEmail || !newCompanyPlanId || trialDays < 0) return alert('Preencha todos os campos.')

    setCreatingCompany(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return alert('Sessão master não encontrada.')

      const response = await fetch('/api/master/create-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, ownerEmail, planId: newCompanyPlanId, trialDays, masterUserId: user.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setNewCompanyName(''); setNewOwnerEmail(''); setNewCompanyPlanId(''); setNewCompanyTrialDays('14')
      if (data.action_link) {
        try { await navigator.clipboard.writeText(data.action_link) } catch (e) {}
        window.prompt('Link de convite gerado:', data.action_link)
      } else {
        alert('Criada, mas e-mail já existe no Auth.')
      }
      await loadMasterData()
    } catch (err: any) {
      alert(`Falha: ${err.message}`)
    } finally {
      setCreatingCompany(false)
    }
  }

  async function createPlan() {
    if (!newPlanName.trim() || Number(newPlanPrice) < 0) return alert('Preencha os dados do plano.')
    setCreatingPlan(true)
    const { error } = await supabase.from('saas_plans').insert({
      name: newPlanName.trim(), price: Number(newPlanPrice), max_users: Number(newPlanMaxUsers),
      max_professionals: Number(newPlanMaxProfessionals), max_monthly_appointments: Number(newPlanMaxAppointments), 
      features: newPlanFeatures.trim(), active: true,
    })
    if (error) { alert(`Erro: ${error.message}`); setCreatingPlan(false); return }
    setNewPlanName(''); setNewPlanPrice(''); setNewPlanMaxUsers('1'); setNewPlanMaxProfessionals('3'); setNewPlanMaxAppointments('100'); setNewPlanFeatures('');
    setCreatingPlan(false)
    alert('Plano criado!')
    await loadMasterData()
  }

  function startEditingPlan(plan: SaasPlan) {
    setEditingPlanId(plan.id); setEditPlanName(plan.name); setEditPlanPrice(String(plan.price)); setEditPlanMaxUsers(String(plan.max_users)); setEditPlanMaxProfessionals(String(plan.max_professionals)); setEditPlanMaxAppointments(String(plan.max_monthly_appointments)); setEditPlanFeatures(plan.features || '')
  }

  async function savePlanEdits() {
    if (!editingPlanId || !editPlanName.trim() || Number(editPlanPrice) < 0) return
    setSavingPlan(true)
    const { error } = await supabase.from('saas_plans').update({
      name: editPlanName.trim(), price: Number(editPlanPrice), max_users: Number(editPlanMaxUsers),
      max_professionals: Number(editPlanMaxProfessionals), max_monthly_appointments: Number(editPlanMaxAppointments),
      features: editPlanFeatures.trim()
    }).eq('id', editingPlanId)
    setSavingPlan(false)
    if (error) return alert(`Erro: ${error.message}`)
    setEditingPlanId(null)
    alert('Plano atualizado!')
    await loadMasterData()
  }

  async function togglePlanStatus(plan: SaasPlan) {
    const nextActiveState = !plan.active
    const { error } = await supabase.from('saas_plans').update({ active: nextActiveState }).eq('id', plan.id)
    if (error) return alert(`Erro: ${error.message}`)
    setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, active: nextActiveState } : p)))
  }

  async function deletePlan(planId: string) {
    if (subscriptions.some((s) => s.plan_id === planId)) return alert('Plano em uso!')
    if (!confirm('Excluir plano?')) return
    const { error } = await supabase.from('saas_plans').delete().eq('id', planId)
    if (error) return alert(`Erro: ${error.message}`)
    setPlans((prev) => prev.filter((p) => p.id !== planId))
  }

  function getDateInputValue(value: string | null | undefined) { return value ? value.split('T')[0] : '' }

  async function saveCompanySubscription(c: CompanyRow, pId: string, status: string, trialEnds: string, subEnds: string) {
    if (!pId || !status) return alert('Selecione plano e status.')
    setSavingCompanyId(c.id)
    const { error } = await supabase.from('company_subscriptions').upsert({
      company_id: c.id, plan_id: pId, status,
      trial_ends_at: trialEnds ? `${trialEnds}T23:59:59` : null,
      subscription_starts_at: c.subscription?.subscription_starts_at || new Date().toISOString(),
      subscription_ends_at: subEnds ? `${subEnds}T23:59:59` : null,
      blocked_at: status === 'suspended' ? c.subscription?.blocked_at || new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' })
    setSavingCompanyId('')
    if (error) return alert(`Erro: ${error.message}`)
    await loadMasterData()
  }

  async function updateCompanyStatus(c: CompanyRow, status: string) {
    if (!c.subscription?.plan_id) return alert('Sem plano definido.')
    await saveCompanySubscription(c, c.subscription.plan_id, status, getDateInputValue(c.subscription.trial_ends_at), getDateInputValue(c.subscription.subscription_ends_at))
  }

  async function resendInvite(c: CompanyRow) {
    const ownerEmail = prompt(`Email para convite:`)
    if (!ownerEmail?.trim()) return
    const { data, error } = await supabase.functions.invoke('create-company-owner', { body: { companyId: c.id, companyName: c.name, ownerEmail: ownerEmail.trim().toLowerCase() } })
    if (error) return alert('Erro ao gerar convite.')
    if (data?.action_link) {
      try { await navigator.clipboard.writeText(data.action_link) } catch (e) {}
      window.prompt('Link:', data.action_link)
    }
  }

  async function handleLogout() { await supabase.auth.signOut(); window.location.href = '/login' }
  function formatCurrency(value: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) }
  function formatDate(value: string | null) { if (!value) return '-'; const date = new Date(value); return new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR') }
  function getStatusLabel(s: string | null | undefined) { if (s === 'active') return 'Ativa'; if (s === 'trial') return 'Trial'; if (s === 'suspended') return 'Suspensa'; if (s === 'cancelled') return 'Cancelada'; return 'Sem assinatura' }
  function getStatusClass(s: string | null | undefined) { if (s === 'active') return 'bg-green-500 text-black'; if (s === 'trial') return 'bg-blue-500 text-white'; if (s === 'suspended') return 'bg-yellow-500 text-black'; if (s === 'cancelled') return 'bg-red-500 text-white'; return 'bg-zinc-700 text-zinc-300' }
  function translateAsaasStatus(s: string) { if (s === 'PENDING') return 'Pendente'; if (s === 'RECEIVED') return 'Paga'; if (s === 'OVERDUE') return 'Vencida'; return s }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-black text-white"><p>Carregando...</p></main>

  return (
    <main className="min-h-screen bg-black p-8 text-white relative">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">Salonix SaaS</p>
            <h1 className="mt-2 text-4xl font-bold">Dashboard Master</h1>
            <p className="mt-1 text-xs text-zinc-600">Acesso mestre: {currentEmail}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadMasterData} className="rounded-xl bg-zinc-800 px-5 py-3 font-bold text-white transition hover:bg-zinc-700">Atualizar</button>
            <button onClick={handleLogout} className="rounded-xl bg-white px-5 py-3 font-bold text-black transition hover:bg-zinc-200">Sair</button>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-blue-900 bg-blue-950/30 p-5"><p className="text-sm text-blue-300">Empresas</p><strong className="mt-2 block text-4xl">{companies.length}</strong></div>
          <div className="rounded-2xl border border-green-900 bg-green-950/30 p-5"><p className="text-sm text-green-300">Ativas</p><strong className="mt-2 block text-4xl">{activeSubscriptions.length}</strong></div>
          <div className="rounded-2xl border border-cyan-900 bg-cyan-950/30 p-5"><p className="text-sm text-cyan-300">Trial</p><strong className="mt-2 block text-4xl">{trialSubscriptions.length}</strong></div>
          <div className="rounded-2xl border border-yellow-900 bg-yellow-950/30 p-5"><p className="text-sm text-yellow-300">Suspensas</p><strong className="mt-2 block text-4xl">{suspendedSubscriptions.length}</strong></div>
          <div className="rounded-2xl border border-purple-900 bg-purple-950/30 p-5"><p className="text-sm text-purple-300">MRR</p><strong className="mt-2 block text-3xl">{formatCurrency(estimatedMrr)}</strong></div>
        </section>

        <div className="mt-8 flex gap-2 border-b border-zinc-800 pb-px overflow-x-auto">
          <button onClick={() => setActiveTab('companies')} className={`px-5 py-3 text-sm font-bold border-b-2 ${activeTab === 'companies' ? 'border-white text-white' : 'border-transparent text-zinc-500'}`}>Empresas</button>
          <button onClick={() => setActiveTab('plans')} className={`px-5 py-3 text-sm font-bold border-b-2 ${activeTab === 'plans' ? 'border-white text-white' : 'border-transparent text-zinc-500'}`}>Planos</button>
          <button onClick={() => setActiveTab('metrics')} className={`px-5 py-3 text-sm font-bold border-b-2 ${activeTab === 'metrics' ? 'border-white text-white' : 'border-transparent text-zinc-500'}`}>Métricas</button>
          <button onClick={() => setActiveTab('landing')} className={`px-5 py-3 text-sm font-bold border-b-2 ${activeTab === 'landing' ? 'border-amber-500 text-amber-500' : 'border-transparent text-zinc-500'}`}>Landing Page</button>
        </div>

        {activeTab === 'companies' && (
          <div className="mt-6 space-y-6">
            <section className="rounded-2xl border border-blue-900 bg-blue-950/20 p-6">
              <h2 className="text-xl font-bold mb-4">Nova empresa</h2>
              <div className="grid gap-3 md:grid-cols-[1.2fr_1.2fr_1fr_0.7fr_auto]">
                <input placeholder="Nome" className="rounded-xl border border-zinc-800 bg-black p-3" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} />
                <input placeholder="Email" className="rounded-xl border border-zinc-800 bg-black p-3" value={newOwnerEmail} onChange={(e) => setNewOwnerEmail(e.target.value)} />
                <select value={newCompanyPlanId} onChange={(e) => setNewCompanyPlanId(e.target.value)} className="rounded-xl border border-zinc-800 bg-black p-3">
                  <option value="">Plano</option>
                  {plans.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
                <input type="number" placeholder="Trial" className="rounded-xl border border-zinc-800 bg-black p-3" value={newCompanyTrialDays} onChange={(e) => setNewCompanyTrialDays(e.target.value)} />
                <button disabled={creatingCompany} onClick={createCompanyFromMaster} className="rounded-xl bg-white px-5 py-3 font-bold text-black">Criar</button>
              </div>
            </section>
            
            <section className="rounded-2xl border border-zinc-800 bg-[#0f0f11] p-6">
              <input placeholder="Pesquisar..." className="w-full rounded-xl border border-zinc-800 bg-black p-3 mb-6" value={search} onChange={(e) => setSearch(e.target.value)} />
              
              <div className="flex flex-col">
                {filteredCompanies.map((c) => (
                  <div key={c.id} className="border-b border-zinc-800 py-6 flex flex-col xl:flex-row gap-6 items-start xl:items-center">
                    
                    <div className="w-full xl:w-[200px] flex-shrink-0">
                      <h3 className="text-base font-bold text-white mb-1">{c.name}</h3>
                      <p className="text-[10px] text-zinc-500 break-all leading-tight">{c.id}</p>
                    </div>

                    <div className="w-full xl:w-[150px] space-y-1 text-xs">
                      <p><span className="text-zinc-400">Usuários:</span> <strong className="text-white">{c.metrics.users}</strong></p>
                      <p><span className="text-zinc-400">Clientes:</span> <strong className="text-white">{c.metrics.clients}</strong></p>
                      <p><span className="text-zinc-400">Agendamentos:</span> <strong className="text-white">{c.metrics.appointments}</strong></p>
                      <p><span className="text-zinc-400">Profissionais:</span> <strong className="text-white">{c.metrics.professionals}</strong></p>
                      <p><span className="text-zinc-400">Receita:</span> <strong className="text-green-500">{formatCurrency(c.metrics.revenue)}</strong></p>
                    </div>

                    <div className="flex-1 flex flex-wrap gap-3 items-center">
                      <select id={`plan-${c.id}`} defaultValue={c.subscription?.plan_id || ''} className="rounded-lg border border-zinc-700 bg-black p-2 text-sm text-white w-[130px]">
                        <option value="">Plano...</option>
                        {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      
                      <div className="flex flex-col gap-2">
                          <select id={`status-${c.id}`} defaultValue={c.subscription?.status || 'trial'} className="rounded-lg border border-zinc-700 bg-black p-2 text-sm text-white w-[130px]">
                              <option value="trial">Trial</option>
                              <option value="active">Ativa</option>
                              <option value="suspended">Suspensa</option>
                              <option value="cancelled">Cancelada</option>
                          </select>
                          <span className={`inline-block px-3 py-1 text-center rounded-full text-xs font-bold w-[130px] ${getStatusClass(c.subscription?.status)}`}>
                            {getStatusLabel(c.subscription?.status)}
                          </span>
                      </div>

                      <input type="date" id={`trial-${c.id}`} defaultValue={getDateInputValue(c.subscription?.trial_ends_at)} className="rounded-lg border border-zinc-700 bg-black p-2 text-sm text-white w-[140px]" title="Fim do Trial" />
                      <input type="date" id={`sub-${c.id}`} defaultValue={getDateInputValue(c.subscription?.subscription_ends_at)} className="rounded-lg border border-zinc-700 bg-black p-2 text-sm text-white w-[140px]" title="Fim da Assinatura" />
                    </div>

                    <div className="w-full xl:w-[250px] flex flex-col gap-2 flex-shrink-0">
                      <p className="text-xs text-zinc-500 mb-1">Criada em {formatDate(c.created_at)}</p>
                      <button onClick={() => openAsaasInvoicesModal(c.id)} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-500">Ver Faturas Asaas</button>
                      <button onClick={() => {
                          const pId = (document.getElementById(`plan-${c.id}`) as HTMLSelectElement).value;
                          const status = (document.getElementById(`status-${c.id}`) as HTMLSelectElement).value;
                          const trial = (document.getElementById(`trial-${c.id}`) as HTMLInputElement).value;
                          const sub = (document.getElementById(`sub-${c.id}`) as HTMLInputElement).value;
                          saveCompanySubscription(c, pId, status, trial, sub);
                      }} className="w-full rounded-lg bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-zinc-200">Salvar Alterações</button>
                      <div className="flex gap-2">
                          <button onClick={() => updateCompanyStatus(c, 'active')} className="flex-1 rounded-lg bg-[#0f2e1b] border border-transparent px-2 py-2 text-xs font-bold text-[#4ade80] hover:bg-green-900/50 transition-colors">Ativar</button>
                          <button onClick={() => updateCompanyStatus(c, 'suspended')} className="flex-1 rounded-lg bg-[#3f3114] border border-transparent px-2 py-2 text-xs font-bold text-[#fbbf24] hover:bg-yellow-900/50 transition-colors">Suspender</button>
                      </div>
                      <button onClick={() => resendInvite(c)} className="w-full rounded-lg bg-[#27272a] px-4 py-2 text-xs font-bold text-white transition hover:bg-zinc-700">Reenviar convite auth</button>
                    </div>

                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ABA PLANOS */}
        {activeTab === 'plans' && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[350px_1fr]">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 h-fit">
              <h3 className="mb-4 font-bold">Criar Plano</h3>
              <div className="space-y-3">
                <input placeholder="Nome" value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} className="w-full bg-black p-3 rounded-xl border border-zinc-800" />
                <input type="number" placeholder="Preço" value={newPlanPrice} onChange={(e) => setNewPlanPrice(e.target.value)} className="w-full bg-black p-3 rounded-xl border border-zinc-800" />
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="mb-1 block text-xs text-zinc-400">Usuários</label><input type="number" value={newPlanMaxUsers} onChange={(e) => setNewPlanMaxUsers(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-black p-2 text-sm text-white" /></div>
                  <div><label className="mb-1 block text-xs text-zinc-400">Profissionais</label><input type="number" value={newPlanMaxProfessionals} onChange={(e) => setNewPlanMaxProfessionals(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-black p-2 text-sm text-white" /></div>
                </div>
                <div><label className="mb-1 block text-xs text-zinc-400">Agendamentos/Mês (0 = Ilimitado)</label><input type="number" value={newPlanMaxAppointments} onChange={(e) => setNewPlanMaxAppointments(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-black p-2 text-sm text-white" /></div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400 text-amber-500">Serviços Extras (separe por vírgula)</label>
                  <textarea rows={2} placeholder="Ex: Gestão Financeira, Relatórios, Suporte VIP" value={newPlanFeatures} onChange={(e) => setNewPlanFeatures(e.target.value)} className="w-full rounded-lg border border-amber-900/50 bg-black p-2 text-sm text-white outline-none focus:border-amber-500" />
                </div>
                <button onClick={createPlan} className="w-full bg-white text-black py-3 rounded-xl font-bold">Salvar Plano</button>
              </div>
            </section>
            <div className="grid gap-4 sm:grid-cols-2">
              {plans.map((p) => (
                <div key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col justify-between">
                  {editingPlanId === p.id ? (
                    <div className="space-y-2">
                      <input type="text" value={editPlanName} onChange={(e) => setEditPlanName(e.target.value)} className="w-full rounded border border-zinc-700 bg-black p-1 text-xs text-white" />
                      <input type="number" value={editPlanPrice} onChange={(e) => setEditPlanPrice(e.target.value)} className="w-full rounded border border-zinc-700 bg-black p-1 text-xs text-white" />
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-[10px] text-zinc-500">Usuários</label><input type="number" value={editPlanMaxUsers} onChange={(e) => setEditPlanMaxUsers(e.target.value)} className="w-full rounded border border-zinc-700 bg-black p-1 text-xs text-white" /></div>
                        <div><label className="text-[10px] text-zinc-500">Profissionais</label><input type="number" value={editPlanMaxProfessionals} onChange={(e) => setEditPlanMaxProfessionals(e.target.value)} className="w-full rounded border border-zinc-700 bg-black p-1 text-xs text-white" /></div>
                      </div>
                      <div><label className="text-[10px] text-zinc-500">Agendamentos/Mês</label><input type="number" value={editPlanMaxAppointments} onChange={(e) => setEditPlanMaxAppointments(e.target.value)} className="w-full rounded border border-zinc-700 bg-black p-1 text-xs text-white" /></div>
                      <div><label className="text-[10px] text-amber-500">Serviços Extras (separe por vírgula)</label><textarea rows={2} value={editPlanFeatures} onChange={(e) => setEditPlanFeatures(e.target.value)} className="w-full rounded border border-amber-900/50 bg-black p-1 text-xs text-white outline-none focus:border-amber-500" /></div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={savePlanEdits} className="flex-1 rounded bg-green-600 px-2 py-1 text-xs font-bold text-white">Salvar</button>
                        <button onClick={() => setEditingPlanId(null)} className="flex-1 rounded bg-zinc-700 px-2 py-1 text-xs font-bold text-white">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex justify-between items-start">
                          <strong>{p.name}</strong>
                          <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${p.active ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-400'}`}>{p.active ? 'Ativo' : 'Inativo'}</span>
                        </div>
                        <span className="text-xl font-bold text-green-400 block mt-1">{formatCurrency(p.price)}</span>
                        <p className="text-xs text-zinc-400 mt-2">Até {p.max_users} usuários e {p.max_professionals} profissionais</p>
                        {p.features && (
                          <div className="mt-3 p-2 bg-black rounded-lg border border-zinc-800">
                            <span className="text-[10px] text-amber-500 font-bold block mb-1">SERVIÇOS INCLUSOS:</span>
                            <p className="text-xs text-zinc-300 leading-relaxed">{p.features}</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button onClick={() => startEditingPlan(p)} className="flex-1 bg-zinc-800 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-zinc-700 transition">Editar</button>
                        <button onClick={() => togglePlanStatus(p)} className="flex-1 bg-zinc-800 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-zinc-700 transition text-amber-500">{p.active ? 'Inativar' : 'Ativar'}</button>
                        <button onClick={() => deletePlan(p.id)} className="bg-red-900/30 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-900/50 transition">Excluir</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA MÉTRICAS */}
        {activeTab === 'metrics' && (
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-bold">Métricas Detalhadas</h2>
            <p className="mt-2 text-zinc-400">Usuários: {totalUsers} | Clientes: {totalClients} | Agendamentos: {totalAppointments}</p>
          </div>
        )}

        {/* ABA LANDING PAGE */}
        {activeTab === 'landing' && (
          <div className="mt-6 space-y-6">
            <section className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Editor da Landing Page</h2>
                <div className="flex gap-3">
                  <button onClick={() => window.open('/', 'MobilePreview', 'width=375,height=812,resizable=no,scrollbars=yes')} className="px-4 py-2 bg-zinc-800 text-xs rounded-lg font-bold">Ver Mobile</button>
                  <button onClick={handleSaveLandingPage} disabled={savingLanding} className="px-4 py-2 bg-amber-500 text-black font-bold text-xs rounded-lg">{savingLanding ? 'Salvando...' : 'Publicar Alterações'}</button>
                </div>
              </div>
              <div className="space-y-4">
                <input placeholder="Título Principal" value={hero.title} onChange={(e) => setHero({ ...hero, title: e.target.value })} className="w-full p-3 bg-black border border-zinc-800 rounded-xl" />
                <textarea rows={3} placeholder="Subtítulo" value={hero.subtitle} onChange={(e) => setHero({ ...hero, subtitle: e.target.value })} className="w-full p-3 bg-black border border-zinc-800 rounded-xl" />
                <div className="grid md:grid-cols-2 gap-4">
                  <input placeholder="Botão Call to Action" value={cta.text} onChange={(e) => setCta({ ...cta, text: e.target.value })} className="w-full p-3 bg-black border border-zinc-800 rounded-xl" />
                  <input placeholder="Link (ex: /register)" value={cta.link} onChange={(e) => setCta({ ...cta, link: e.target.value })} className="w-full p-3 bg-black border border-zinc-800 rounded-xl" />
                </div>
              </div>
            </section>

            <section className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
              <h2 className="text-xl font-bold text-white mb-4">Benefícios</h2>
              {benefits.map((b, i) => (
                <div key={i} className="flex gap-4 mb-3 items-center">
                  <div className="flex-1 space-y-2">
                    <input placeholder="Título" value={b.title} onChange={(e) => { const nb = [...benefits]; nb[i].title = e.target.value; setBenefits(nb) }} className="w-full p-2 bg-black border border-zinc-800 rounded-lg text-sm" />
                    <textarea placeholder="Descrição" value={b.description} onChange={(e) => { const nb = [...benefits]; nb[i].description = e.target.value; setBenefits(nb) }} className="w-full p-2 bg-black border border-zinc-800 rounded-lg text-sm" />
                  </div>
                  <button onClick={() => removeBenefit(i)} className="text-red-400 p-2"><Trash2 className="h-5 w-5" /></button>
                </div>
              ))}
              <button onClick={addBenefit} className="w-full py-2 border border-dashed border-zinc-700 text-zinc-400 rounded-lg text-sm">Adicionar Benefício</button>
            </section>

            <section className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
              <h2 className="text-xl font-bold text-white mb-4">Depoimentos</h2>
              {testimonials.map((t, i) => (
                <div key={i} className="flex gap-4 mb-3 items-center">
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <input placeholder="Nome" value={t.name} onChange={(e) => { const nt = [...testimonials]; nt[i].name = e.target.value; setTestimonials(nt) }} className="w-1/2 p-2 bg-black border border-zinc-800 rounded-lg text-sm" />
                      <input placeholder="Cargo" value={t.role} onChange={(e) => { const nt = [...testimonials]; nt[i].role = e.target.value; setTestimonials(nt) }} className="w-1/2 p-2 bg-black border border-zinc-800 rounded-lg text-sm" />
                    </div>
                    <textarea placeholder="Depoimento" value={t.text} onChange={(e) => { const nt = [...testimonials]; nt[i].text = e.target.value; setTestimonials(nt) }} className="w-full p-2 bg-black border border-zinc-800 rounded-lg text-sm" />
                  </div>
                  <button onClick={() => removeTestimonial(i)} className="text-red-400 p-2"><Trash2 className="h-5 w-5" /></button>
                </div>
              ))}
              <button onClick={addTestimonial} className="w-full py-2 border border-dashed border-zinc-700 text-zinc-400 rounded-lg text-sm">Adicionar Depoimento</button>
            </section>
          </div>
        )}
      </div>

      {viewingInvoicesCompany && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold">Faturas de {viewingInvoicesCompany}</h3>
              <button onClick={() => setViewingInvoicesCompany(null)}>Fechar</button>
            </div>
            {loadingInvoices ? <p>Carregando...</p> : companyInvoices.map(inv => (
              <div key={inv.id} className="bg-black p-3 mb-2 rounded flex justify-between">
                <div><span>{formatCurrency(inv.value)}</span> <span className="text-xs ml-2 text-zinc-500">{inv.status}</span></div>
                <a href={inv.invoiceUrl} target="_blank" className="text-blue-400 text-sm">Ver Asaas</a>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}