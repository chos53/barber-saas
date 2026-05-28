'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
}

const allRoles: UserRole[] = [
  'owner',
  'administrator',
  'manager',
  'reception',
  'barber',
  'financial',
]

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    roles: allRoles,
  },
  {
    label: 'Agenda',
    href: '/dashboard/agenda',
    roles: ['owner', 'administrator', 'manager', 'reception', 'barber'],
  },
  {
    label: 'Clientes',
    href: '/dashboard/clientes',
    roles: ['owner', 'administrator', 'manager', 'reception'],
  },
  {
    label: 'Serviços',
    href: '/dashboard/servicos',
    roles: ['owner', 'administrator', 'manager'],
  },
  {
    label: 'Profissionais',
    href: '/dashboard/profissionais',
    roles: ['owner', 'administrator', 'manager'],
  },
  {
    label: 'Financeiro',
    href: '/dashboard/financeiro',
    roles: ['owner', 'administrator', 'manager', 'financial'],
  },
  {
    label: 'Relatórios',
    href: '/dashboard/relatorios',
    roles: ['owner', 'administrator', 'manager', 'financial'],
  },
  {
    label: 'Comandas',
    href: '/dashboard/comandas',
    roles: ['owner', 'administrator', 'manager', 'reception', 'barber'],
  },
  {
    label: 'Configurações',
    href: '/dashboard/configuracoes',
    roles: ['owner', 'administrator'],
  },
]

function normalizeRole(role: string | null | undefined): UserRole {
  const normalized = String(role || 'reception').toLowerCase()

  if (normalized === 'owner') return 'owner'
  if (normalized === 'admin') return 'administrator'
  if (normalized === 'administrator') return 'administrator'
  if (normalized === 'manager') return 'manager'
  if (normalized === 'reception') return 'reception'
  if (normalized === 'barber') return 'barber'
  if (normalized === 'financial') return 'financial'

  return 'reception'
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  const [companyName, setCompanyName] = useState('Barber SaaS')
  const [logoUrl, setLogoUrl] = useState('')
  const [userRole, setUserRole] = useState<UserRole>('reception')
  const [loadingPermissions, setLoadingPermissions] = useState(true)

  useEffect(() => {
    loadCompanyBrand()
  }, [])

  const allowedMenuItems = useMemo(() => {
    return menuItems.filter((item) => item.roles.includes(userRole))
  }, [userRole])

  useEffect(() => {
    if (loadingPermissions) return

    const currentPageAllowed = menuItems.some(
      (item) => item.href === pathname && item.roles.includes(userRole)
    )

    const isDashboardRoot = pathname === '/dashboard'

    if (!currentPageAllowed && !isDashboardRoot) {
      router.push('/dashboard')
    }
  }, [pathname, router, userRole, loadingPermissions])

  async function loadCompanyBrand() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) return

    setUserRole(normalizeRole(profile.role))

    const { data: settings } = await supabase
      .from('company_settings')
      .select('company_name, logo_url')
      .eq('company_id', profile.company_id)
      .single()

    if (settings?.company_name) {
      setCompanyName(settings.company_name)
    }

    if (settings?.logo_url) {
      setLogoUrl(settings.logo_url)
    }

    setLoadingPermissions(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="flex min-h-screen bg-black text-white">
      <aside className="flex w-72 flex-col border-r border-zinc-800 bg-zinc-950 p-6">
        <div>
          {logoUrl && (
            <img
              src={logoUrl}
              alt={companyName}
              className="mb-4 h-20 w-20 rounded-2xl object-cover ring-2 ring-zinc-800"
            />
          )}

          <h1 className="text-2xl font-bold">{companyName}</h1>

          <p className="mt-1 text-sm text-zinc-500">
            Painel administrativo
          </p>

          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Permissão atual
            </p>

            <strong className="mt-1 block text-sm capitalize">
              {userRole}
            </strong>
          </div>
        </div>

        <nav className="mt-10 space-y-2">
          {allowedMenuItems.map((item) => {
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-xl p-3 transition ${
                  isActive
                    ? 'bg-white font-bold text-black'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto rounded-xl bg-white p-3 font-bold text-black transition hover:bg-zinc-200"
        >
          Sair
        </button>
      </aside>

      <section className="flex-1 p-10">
        {loadingPermissions ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-8 py-6">
              <p className="text-zinc-400">Carregando permissões...</p>
            </div>
          </div>
        ) : (
          children
        )}
      </section>
    </main>
  )
}