'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string
  name: string
  phone: string | null
  email: string | null
  active: boolean
}

type LoyaltyStats = {
  completedAppointments: number
  rewardsAvailable: number
  progress: number
  remaining: number
}

const loyaltyGoal = 10

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loyaltyByClient, setLoyaltyByClient] = useState<Record<string, LoyaltyStats>>({})
  const [search, setSearch] = useState('')

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [companyId, setCompanyId] = useState('')

  const [editingClientId, setEditingClientId] = useState('')
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')

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
        Number(stats?.rewardsAvailable || 0) === 0 &&
        Number(stats?.progress || 0) >= 7
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
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) return

    setCompanyId(profile.company_id)

    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, name, phone, email, active')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    const normalizedClients = clientsData || []

    setClients(normalizedClients)

    const clientIds = normalizedClients.map((client) => client.id)

    if (clientIds.length === 0) {
      setLoyaltyByClient({})
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

    const completedByClient: Record<string, number> = {}

    ;(appointmentsData || []).forEach((appointment) => {
      if (!appointment.client_id) return

      completedByClient[appointment.client_id] =
        (completedByClient[appointment.client_id] || 0) + 1
    })

    const nextLoyaltyByClient: Record<string, LoyaltyStats> = {}

    normalizedClients.forEach((client) => {
      const completedAppointments = completedByClient[client.id] || 0
      const rewardsAvailable = Math.floor(completedAppointments / loyaltyGoal)
      const progress = completedAppointments % loyaltyGoal
      const remaining = progress === 0 && completedAppointments > 0 ? 0 : loyaltyGoal - progress

      nextLoyaltyByClient[client.id] = {
        completedAppointments,
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
      active: true,
    })

    if (error) {
      alert(error.message)
      return
    }

    setName('')
    setPhone('')
    setEmail('')

    loadData()
  }

  function startEditing(client: Client) {
    setEditingClientId(client.id)
    setEditName(client.name)
    setEditPhone(client.phone || '')
    setEditEmail(client.email || '')
  }

  function cancelEditing() {
    setEditingClientId('')
    setEditName('')
    setEditPhone('')
    setEditEmail('')
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
        rewardsAvailable: 0,
        progress: 0,
        remaining: loyaltyGoal,
      }
    )
  }

  function getProgressPercent(stats: LoyaltyStats) {
    if (stats.rewardsAvailable > 0) return 100

    return Math.min((stats.progress / loyaltyGoal) * 100, 100)
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

  return (
    <div>
      <h1 className="text-4xl font-bold">Clientes</h1>

      <p className="mt-2 text-zinc-400">
        Cadastro, busca e acompanhamento de fidelidade dos clientes.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-blue-900 bg-blue-950/30 p-5">
          <p className="text-sm text-blue-300">
            Clientes ativos
          </p>

          <strong className="mt-2 block text-3xl text-white">
            {activeClients}
          </strong>
        </div>

        <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">
            Clientes inativos
          </p>

          <strong className="mt-2 block text-3xl text-white">
            {inactiveClients}
          </strong>
        </div>

        <div className="rounded-2xl border border-green-900 bg-green-950/30 p-5">
          <p className="text-sm text-green-300">
            Com recompensa
          </p>

          <strong className="mt-2 block text-3xl text-white">
            {clientsWithReward}
          </strong>
        </div>

        <div className="rounded-2xl border border-yellow-900 bg-yellow-950/30 p-5">
          <p className="text-sm text-yellow-300">
            Próximos da recompensa
          </p>

          <strong className="mt-2 block text-3xl text-white">
            {nearlyRewardClients}
          </strong>

          <p className="mt-2 text-xs text-yellow-100">
            7 ou mais atendimentos no ciclo
          </p>
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
          const progressPercent = getProgressPercent(loyaltyStats)

          return (
            <div
              key={client.id}
              className={`rounded-xl border p-4 ${
                loyaltyStats.rewardsAvailable > 0
                  ? 'border-green-700 bg-green-950/30'
                  : loyaltyStats.progress >= 7
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
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <p className="font-bold">{client.name}</p>

                      <p className="text-zinc-400">
                        {client.phone || 'Telefone não informado'}
                      </p>

                      <p className="text-zinc-500">
                        {client.email || 'Email não informado'}
                      </p>

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

                    <div className="w-full rounded-2xl border border-zinc-800 bg-black/30 p-4 xl:max-w-md">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-white">
                            Fidelidade
                          </p>

                          <p className="mt-1 text-xs text-zinc-400">
                            Regra: {loyaltyGoal} atendimentos concluídos = 1 recompensa
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
                              ? `${loyaltyGoal}/${loyaltyGoal}`
                              : `${loyaltyStats.progress}/${loyaltyGoal}`}
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

                      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
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
                            {loyaltyStats.progress}/{loyaltyGoal}
                          </strong>
                        </div>

                        <div className="rounded-xl bg-zinc-900 p-3">
                          <p className="text-xs text-zinc-500">
                            Recompensas
                          </p>

                          <strong className="mt-1 block text-green-400">
                            {loyaltyStats.rewardsAvailable}
                          </strong>
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-zinc-300">
                        {getLoyaltyMessage(loyaltyStats)}
                      </p>
                    </div>
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
