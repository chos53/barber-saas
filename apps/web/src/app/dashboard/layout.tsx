'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Home, 
  Calendar, 
  Users, 
  Scissors, 
  DollarSign, 
  Settings,
  BarChart3,
  ShieldAlert,
  FileSpreadsheet,
  Package,
  LogOut,
  Menu,
  X
} from 'lucide-react'

type UserRole =
  | 'owner'
  | 'administrator'
  | 'manager'
  | 'reception'
  | 'barber'
  | 'financial'

type MenuItem = {
  label: string
  href: string
  roles: UserRole[]
  icon: React.ComponentType<{ className?: string }>
}

const userRoleOptions: { value: UserRole; label: string }[] = [
  { value: 'owner', label: 'Proprietário(a)' },
  { value: 'administrator', label: 'Administrador(a)' },
  { value: 'manager', label: 'Gerente' },
  { value: 'reception', label: 'Recepção' },
  { value: 'barber', label: 'Profissional' },
  { value: 'financial', label: 'Financeiro' },
]

const visualRoleStorageKey = 'barber_saas_visual_role'

const allRoles: UserRole[] = [
  'owner',
  'administrator',
  'manager',
  'reception',
  'barber',
  'financial',
]

const menuItems: MenuItem[] = [
  { label: 'Dashboard', href: '/dashboard', roles: allRoles, icon: Home },
  { label: 'Agenda', href: '/dashboard/agenda', roles: ['owner', 'administrator', 'manager', 'reception', 'barber'], icon: Calendar },
  { label: 'Clientes', href: '/dashboard/clientes', roles: ['owner', 'administrator', 'manager', 'reception'], icon: Users },
  { label: 'Serviços', href: '/dashboard/servicos', roles: ['owner', 'administrator', 'manager'], icon: Scissors },
  { label: 'Profissionais', href: '/dashboard/profissionais', roles: ['owner', 'administrator', 'manager'], icon: Users },
  { label: 'Financeiro', href: '/dashboard/financeiro', roles: ['owner', 'administrator', 'manager', 'financial'], icon: DollarSign },
  { label: 'Relatórios', href: '/dashboard/relatorios', roles: ['owner', 'administrator', 'manager', 'financial'], icon: BarChart3 },
  { label: 'Auditoria', href: '/dashboard/auditoria', roles: ['owner', 'administrator', 'manager'], icon: ShieldAlert },
  { label: 'Comandas', href: '/dashboard/comandas', roles: ['owner', 'administrator', 'manager', 'reception', 'barber'], icon: FileSpreadsheet },
  { label: 'Produtos', href: '/dashboard/produtos', roles: ['owner', 'administrator', 'manager'], icon: Package },
  { label: 'Configurações', href: '/dashboard/configuracoes', roles: ['owner', 'administrator'], icon: Settings },
]

