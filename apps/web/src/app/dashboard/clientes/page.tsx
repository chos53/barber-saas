'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string
  name: string
  phone: string | null
  email: string | null
  birth_date: string | null
  active: boolean
}

type LoyaltyStats = {
  completedAppointments: number
  redemptions: number
  rewardsAvailable: number
  progress: number
  remaining: number
}

type LoyaltyRedemption = {
  id: string
  company_id: string
  client_id: string
  reward_description: string
  created_at: string
}

type LoyaltySettings = {
  enabled: boolean
  goal_count: number
  reward_description: string
}

type ClientComandaItem = {
  id: string
  comanda_id: string
  description: string
  quantity: number
  price: number
  product_id?: string | null
  professional_id?: string | null
}

type ClientComandaHistory = {
  id: string
  client_id: string
  status: string
  total: number
  discount?: number | null
  discount_type?: 'amount' | 'percentage' | null
  discount_value?: number | null
  surcharge?: number | null
  surcharge_type?: 'amount' | 'percentage' | null
  surcharge_value?: number | null
  created_at: string
  closed_at?: string | null
  items: ClientComandaItem[]
}

type ClientCrmStats = {
  visits: number
  totalSpent: number
  averageTicket: number
  lastVisit: string | null
  comandas: ClientComandaHistory[]
}

type ClientRankingItem = {
  client: Client
  stats: ClientCrmStats
}

const defaultLoyaltySettings: LoyaltySettings = {
  enabled: true,
  goal_count: 10,
  reward_description: 'Recompensa de fidelidade',
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [crmByClient, setCrmByClient] = useState<Record<string, ClientCrmStats>>({})
  const [loyaltyByClient, setLoyaltyByClient] = useState<Record<string, LoyaltyStats>>({})
  const [loyaltyRedemptions, setLoyaltyRedemptions] = useState<LoyaltyRedemption[]>([])
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>(defaultLoyaltySettings)
  const [userRole, setUserRole] = useState('')
  const [savingLoyaltySettings, setSavingLoyaltySettings] = useState(false)
  const [redeemingClient, setRedeemingClient] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true)
  const [loyaltyGoalValue, setLoyaltyGoalValue] = useState('10')
  const [loyaltyRewardDescription, setLoyaltyRewardDescription] = useState('Recompensa de fidelidade')

  const [editingClientId, setEditingClientId] = useState('')
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editBirthDate, setEditBirthDate] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const filteredClients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return clients.filter((client) => {
      if (!normalizedSearch) return true

      return (
        client.name.toLowerCase().includes(normalizedSearch) ||
        String(client.phone || '').toLowerCase().includes(normalizedSearch) ||
        String(client.email || '').toLowerCase().includes(normalizedSearch)
      )
    })
  }, [clients, search])

  const activeClients = useMemo(() => {
    return clients.filter((client) => client.active).length
  }, [clients])

  const inactiveClients = useMemo(() => {
    return clients.filter((client) => !client.active).length
  }, [clients])

  const totalVisits = useMemo(() => {
    return Object.values(crmByClient).reduce(
      (sum, stats) => sum + Number(stats.visits || 0),
      0
    )
  }, [crmByClient])

  const totalSpent = useMemo(() => {
    return Object.values(crmByClient).reduce(
      (sum, stats) => sum + Number(stats.totalSpent || 0),
      0
    )
  }, [crmByClient])

  const averageTicket = useMemo(() => {
    if (totalVisits <= 0) return 0

    return totalSpent / totalVisits
  }, [totalSpent, totalVisits])

  const clientsWithVisit = useMemo(() => {
    return clients.filter((client) => Number(crmByClient[client.id]?.visits || 0) > 0).length
  }, [clients, crmByClient])

  const topClientsByRevenue = useMemo<ClientRankingItem[]>(() => {
    return clients
      .map((client) => ({
        client,
        stats: getClientCrmStats(client.id),
      }))
      .filter((item) => item.stats.totalSpent > 0)
      .sort((a, b) => b.stats.totalSpent - a.stats.totalSpent)
      .slice(0, 10)
  }, [clients, crmByClient])

  const topClientsByVisits = useMemo<ClientRankingItem[]>(() => {
    return clients
      .map((client) => ({
        client,
        stats: getClientCrmStats(client.id),
      }))
      .filter((item) => item.stats.visits > 0)
      .sort((a, b) => b.stats.visits - a.stats.visits)
      .slice(0, 10)
  }, [clients, crmByClient])

  const inactiveClientsByVisit = useMemo<ClientRankingItem[]>(() => {
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    return clients
      .map((client) => ({
        client,
        stats: getClientCrmStats(client.id),
      }))
      .filter((item) => {
        if (!item.client.active) return false
        if (item.stats.visits <= 0) return false
        if (!item.stats.lastVisit) return false

        return new Date(item.stats.lastVisit).getTime() < sixtyDaysAgo.getTime()
      })
      .sort((a, b) => {
        return (
          new Date(a.stats.lastVisit || 0).getTime() -
          new Date(b.stats.lastVisit || 0).getTime()
        )
      })
      .slice(0, 10)
  }, [clients, crmByClient])

  const birthdayClientsThisMonth = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1

    return clients
      .filter((client) => {
        if (!client.birth_date) return false

        const [, month] = client.birth_date.split('-').map(Number)

        return month === currentMonth
      })
      .sort((a, b) => getBirthdayDay(a.birth_date) - getBirthdayDay(b.birth_date))
  }, [clients])

  const birthdayClientsToday = useMemo(() => {
    const today = new Date()
    const currentMonth = today.getMonth() + 1
    const currentDay = today.getDate()

    return clients.filter((client) => {
      if (!client.birth_date) return false

      const [, month, day] = client.birth_date.split('-').map(Number)

      return month === currentMonth && day === currentDay
    }).length
  }, [clients])

  const clientsWithoutBirthday = useMemo(() => {
    return clients.filter((client) => !client.birth_date).length
  }, [clients])

  const clientsWithReward = useMemo(() => {
    return clients.filter((client) => {
      const stats = loyaltyByClient[client.id]

      return Number(stats?.rewardsAvailable || 0) > 0
    }).length
  }, [clients, loyaltyByClient])

  const nearlyRewardClients = useMemo(() => {
    return clients.filter((client) => {
      const stats = loyaltyByClient[client.id]

      return (
        loyaltySettings.enabled &&
        Number(stats?.rewardsAvailable || 0) === 0 &&
        Number(stats?.progress || 0) >= Math.max(loyaltySettings.goal_count - 3, 1)
      )
    }).length
  }, [clients, loyaltyByClient])

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = '/login'
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) return

    setCompanyId(profile.company_id)
    setUserRole(String(profile.role || ''))

    const { data: loyaltySettingsData } = await supabase
      .from('company_loyalty_settings')
      .select('enabled, goal_count, reward_description')
      .eq('company_id', profile.company_id)
      .maybeSingle()

    const currentLoyaltySettings: LoyaltySettings = {
      enabled: Boolean(loyaltySettingsData?.enabled ?? defaultLoyaltySettings.enabled),
      goal_count: Number(loyaltySettingsData?.goal_count || defaultLoyaltySettings.goal_count),
      reward_description:
        loyaltySettingsData?.reward_description ||
        defaultLoyaltySettings.reward_description,
    }

    setLoyaltySettings(currentLoyaltySettings)
    setLoyaltyEnabled(currentLoyaltySettings.enabled)
    setLoyaltyGoalValue(String(currentLoyaltySettings.goal_count))
    setLoyaltyRewardDescription(currentLoyaltySettings.reward_description)

    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, name, phone, email, birth_date, active')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    const normalizedClients = clientsData || []

    setClients(normalizedClients)

    const clientIds = normalizedClients.map((client) => client.id)

    if (clientIds.length === 0) {
      setLoyaltyByClient({})
      setLoyaltyRedemptions([])
      setCrmByClient({})
      return
    }

    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, client_id, status')
      .eq('company_id', profile.company_id)
      .in('client_id', clientIds)
      .eq('status', 'completed')

    if (appointmentsError) {
      setLoyaltyByClient({})
      return
    }

    const { data: comandasData } = await supabase
      .from('comandas')
      .select(
        'id, client_id, status, total, discount, discount_type, discount_value, surcharge, surcharge_type, surcharge_value, created_at, closed_at'
      )
      .eq('company_id', profile.company_id)
      .in('client_id', clientIds)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })

    const closedComandaIds = (comandasData || []).map((comanda) => comanda.id)

    const { data: comandaItemsData } =
      closedComandaIds.length > 0
        ? await supabase
            .from('comanda_items')
            .select('id, comanda_id, description, quantity, price, product_id, professional_id')
            .in('comanda_id', closedComandaIds)
            .order('created_at', { ascending: true })
        : { data: [] }

    const itemsByComanda = new Map<string, ClientComandaItem[]>()

    ;(comandaItemsData || []).forEach((item: any) => {
      const currentItems = itemsByComanda.get(item.comanda_id) || []

      currentItems.push({
        id: item.id,
        comanda_id: item.comanda_id,
        description: item.description,
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        product_id: item.product_id || null,
        professional_id: item.professional_id || null,
      })

      itemsByComanda.set(item.comanda_id, currentItems)
    })

    const crmStatsByClient: Record<string, ClientCrmStats> = {}

    normalizedClients.forEach((client) => {
      crmStatsByClient[client.id] = {
        visits: 0,
        totalSpent: 0,
        averageTicket: 0,
        lastVisit: null,
        comandas: [],
      }
    })

    ;(comandasData || []).forEach((comanda: any) => {
      if (!comanda.client_id) return

      const items = itemsByComanda.get(comanda.id) || []
      const subtotal = items.reduce((sum, item) => {
        return sum + Number(item.price || 0) * Number(item.quantity || 0)
      }, 0)

      const discountValue = Number(comanda.discount_value ?? comanda.discount ?? 0)
      const discountType =
        comanda.discount_type === 'percentage' ? 'percentage' : 'amount'
      const discount =
        discountType === 'percentage'
          ? Math.min((subtotal * discountValue) / 100, subtotal)
          : Math.min(discountValue, subtotal)

      const surchargeValue = Number(comanda.surcharge_value ?? comanda.surcharge ?? 0)
      const surchargeType =
        comanda.surcharge_type === 'percentage' ? 'percentage' : 'amount'
      const surcharge =
        surchargeType === 'percentage'
          ? (subtotal * surchargeValue) / 100
          : surchargeValue

      const finalTotal = Math.max(subtotal - discount + surcharge, 0)
      const stats = crmStatsByClient[comanda.client_id] || {
        visits: 0,
        totalSpent: 0,
        averageTicket: 0,
        lastVisit: null,
        comandas: [],
      }

      stats.visits += 1
      stats.totalSpent += Number(finalTotal.toFixed(2))

      const visitDate = comanda.closed_at || comanda.created_at

      if (!stats.lastVisit || new Date(visitDate).getTime() > new Date(stats.lastVisit).getTime()) {
        stats.lastVisit = visitDate
      }

      stats.comandas.push({
        id: comanda.id,
        client_id: comanda.client_id,
        status: comanda.status,
        total: Number(finalTotal.toFixed(2)),
        discount: Number(comanda.discount || 0),
        discount_type: discountType,
        discount_value: discountValue,
        surcharge: Number(comanda.surcharge || 0),
        surcharge_type: surchargeType,
        surcharge_value: surchargeValue,
        created_at: comanda.created_at,
        closed_at: comanda.closed_at,
        items,
      })

      crmStatsByClient[comanda.client_id] = stats
    })

    Object.keys(crmStatsByClient).forEach((clientId) => {
      const stats = crmStatsByClient[clientId]

      stats.averageTicket =
        stats.visits > 0 ? Number((stats.totalSpent / stats.visits).toFixed(2)) : 0

      stats.comandas = stats.comandas
        .sort((a, b) => {
          return (
            new Date(b.closed_at || b.created_at).getTime() -
            new Date(a.closed_at || a.created_at).getTime()
          )
        })
        .slice(0, 5)
    })

    setCrmByClient(crmStatsByClient)

    const { data: redemptionsData, error: redemptionsError } = await supabase
      .from('loyalty_redemptions')
      .select('id, company_id, client_id, reward_description, created_at')
      .eq('company_id', profile.company_id)
      .in('client_id', clientIds)
      .order('created_at', { ascending: false })

    if (redemptionsError) {
      setLoyaltyRedemptions([])
    } else {
      setLoyaltyRedemptions((redemptionsData || []) as LoyaltyRedemption[])
    }

    const completedByClient: Record<string, number> = {}

    ;(appointmentsData || []).forEach((appointment) => {
      if (!appointment.client_id) return

      completedByClient[appointment.client_id] =
        (completedByClient[appointment.client_id] || 0) + 1
    })

    const redemptionsByClient: Record<string, number> = {}

    ;(redemptionsData || []).forEach((redemption) => {
      redemptionsByClient[redemption.client_id] =
        (redemptionsByClient[redemption.client_id] || 0) + 1
    })

    const nextLoyaltyByClient: Record<string, LoyaltyStats> = {}

    normalizedClients.forEach((client) => {
      const completedAppointments = completedByClient[client.id] || 0
      const redemptions = redemptionsByClient[client.id] || 0
      const earnedRewards = Math.floor(completedAppointments / currentLoyaltySettings.goal_count)
      const rewardsAvailable = Math.max(earnedRewards - redemptions, 0)
      const progress = completedAppointments % currentLoyaltySettings.goal_count
      const remaining = progress === 0 && completedAppointments > 0 ? 0 : currentLoyaltySettings.goal_count - progress

      nextLoyaltyByClient[client.id] = {
        completedAppointments,
        redemptions,
        rewardsAvailable,
        progress,
        remaining,
      }
    })

    setLoyaltyByClient(nextLoyaltyByClient)
  }

  async function createClient() {
    if (!name.trim()) {
      alert('Digite o nome do cliente.')
      return
    }

    const { error } = await supabase.from('clients').insert({
      company_id: companyId,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      birth_date: birthDate || null,
      active: true,
    })

    if (error) {
      alert(error.message)
      return
    }

    setName('')
    setPhone('')
    setEmail('')
    setBirthDate('')

    loadData()
  }

  function startEditing(client: Client) {
    setEditingClientId(client.id)
    setEditName(client.name)
    setEditPhone(client.phone || '')
    setEditEmail(client.email || '')
    setEditBirthDate(client.birth_date || '')
  }

  function cancelEditing() {
    setEditingClientId('')
    setEditName('')
    setEditPhone('')
    setEditEmail('')
    setEditBirthDate('')
  }

  async function updateClient(clientId: string) {
    if (!editName.trim()) {
      alert('Digite o nome do cliente.')
      return
    }

    const { error } = await supabase
      .from('clients')
      .update({
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        birth_date: editBirthDate || null,
      })
      .eq('id', clientId)

    if (error) {
      alert(error.message)
      return
    }

    cancelEditing()
    loadData()
  }

  async function toggleClientActive(
    clientId: string,
    active: boolean
  ) {
    const { error } = await supabase
      .from('clients')
      .update({
        active: !active,
      })
      .eq('id', clientId)

    if (error) {
      alert(error.message)
      return
    }

    loadData()
  }

  function getLoyaltyStats(clientId: string) {
    return (
      loyaltyByClient[clientId] || {
        completedAppointments: 0,
        redemptions: 0,
        rewardsAvailable: 0,
        progress: 0,
        remaining: loyaltySettings.goal_count,
      }
    )
  }

  function getProgressPercent(stats: LoyaltyStats) {
    if (stats.rewardsAvailable > 0) return 100

    return Math.min((stats.progress / loyaltySettings.goal_count) * 100, 100)
  }

  function getLoyaltyMessage(stats: LoyaltyStats) {
    if (stats.rewardsAvailable > 0) {
      return `${stats.rewardsAvailable} recompensa(s) disponível(is)`
    }

    if (stats.completedAppointments === 0) {
      return 'Ainda sem atendimentos concluídos'
    }

    return `Faltam ${stats.remaining} atendimento(s) para ganhar uma recompensa`
  }


  function getClientRedemptions(clientId: string) {
    return loyaltyRedemptions.filter((redemption) => redemption.client_id === clientId)
  }

  async function redeemReward(client: Client) {
    const stats = getLoyaltyStats(client.id)

    if (stats.rewardsAvailable <= 0) {
      alert('Este cliente ainda não possui recompensa disponível.')
      return
    }

    const confirmed = window.confirm(
      `Confirmar resgate de recompensa para ${client.name}?`
    )

    if (!confirmed) return

    setRedeemingClient((current) => ({
      ...current,
      [client.id]: true,
    }))

    const { error } = await supabase
      .from('loyalty_redemptions')
      .insert({
        company_id: companyId,
        client_id: client.id,
        reward_description: loyaltySettings.reward_description || defaultLoyaltySettings.reward_description,
      })

    setRedeemingClient((current) => ({
      ...current,
      [client.id]: false,
    }))

    if (error) {
      alert(`Erro ao resgatar recompensa: ${error.message}`)
      return
    }

    await loadData()
  }


  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value || 0))
  }

  function formatDateTime(value: string | null | undefined) {
    if (!value) return 'Sem registro'

    return new Date(value).toLocaleString('pt-BR')
  }

  function getClientCrmStats(clientId: string) {
    return (
      crmByClient[clientId] || {
        visits: 0,
        totalSpent: 0,
        averageTicket: 0,
        lastVisit: null,
        comandas: [],
      }
    )
  }

  function getComandaItemsDescription(comanda: ClientComandaHistory) {
    if (comanda.items.length === 0) return 'Sem itens registrados'

    return comanda.items
      .map((item) => {
        const quantity = Number(item.quantity || 0)

        return quantity > 1
          ? `${quantity}x ${item.description}`
          : item.description
      })
      .join(' + ')
  }

  function getBirthdayDay(value: string | null | undefined) {
    if (!value) return 99

    const [, , day] = value.split('-').map(Number)

    return day || 99
  }

  function formatBirthDate(value: string | null | undefined) {
    if (!value) return 'Data não informada'

    const [, month, day] = value.split('-')

    return `${day}/${month}`
  }

  function getBirthdayStatus(client: Client) {
    if (!client.birth_date) return null

    const today = new Date()
    const currentMonth = today.getMonth() + 1
    const currentDay = today.getDate()
    const [, birthMonth, birthDay] = client.birth_date.split('-').map(Number)

    if (birthMonth === currentMonth && birthDay === currentDay) {
      return {
        label: 'Aniversariante hoje',
        className: 'bg-green-500 text-black',
      }
    }

    if (birthMonth === currentMonth) {
      return {
        label: 'Aniversariante do mês',
        className: 'bg-purple-500 text-white',
      }
    }

    return null
  }

  function getWhatsAppBirthdayLink(client: Client) {
    const phoneNumbers = String(client.phone || '').replace(/\D/g, '')

    if (!phoneNumbers) return ''

    const message = encodeURIComponent(
      `Olá, ${client.name}! Feliz aniversário! A equipe da barbearia deseja muitas felicidades. Temos uma condição especial para você neste mês.`
    )

    return `https://wa.me/55${phoneNumbers}?text=${message}`
  }

  function getWhatsAppReturnLink(client: Client) {
    const phoneNumbers = String(client.phone || '').replace(/\D/g, '')

    if (!phoneNumbers) return ''

    const message = encodeURIComponent(
      `Olá, ${client.name}! Sentimos sua falta por aqui. Que tal agendar um novo horário na barbearia? Temos uma condição especial esperando por você.`
    )

    return `https://wa.me/55${phoneNumbers}?text=${message}`
  }

  function getDaysSinceLastVisit(value: string | null) {
    if (!value) return null

    const diffMs = Date.now() - new Date(value).getTime()

    return Math.floor(diffMs / 1000 / 60 / 60 / 24)
  }

  function renderRankingList(
    title: string,
    description: string,
    items: ClientRankingItem[],
    type: 'revenue' | 'visits' | 'inactive'
  ) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {title}
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {description}
            </p>
          </div>

          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300">
            {items.length} cliente(s)
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {items.length === 0 && (
            <p className="rounded-xl bg-black/30 p-4 text-sm text-zinc-500">
              Nenhum cliente encontrado para este ranking.
            </p>
          )}

          {items.map((item, index) => {
            const whatsappReturnLink = getWhatsAppReturnLink(item.client)
            const daysSinceLastVisit = getDaysSinceLastVisit(item.stats.lastVisit)

            return (
              <div
                key={item.client.id}
                className="rounded-xl border border-zinc-800 bg-black/30 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-black">
                        #{index + 1}
                      </span>

                      <strong className="text-white">
                        {item.client.name}
                      </strong>
                    </div>

                    <p className="mt-2 text-sm text-zinc-400">
                      {item.client.phone || 'Telefone não informado'}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Última visita: {item.stats.lastVisit ? formatDateTime(item.stats.lastVisit) : 'Sem registro'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-sm md:min-w-[280px]">
                    <div className="rounded-xl bg-zinc-900 p-3">
                      <p className="text-xs text-zinc-500">
                        Gasto
                      </p>

                      <strong className="mt-1 block text-green-400">
                        {formatCurrency(item.stats.totalSpent)}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-zinc-900 p-3">
                      <p className="text-xs text-zinc-500">
                        Visitas
                      </p>

                      <strong className="mt-1 block text-blue-300">
                        {item.stats.visits}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-zinc-900 p-3">
                      <p className="text-xs text-zinc-500">
                        Ticket
                      </p>

                      <strong className="mt-1 block text-purple-300">
                        {formatCurrency(item.stats.averageTicket)}
                      </strong>
                    </div>

                    <div className="rounded-xl bg-zinc-900 p-3">
                      <p className="text-xs text-zinc-500">
                        Sem visitar
                      </p>

                      <strong className={type === 'inactive' ? 'mt-1 block text-yellow-300' : 'mt-1 block text-zinc-300'}>
                        {daysSinceLastVisit === null ? '-' : `${daysSinceLastVisit}d`}
                      </strong>
                    </div>
                  </div>
                </div>

                {type === 'inactive' && (
                  whatsappReturnLink ? (
                    <a
                      href={whatsappReturnLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block rounded-lg bg-green-500 px-4 py-2 text-center text-sm font-bold text-black transition hover:bg-green-400"
                    >
                      Chamar no WhatsApp
                    </a>
                  ) : (
                    <p className="mt-3 rounded-lg bg-zinc-900 p-2 text-xs text-zinc-500">
                      Cadastre o telefone para liberar campanha de retorno.
                    </p>
                  )
                )}
              </div>
            )
          })}
        </div>
      </section>
    )
  }


  function canManageLoyaltySettings() {
    const normalizedRole = userRole.toLowerCase()

    return (
      normalizedRole === 'owner' ||
      normalizedRole === 'proprietario' ||
      normalizedRole === 'proprietário' ||
      normalizedRole === 'administrator' ||
      normalizedRole === 'admin' ||
      normalizedRole === 'administrador' ||
      normalizedRole === 'manager' ||
      normalizedRole === 'gerente'
    )
  }

  async function saveLoyaltySettings() {
    if (!companyId) {
      alert('Empresa não identificada.')
      return
    }

    const goalCount = Number(loyaltyGoalValue || 0)
    const rewardDescription = loyaltyRewardDescription.trim()

    if (goalCount <= 0) {
      alert('A quantidade para recompensa precisa ser maior que zero.')
      return
    }

    if (!rewardDescription) {
      alert('Informe a descrição da recompensa.')
      return
    }

    setSavingLoyaltySettings(true)

    const { error } = await supabase
      .from('company_loyalty_settings')
      .upsert(
        {
          company_id: companyId,
          enabled: loyaltyEnabled,
          goal_count: goalCount,
          reward_description: rewardDescription,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'company_id',
        }
      )

    setSavingLoyaltySettings(false)

    if (error) {
      alert(`Erro ao salvar configuração de fidelidade: ${error.message}`)
      return
    }

    await loadData()
  }

  return (
    <div>
      <h1 className="text-4xl font-bold">Clientes</h1>

      <p className="mt-2 text-zinc-400">
        Cadastro, histórico, aniversariantes, fidelidade e CRM dos clientes.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <div className="min-h-[150px] rounded-2xl border border-blue-900 bg-blue-950/30 p-5">
          <p className="text-sm text-blue-300">
            Clientes ativos
          </p>

          <strong className="mt-2 block break-words text-2xl font-bold text-white 2xl:text-3xl">
            {activeClients}
          </strong>
        </div>

        <div className="min-h-[150px] rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">
            Clientes inativos
          </p>

          <strong className="mt-2 block break-words text-2xl font-bold text-white 2xl:text-3xl">
            {inactiveClients}
          </strong>
        </div>

        <div className="min-h-[150px] rounded-2xl border border-green-900 bg-green-950/30 p-5">
          <p className="text-sm text-green-300">
            Total gasto
          </p>

          <strong className="mt-2 block break-words text-2xl font-bold text-white 2xl:text-3xl">
            {formatCurrency(totalSpent)}
          </strong>
        </div>

        <div className="min-h-[150px] rounded-2xl border border-purple-900 bg-purple-950/30 p-5">
          <p className="text-sm text-purple-300">
            Ticket médio
          </p>

          <strong className="mt-2 block break-words text-2xl font-bold text-white 2xl:text-3xl">
            {formatCurrency(averageTicket)}
          </strong>

          <p className="mt-2 text-xs text-purple-100">
            {clientsWithVisit} cliente(s) com visita
          </p>
        </div>

        <div className="min-h-[150px] rounded-2xl border border-pink-900 bg-pink-950/30 p-5">
          <p className="text-sm text-pink-300">
            Aniversariantes do mês
          </p>

          <strong className="mt-2 block break-words text-2xl font-bold text-white 2xl:text-3xl">
            {birthdayClientsThisMonth.length}
          </strong>

          <p className="mt-2 text-xs text-pink-100">
            {birthdayClientsToday} hoje
          </p>
        </div>

        <div className="min-h-[150px] rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">
            Sem nascimento
          </p>

          <strong className="mt-2 block break-words text-2xl font-bold text-white 2xl:text-3xl">
            {clientsWithoutBirthday}
          </strong>
        </div>

        <div className="min-h-[150px] rounded-2xl border border-orange-900 bg-orange-950/30 p-5">
          <p className="text-sm text-orange-300">
            Inativos 60+ dias
          </p>

          <strong className="mt-2 block break-words text-2xl font-bold text-white 2xl:text-3xl">
            {inactiveClientsByVisit.length}
          </strong>

          <p className="mt-2 text-xs text-orange-100">
            Clientes para campanha de retorno
          </p>
        </div>

        {loyaltySettings.enabled ? (
          <>
            <div className="min-h-[150px] rounded-2xl border border-green-900 bg-green-950/30 p-5">
              <p className="text-sm text-green-300">
                Com recompensa
              </p>

              <strong className="mt-2 block break-words text-2xl font-bold text-white 2xl:text-3xl">
                {clientsWithReward}
              </strong>
            </div>

            <div className="min-h-[150px] rounded-2xl border border-yellow-900 bg-yellow-950/30 p-5">
              <p className="text-sm text-yellow-300">
                Próximos da recompensa
              </p>

              <strong className="mt-2 block break-words text-2xl font-bold text-white 2xl:text-3xl">
                {nearlyRewardClients}
              </strong>

              <p className="mt-2 text-xs text-yellow-100">
                A até 3 atendimentos da recompensa
              </p>
            </div>
          </>
        ) : (
          <div className="min-h-[150px] rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
            <p className="text-sm text-zinc-400">
              Fidelidade
            </p>

            <strong className="mt-2 block break-words text-2xl font-bold text-white">
              Desativada
            </strong>

            <p className="mt-2 text-xs text-zinc-500">
              Ative nas configurações abaixo.
            </p>
          </div>
        )}
      </div>

      {canManageLoyaltySettings() && (
        <div className="mt-8 rounded-2xl border border-purple-900 bg-purple-950/20 p-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Configurações da fidelidade
              </h2>

              <p className="mt-1 text-sm text-purple-200">
                Defina se a fidelidade estará ativa, quantos atendimentos geram recompensa e qual será o benefício.
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                loyaltySettings.enabled
                  ? 'bg-green-500 text-black'
                  : 'bg-zinc-700 text-zinc-300'
              }`}
            >
              {loyaltySettings.enabled ? 'Ativa' : 'Desativada'}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[180px_220px_1fr_auto]">
            <label className="flex items-center gap-3 rounded-xl border border-purple-900 bg-black/30 p-3">
              <input
                type="checkbox"
                checked={loyaltyEnabled}
                onChange={(event) => setLoyaltyEnabled(event.target.checked)}
                className="h-5 w-5"
              />

              <span className="font-bold text-white">
                Fidelidade ativa
              </span>
            </label>

            <input
              type="number"
              min="1"
              step="1"
              value={loyaltyGoalValue}
              onChange={(event) => setLoyaltyGoalValue(event.target.value)}
              placeholder="Qtd. atendimentos"
              className="rounded-xl border border-purple-900 bg-black/30 p-3 text-white outline-none"
            />

            <input
              value={loyaltyRewardDescription}
              onChange={(event) => setLoyaltyRewardDescription(event.target.value)}
              placeholder="Descrição da recompensa. Ex: Corte grátis"
              className="rounded-xl border border-purple-900 bg-black/30 p-3 text-white outline-none"
            />

            <button
              type="button"
              onClick={saveLoyaltySettings}
              disabled={savingLoyaltySettings}
              className="rounded-xl bg-purple-500 px-5 py-3 font-bold text-white transition hover:bg-purple-400 disabled:opacity-50"
            >
              {savingLoyaltySettings ? 'Salvando...' : 'Salvar'}
            </button>
          </div>

          <p className="mt-3 text-sm text-purple-100">
            Regra atual: {loyaltySettings.enabled ? `${loyaltySettings.goal_count} atendimento(s) = ${loyaltySettings.reward_description}` : 'fidelidade desativada'}.
          </p>
        </div>
      )}



      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        {renderRankingList(
          'Top clientes por faturamento',
          'Clientes que mais gastaram em comandas fechadas.',
          topClientsByRevenue,
          'revenue'
        )}

        {renderRankingList(
          'Top clientes por frequência',
          'Clientes com mais visitas registradas no histórico.',
          topClientsByVisits,
          'visits'
        )}

        {renderRankingList(
          'Clientes inativos 60+ dias',
          'Clientes ativos que não retornam há mais de 60 dias.',
          inactiveClientsByVisit,
          'inactive'
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-pink-900 bg-pink-950/20 p-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Aniversariantes do mês
            </h2>

            <p className="mt-1 text-sm text-pink-200">
              Use esta lista para ações de relacionamento e campanhas pelo WhatsApp.
            </p>
          </div>

          <span className="rounded-full bg-pink-500 px-3 py-1 text-xs font-bold text-white">
            {birthdayClientsThisMonth.length} cliente(s)
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {birthdayClientsThisMonth.length === 0 && (
            <p className="rounded-xl bg-black/30 p-4 text-sm text-pink-100 xl:col-span-3">
              Nenhum aniversariante cadastrado para este mês.
            </p>
          )}

          {birthdayClientsThisMonth.map((client) => {
            const status = getBirthdayStatus(client)
            const whatsappLink = getWhatsAppBirthdayLink(client)

            return (
              <div
                key={client.id}
                className="rounded-xl border border-pink-900 bg-black/30 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="text-white">
                      {client.name}
                    </strong>

                    <p className="mt-1 text-sm text-pink-200">
                      Aniversário: {formatBirthDate(client.birth_date)}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {client.phone || 'Telefone não informado'}
                    </p>
                  </div>

                  {status && (
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${status.className}`}>
                      {status.label}
                    </span>
                  )}
                </div>

                {whatsappLink ? (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block rounded-lg bg-green-500 px-4 py-2 text-center text-sm font-bold text-black transition hover:bg-green-400"
                  >
                    Enviar WhatsApp
                  </a>
                ) : (
                  <p className="mt-3 rounded-lg bg-zinc-900 p-2 text-xs text-zinc-500">
                    Cadastre o telefone para liberar WhatsApp.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-8 grid gap-4 rounded-2xl bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">
          Cadastrar cliente
        </h2>

        <input
          placeholder="Nome"
          className="rounded-lg bg-zinc-800 p-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Telefone"
          className="rounded-lg bg-zinc-800 p-3"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          placeholder="Email"
          className="rounded-lg bg-zinc-800 p-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div>
          <label className="mb-2 block text-sm text-zinc-400">
            Data de nascimento
          </label>

          <input
            type="date"
            className="w-full rounded-lg bg-zinc-800 p-3"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>

        <button
          onClick={createClient}
          className="rounded-lg bg-white p-3 font-bold text-black"
        >
          Cadastrar cliente
        </button>
      </div>

      <div className="mt-8">
        <input
          placeholder="Pesquisar cliente por nome, telefone ou email..."
          className="w-full rounded-xl bg-zinc-900 p-4"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-8 space-y-3">
        {filteredClients.length === 0 && (
          <p className="rounded-xl bg-zinc-900 p-4 text-zinc-500">
            Nenhum cliente encontrado.
          </p>
        )}

        {filteredClients.map((client) => {
          const isEditing = editingClientId === client.id
          const loyaltyStats = getLoyaltyStats(client.id)
          const crmStats = getClientCrmStats(client.id)
          const progressPercent = getProgressPercent(loyaltyStats)

          return (
            <div
              key={client.id}
              className={`rounded-xl border p-4 ${
                loyaltySettings.enabled && loyaltyStats.rewardsAvailable > 0
                  ? 'border-green-700 bg-green-950/30'
                  : loyaltySettings.enabled && loyaltyStats.progress >= Math.max(loyaltySettings.goal_count - 3, 1)
                    ? 'border-yellow-700 bg-yellow-950/20'
                    : 'border-zinc-800 bg-zinc-900'
              }`}
            >
              {isEditing ? (
                <div className="grid gap-3">
                  <input
                    className="rounded-lg bg-zinc-800 p-3"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />

                  <input
                    className="rounded-lg bg-zinc-800 p-3"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />

                  <input
                    className="rounded-lg bg-zinc-800 p-3"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />

                  <div>
                    <label className="mb-2 block text-sm text-zinc-400">
                      Data de nascimento
                    </label>

                    <input
                      type="date"
                      className="w-full rounded-lg bg-zinc-800 p-3"
                      value={editBirthDate}
                      onChange={(e) => setEditBirthDate(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => updateClient(client.id)}
                      className="rounded-lg bg-green-600 px-4 py-2 font-bold"
                    >
                      Salvar
                    </button>

                    <button
                      onClick={cancelEditing}
                      className="rounded-lg bg-zinc-700 px-4 py-2 font-bold"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr_1.2fr]">
                    <div>
                      <p className="font-bold">{client.name}</p>

                      <p className="text-zinc-400">
                        {client.phone || 'Telefone não informado'}
                      </p>

                      <p className="text-zinc-500">
                        {client.email || 'Email não informado'}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <p className="text-sm text-zinc-500">
                          Nascimento: {formatBirthDate(client.birth_date)}
                        </p>

                        {getBirthdayStatus(client) && (
                          <span className={`rounded-full px-2 py-1 text-xs font-bold ${getBirthdayStatus(client)?.className}`}>
                            {getBirthdayStatus(client)?.label}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-zinc-500">
                        Status:{' '}
                        <span
                          className={
                            client.active
                              ? 'text-green-400'
                              : 'text-yellow-400'
                          }
                        >
                          {client.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </p>
                    </div>

                    <div className="w-full rounded-2xl border border-blue-900 bg-blue-950/20 p-4 xl:max-w-lg">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-white">
                            Histórico do cliente
                          </p>

                          <p className="mt-1 text-xs text-blue-200">
                            Mini CRM baseado em comandas fechadas.
                          </p>
                        </div>

                        <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-black">
                          {crmStats.visits} visita(s)
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm md:grid-cols-4">
                        <div className="rounded-xl bg-black/30 p-3">
                          <p className="text-xs text-zinc-500">
                            Total gasto
                          </p>

                          <strong className="mt-1 block text-green-400">
                            {formatCurrency(crmStats.totalSpent)}
                          </strong>
                        </div>

                        <div className="rounded-xl bg-black/30 p-3">
                          <p className="text-xs text-zinc-500">
                            Ticket médio
                          </p>

                          <strong className="mt-1 block text-purple-300">
                            {formatCurrency(crmStats.averageTicket)}
                          </strong>
                        </div>

                        <div className="rounded-xl bg-black/30 p-3">
                          <p className="text-xs text-zinc-500">
                            Visitas
                          </p>

                          <strong className="mt-1 block text-white">
                            {crmStats.visits}
                          </strong>
                        </div>

                        <div className="rounded-xl bg-black/30 p-3">
                          <p className="text-xs text-zinc-500">
                            Última visita
                          </p>

                          <strong className="mt-1 block text-xs text-white">
                            {crmStats.lastVisit
                              ? new Date(crmStats.lastVisit).toLocaleDateString('pt-BR')
                              : '-'}
                          </strong>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-200">
                          Últimos atendimentos / compras
                        </p>

                        <div className="mt-2 space-y-2">
                          {crmStats.comandas.length === 0 && (
                            <p className="rounded-lg bg-black/30 p-3 text-xs text-zinc-500">
                              Nenhuma comanda fechada encontrada.
                            </p>
                          )}

                          {crmStats.comandas.map((comanda) => (
                            <div
                              key={comanda.id}
                              className="rounded-lg bg-black/30 p-3 text-sm"
                            >
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <strong className="text-white">
                                    {formatDateTime(comanda.closed_at || comanda.created_at)}
                                  </strong>

                                  <p className="mt-1 text-xs text-zinc-400">
                                    {getComandaItemsDescription(comanda)}
                                  </p>
                                </div>

                                <strong className="text-green-400">
                                  {formatCurrency(comanda.total)}
                                </strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {loyaltySettings.enabled && (
                    <div className="w-full rounded-2xl border border-zinc-800 bg-black/30 p-4 xl:max-w-md">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-white">
                            Fidelidade
                          </p>

                          <p className="mt-1 text-xs text-zinc-400">
                            Regra: {loyaltySettings.goal_count} atendimento(s) concluído(s) = {loyaltySettings.reward_description}
                          </p>
                        </div>

                        {loyaltyStats.rewardsAvailable > 0 && (
                          <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-black">
                            Recompensa disponível
                          </span>
                        )}
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400">
                            Progresso
                          </span>

                          <strong className="text-white">
                            {loyaltyStats.rewardsAvailable > 0
                              ? `${loyaltySettings.goal_count}/${loyaltySettings.goal_count}`
                              : `${loyaltyStats.progress}/${loyaltySettings.goal_count}`}
                          </strong>
                        </div>

                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className={`h-full rounded-full ${
                              loyaltyStats.rewardsAvailable > 0
                                ? 'bg-green-500'
                                : loyaltyStats.progress >= 7
                                  ? 'bg-yellow-500'
                                  : 'bg-blue-500'
                            }`}
                            style={{
                              width: `${progressPercent}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm md:grid-cols-4">
                        <div className="rounded-xl bg-zinc-900 p-3">
                          <p className="text-xs text-zinc-500">
                            Concluídos
                          </p>

                          <strong className="mt-1 block text-white">
                            {loyaltyStats.completedAppointments}
                          </strong>
                        </div>

                        <div className="rounded-xl bg-zinc-900 p-3">
                          <p className="text-xs text-zinc-500">
                            Ciclo
                          </p>

                          <strong className="mt-1 block text-white">
                            {loyaltyStats.progress}/{loyaltySettings.goal_count}
                          </strong>
                        </div>

                        <div className="rounded-xl bg-zinc-900 p-3">
                          <p className="text-xs text-zinc-500">
                            Disponíveis
                          </p>

                          <strong className="mt-1 block text-green-400">
                            {loyaltyStats.rewardsAvailable}
                          </strong>
                        </div>

                        <div className="rounded-xl bg-zinc-900 p-3">
                          <p className="text-xs text-zinc-500">
                            Resgates
                          </p>

                          <strong className="mt-1 block text-yellow-400">
                            {loyaltyStats.redemptions}
                          </strong>
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-zinc-300">
                        {getLoyaltyMessage(loyaltyStats)}
                      </p>

                      {loyaltyStats.rewardsAvailable > 0 && (
                        <button
                          type="button"
                          onClick={() => redeemReward(client)}
                          disabled={redeemingClient[client.id]}
                          className="mt-3 w-full rounded-xl bg-green-500 px-4 py-3 font-bold text-black transition hover:bg-green-400 disabled:opacity-50"
                        >
                          {redeemingClient[client.id] ? 'Resgatando...' : 'Resgatar recompensa'}
                        </button>
                      )}

                      <div className="mt-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                          Histórico de resgates
                        </p>

                        <div className="mt-2 space-y-2">
                          {getClientRedemptions(client.id).length === 0 && (
                            <p className="rounded-lg bg-zinc-900 p-2 text-xs text-zinc-500">
                              Nenhum resgate registrado.
                            </p>
                          )}

                          {getClientRedemptions(client.id)
                            .slice(0, 3)
                            .map((redemption) => (
                              <div
                                key={redemption.id}
                                className="rounded-lg bg-zinc-900 p-2 text-xs text-zinc-300"
                              >
                                <strong className="text-green-400">
                                  {redemption.reward_description}
                                </strong>
                                {' '}em{' '}
                                {new Date(redemption.created_at).toLocaleString('pt-BR')}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => startEditing(client)}
                      className="rounded-lg bg-white px-4 py-2 font-bold text-black"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() =>
                        toggleClientActive(
                          client.id,
                          client.active
                        )
                      }
                      className="rounded-lg bg-yellow-600 px-4 py-2 font-bold text-black"
                    >
                      {client.active ? 'Inativar' : 'Ativar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