function normalizeRole(role: string | null | undefined): UserRole {
  const normalized = String(role || 'reception').toLowerCase()
  if (normalized === 'owner' || normalized === 'proprietario' || normalized === 'proprietário') return 'owner'
  if (normalized === 'admin' || normalized === 'administrator' || normalized === 'administrador') return 'administrator'
  if (normalized === 'manager' || normalized === 'gerente') return 'manager'
  if (normalized === 'reception' || normalized === 'recepcao' || normalized === 'recepção') return 'reception'
  if (normalized === 'barber' || normalized === 'professional' || normalized === 'profissional') return 'barber'
  if (normalized === 'financial' || normalized === 'financeiro') return 'financial'
  return 'reception'
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const [companyName, setCompanyName] = useState('Barber SaaS')
  const [logoUrl, setLogoUrl] = useState('')
  const [realUserRole, setRealUserRole] = useState<UserRole>('reception')
  const [userRole, setUserRole] = useState<UserRole>('reception')
  const [visualRole, setVisualRole] = useState<UserRole | ''>('')
  const [loadingPermissions, setLoadingPermissions] = useState(true)
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false)
  const [subscriptionBlockMessage, setSubscriptionBlockMessage] = useState('')
  
  // Estado para controlar a abertura da sidebar no mobile
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Fecha o menu mobile automaticamente sempre que o usuário mudar de página
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    loadCompanyBrand()
  }, [])

  const allowedMenuItems = useMemo(() => {
    if (userRole === 'owner' || userRole === 'administrator') return menuItems
    return menuItems.filter((item) => item.roles.includes(userRole))
  }, [userRole])

  useEffect(() => {
    if (loadingPermissions) return
    const currentPageAllowed = menuItems.some(
      (item) => (pathname === item.href || pathname.startsWith(`${item.href}/`)) && item.roles.includes(userRole)
    )
    const isDashboardRoot = pathname === '/dashboard'
    if (!currentPageAllowed && !isDashboardRoot) {
      router.push('/dashboard')
    }
  }, [pathname, router, userRole, loadingPermissions])

  function isTrialExpired(trialEndsAt: string | null | undefined) {
    if (!trialEndsAt) return false
    return new Date(trialEndsAt).getTime() < new Date().getTime()
  }

  function getSubscriptionBlockMessage(status: string | null | undefined) {
    if (status === 'suspended') return 'Sua assinatura está suspensa. Entre em contato com o administrador do sistema para reativar o acesso.'
    if (status === 'cancelled') return 'Sua assinatura foi cancelada. Entre em contato com o administrador do sistema para contratar um novo plano.'
    if (status === 'trial_expired') return 'Seu período de teste expirou. Entre em contato com o administrador do sistema para ativar sua assinatura.'
    return 'Sua assinatura está indisponível. Entre em contato com o administrador do sistema.'
  }

  async function loadCompanyBrand() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoadingPermissions(false)
      router.push('/login')
      return
    }

    const { data: profile } = await supabase.from('profiles').select('company_id, role').eq('id', user.id).single()
    if (!profile?.company_id) {
      setLoadingPermissions(false)
      return
    }

    const { data: subscription } = await supabase.from('company_subscriptions').select('status, trial_ends_at, subscription_ends_at').eq('company_id', profile.company_id).maybeSingle()
    const subscriptionStatus = subscription?.status || 'trial'
    const trialExpired = subscriptionStatus === 'trial' && isTrialExpired(subscription?.trial_ends_at)

    if (subscriptionStatus === 'suspended' || subscriptionStatus === 'cancelled' || trialExpired) {
      setSubscriptionBlocked(true)
      setSubscriptionBlockMessage(getSubscriptionBlockMessage(trialExpired ? 'trial_expired' : subscriptionStatus))
    } else {
      setSubscriptionBlocked(false)
      setSubscriptionBlockMessage('')
    }

    const normalizedRole = normalizeRole(profile.role)
    const savedVisualRole = window.localStorage.getItem(visualRoleStorageKey)
    setRealUserRole(normalizedRole)

    if (savedVisualRole) {
      const normalizedVisualRole = normalizeRole(savedVisualRole)
      setVisualRole(normalizedVisualRole)
      setUserRole(normalizedVisualRole)
    } else {
      setUserRole(normalizedRole)
    }

    const { data: settings } = await supabase.from('company_settings').select('company_name, logo_url').eq('company_id', profile.company_id).single()
    if (settings?.company_name) setCompanyName(settings.company_name)
    if (settings?.logo_url) setLogoUrl(settings.logo_url)
    setLoadingPermissions(false)
  }

  function handleVisualRoleChange(nextRole: UserRole | '') {
    if (!nextRole || nextRole === realUserRole) {
      window.localStorage.removeItem(visualRoleStorageKey)
      setVisualRole('')
      setUserRole(realUserRole)
      router.push('/dashboard')
      return
    }
    setVisualRole(nextRole)
    window.localStorage.setItem(visualRoleStorageKey, nextRole)
    setUserRole(nextRole)
    router.push('/dashboard')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-black text-white">
      
      {/* HEADER MOBILE (Aparece apenas em telas pequenas < md) */}
      <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 md:hidden sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {logoUrl && <img src={logoUrl} alt={companyName} className="h-8 w-8 rounded-lg object-cover" />}
          <h1 className="text-lg font-bold truncate max-w-[180px]">{companyName}</h1>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white transition"
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* BACKDROP MOBILE (Escurece o fundo quando o menu flutuante abre) */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* ASIDE / SIDEBAR NAVEGAÇÃO */}
      <aside className={`
        fixed bottom-0 top-16 md:top-0 z-40 flex w-72 flex-col border-r border-zinc-800 bg-zinc-950 p-6 transition-transform duration-300
        md:sticky md:translate-x-0 h-[calc(100vh-64px)] md:h-screen overflow-y-auto
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Bloco de Marca e Permissões (Escondido no mobile para economizar espaço se quiser, mas mantido) */}
        <div>
          <div className="hidden md:block">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={companyName}
                className="mb-4 h-20 w-20 rounded-2xl object-cover ring-2 ring-zinc-800"
              />
            )}
            <h1 className="text-2xl font-bold">{companyName}</h1>
            <p className="mt-1 text-sm text-zinc-500">Painel administrativo</p>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Permissão real</p>
            <strong className="mt-1 block text-sm">
              {userRoleOptions.find((item) => item.value === realUserRole)?.label || realUserRole}
            </strong>
            {visualRole && (
              <p className="mt-2 rounded-lg bg-yellow-900/40 px-3 py-2 text-xs font-bold text-yellow-300">
                Visualizando como {userRoleOptions.find((item) => item.value === visualRole)?.label || visualRole}
              </p>
            )}
          </div>

          <div className="mt-3 rounded-xl border border-blue-900 bg-blue-950/30 p-3">
            <label className="text-xs uppercase tracking-wide text-blue-300">Visualizar como</label>
            <select
              value={visualRole}
              onChange={(event) => handleVisualRoleChange(event.target.value as UserRole | '')}
              className="mt-2 w-full rounded-lg border border-blue-900 bg-black p-2 text-sm text-white outline-none"
            >
              <option value="">Permissão real</option>
              {userRoleOptions.map((roleOption) => (
                <option key={roleOption.value} value={roleOption.value}>
                  {roleOption.label}
                </option>
              ))}
            </select>
            {visualRole && (
              <button
                type="button"
                onClick={() => handleVisualRoleChange('')}
                className="mt-3 w-full rounded-lg bg-white p-2 text-sm font-bold text-black transition hover:bg-zinc-200"
              >
                Voltar
              </button>
            )}
          </div>
        </div>

        {/* Links do Menu */}
        <nav className="mt-8 space-y-1">
          {allowedMenuItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl p-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-white font-bold text-black'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-black' : 'text-zinc-400'}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto mb-4 md:mb-0 flex items-center justify-center gap-2 rounded-xl bg-white p-3 font-bold text-black transition hover:bg-zinc-200"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </aside>

      {/* CONTEÚDO PRINCIPAL DO DASHBOARD */}
      <main className="flex-1 p-4 sm:p-6 md:p-10 overflow-x-hidden">
        {loadingPermissions ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-8 py-6">
              <p className="text-zinc-400">Carregando permissões...</p>
            </div>
          </div>
        ) : subscriptionBlocked ? (
          <div className="flex min-h-[70vh] items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-3xl border border-red-900 bg-red-950/30 p-6 sm:p-8 text-center shadow-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-2xl font-bold text-white">
                !
              </div>
              <h2 className="mt-6 text-2xl sm:text-3xl font-bold">Assinatura indisponível</h2>
              <p className="mt-4 text-red-100 text-sm sm:text-base">{subscriptionBlockMessage}</p>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-8 rounded-xl bg-white px-6 py-3 font-bold text-black transition hover:bg-zinc-200"
              >
                Sair
              </button>
            </div>
          </div>
        ) : (
          children
        )}
      </main>

    </div>
  )
}