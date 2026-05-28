'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Client = { id: string; name: string }
type Service = { id: string; name: string; price: number }
type Professional = { id: string; name: string }

type ComandaItem = {
  id: string
  comanda_id: string
  description: string
  quantity: number
  price: number
  professional_id?: string | null
  professional_name?: string | null
}

type Comanda = {
  id: string
  client_id: string | null
  status: string
  is_priority?: boolean
  total: number
  notes?: string | null
  created_at: string
  closed_at?: string | null
  cancelled_at?: string | null
  client_name: string
  items: ComandaItem[]
}

const paymentMethods = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'credit_card', label: 'Crédito' },
  { value: 'debit_card', label: 'Débito' },
]

const statusFilters = [
  { value: 'all', label: 'Todas' },
  { value: 'open', label: 'Abertas' },
  { value: 'closed', label: 'Fechadas' },
  { value: 'cancelled', label: 'Canceladas' },
]

export default function ComandasPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [notes, setNotes] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityOnly, setPriorityOnly] = useState(false)
  const [selectedServices, setSelectedServices] = useState<Record<string, string>>({})
  const [selectedProfessionals, setSelectedProfessionals] = useState<Record<string, string>>({})
  const [paymentByComanda, setPaymentByComanda] = useState<Record<string, string>>({})
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({})
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})
  const [savingPriority, setSavingPriority] = useState<Record<string, boolean>>({})
  const [, forceClock] = useState(0)

useEffect(() => {
  const interval = setInterval(() => {
    forceClock(Date.now())
  }, 60000)

  return () => clearInterval(interval)
}, [])

  useEffect(() => {
    loadData()
  }, [])

  function getSortGroup(comanda: Comanda) {
    if (comanda.status === 'open' && comanda.is_priority) return 1
    if (comanda.status === 'open') return 2
    if (comanda.status === 'closed' && comanda.is_priority) return 3
    if (comanda.status === 'closed') return 4
    if (comanda.status === 'cancelled') return 5
    return 6
  }

  function getSortDate(comanda: Comanda) {
    return new Date(
      comanda.closed_at || comanda.cancelled_at || comanda.created_at
    ).getTime()
  }

  function sortComandas(a: Comanda, b: Comanda) {
    const groupA = getSortGroup(a)
    const groupB = getSortGroup(b)

    if (groupA !== groupB) {
      return groupA - groupB
    }

    return getSortDate(b) - getSortDate(a)
  }

  const filteredComandas = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return comandas
      .filter((comanda) => {
        const matchesSearch =
          !normalizedSearch ||
          comanda.client_name.toLowerCase().includes(normalizedSearch)

        const matchesStatus =
          statusFilter === 'all' || comanda.status === statusFilter

        const matchesPriority =
          !priorityOnly || Boolean(comanda.is_priority)

        return matchesSearch && matchesStatus && matchesPriority
      })
      .sort(sortComandas)
  }, [comandas, search, statusFilter, priorityOnly])

  const openComandas = useMemo(() => {
    return filteredComandas
      .filter((comanda) => comanda.status === 'open')
      .sort((a, b) => {
        if (a.is_priority !== b.is_priority) {
          return a.is_priority ? -1 : 1
        }

        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        )
      })
  }, [filteredComandas])

  const historyComandas = useMemo(() => {
    return filteredComandas
      .filter((comanda) => comanda.status !== 'open')
      .sort((a, b) => {
        if (a.is_priority !== b.is_priority) {
          return a.is_priority ? -1 : 1
        }

        const dateA = new Date(
          a.closed_at || a.cancelled_at || a.created_at
        ).getTime()

        const dateB = new Date(
          b.closed_at || b.cancelled_at || b.created_at
        ).getTime()

        return dateB - dateA
      })
  }, [filteredComandas])

  const openCount = useMemo(() => {
    return comandas.filter((comanda) => comanda.status === 'open').length
  }, [comandas])

  const openTotal = useMemo(() => {
    return comandas
      .filter((comanda) => comanda.status === 'open')
      .reduce((sum, comanda) => sum + Number(comanda.total), 0)
  }, [comandas])

  const closedTotal = useMemo(() => {
    return comandas
      .filter((comanda) => comanda.status === 'closed')
      .reduce((sum, comanda) => sum + Number(comanda.total), 0)
  }, [comandas])

  const cancelledTotal = useMemo(() => {
    return comandas
      .filter((comanda) => comanda.status === 'cancelled')
      .reduce((sum, comanda) => sum + Number(comanda.total), 0)
  }, [comandas])

  const totalItems = useMemo(() => {
    return comandas.reduce((sum, comanda) => {
      const itemsCount = comanda.items.reduce(
        (itemsSum, item) => itemsSum + Number(item.quantity),
        0
      )

      return sum + itemsCount
    }, 0)
  }, [comandas])

  const notesCount = useMemo(() => {
    return comandas.filter((comanda) => Boolean(comanda.notes?.trim())).length
  }, [comandas])

  const priorityCount = useMemo(() => {
    return comandas.filter((comanda) => comanda.is_priority).length
  }, [comandas])

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

    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, name')
      .eq('company_id', profile.company_id)
      .order('name', { ascending: true })

    const { data: servicesData } = await supabase
      .from('services')
      .select('id, name, price')
      .eq('company_id', profile.company_id)
      .order('name', { ascending: true })

    const { data: professionalsData } = await supabase
      .from('professionals')
      .select('id, name')
      .eq('company_id', profile.company_id)
      .eq('active', true)
      .order('name', { ascending: true })

    const { data: comandasData } = await supabase
      .from('comandas')
      .select(
        'id, client_id, status, total, notes, is_priority, created_at, closed_at, cancelled_at'
      )
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    const comandaIds = (comandasData || []).map((comanda) => comanda.id)

    const { data: itemsData } =
      comandaIds.length > 0
        ? await supabase
            .from('comanda_items')
            .select('id, comanda_id, description, quantity, price, professional_id')
            .in('comanda_id', comandaIds)
            .order('created_at', { ascending: true })
        : { data: [] }

    const clientsMap = new Map(
      (clientsData || []).map((client) => [client.id, client.name])
    )

    const professionalsMap = new Map(
      (professionalsData || []).map((professional) => [
        professional.id,
        professional.name,
      ])
    )

    const itemsByComanda = new Map<string, ComandaItem[]>()

    ;(itemsData || []).forEach((item) => {
      const currentItems = itemsByComanda.get(item.comanda_id) || []

      currentItems.push({
        id: item.id,
        comanda_id: item.comanda_id,
        description: item.description,
        quantity: Number(item.quantity),
        price: Number(item.price),
        professional_id: item.professional_id || null,
        professional_name: item.professional_id
          ? professionalsMap.get(item.professional_id) || 'Profissional não informado'
          : 'Profissional não informado',
      })

      itemsByComanda.set(item.comanda_id, currentItems)
    })

    const normalizedComandas =
      comandasData?.map((comanda) => ({
        ...comanda,
        total: Number(comanda.total),
        is_priority: Boolean(comanda.is_priority),
        client_name: comanda.client_id
          ? clientsMap.get(comanda.client_id) || 'Cliente não informado'
          : 'Cliente não informado',
        items: itemsByComanda.get(comanda.id) || [],
      })) || []

    setClients(clientsData || [])

    setServices(
      (servicesData || []).map((service) => ({
        ...service,
        price: Number(service.price),
      }))
    )

    setProfessionals(professionalsData || [])

    setComandas(normalizedComandas)

    const initialEditingNotes: Record<string, string> = {}

    normalizedComandas.forEach((comanda) => {
      initialEditingNotes[comanda.id] = comanda.notes || ''
    })

    setEditingNotes(initialEditingNotes)
  }

  async function saveNotes(comandaId: string) {
    const notesValue = editingNotes[comandaId] || ''

    setSavingNotes((current) => ({
      ...current,
      [comandaId]: true,
    }))

    const { error } = await supabase
      .from('comandas')
      .update({
        notes: notesValue || null,
      })
      .eq('id', comandaId)

    setSavingNotes((current) => ({
      ...current,
      [comandaId]: false,
    }))

    if (error) {
      alert(`Erro ao salvar observações: ${error.message}`)
      return
    }

    await loadData()
  }

  async function togglePriority(comanda: Comanda) {
    setSavingPriority((current) => ({
      ...current,
      [comanda.id]: true,
    }))

    const { error } = await supabase
      .from('comandas')
      .update({
        is_priority: !comanda.is_priority,
      })
      .eq('id', comanda.id)

    setSavingPriority((current) => ({
      ...current,
      [comanda.id]: false,
    }))

    if (error) {
      alert(`Erro ao atualizar prioridade: ${error.message}`)
      return
    }

    await loadData()
  }

  async function createComanda(event: React.FormEvent) {
    event.preventDefault()

    if (!companyId) {
      alert('Empresa não encontrada.')
      return
    }

    setLoading(true)

    const { error } = await supabase.from('comandas').insert({
      company_id: companyId,
      client_id: selectedClientId || null,
      status: 'open',
      total: 0,
      notes: notes || null,
      is_priority: false,
    })

    setLoading(false)

    if (error) {
      alert(`Erro ao criar comanda: ${error.message}`)
      return
    }

    setSelectedClientId('')
    setNotes('')

    await loadData()
  }

  async function addServiceToComanda(comanda: Comanda) {
    const serviceId = selectedServices[comanda.id]
    const professionalId = selectedProfessionals[comanda.id]

    if (!serviceId) {
      alert('Selecione um serviço.')
      return
    }

    if (!professionalId) {
      alert('Selecione o profissional que executou o serviço.')
      return
    }

    const service = services.find(
      (item) => item.id === serviceId
    )

    if (!service) {
      alert('Serviço não encontrado.')
      return
    }

    const { error: itemError } = await supabase
      .from('comanda_items')
      .insert({
        comanda_id: comanda.id,
        service_id: service.id,
        professional_id: professionalId,
        description: service.name,
        quantity: 1,
        price: service.price,
      })

    if (itemError) {
      alert(
        `Erro ao adicionar serviço: ${itemError.message}`
      )
      return
    }

    const newTotal =
      Number(comanda.total) + Number(service.price)

    const { error: totalError } = await supabase
      .from('comandas')
      .update({ total: newTotal })
      .eq('id', comanda.id)

    if (totalError) {
      alert(
        `Erro ao atualizar total: ${totalError.message}`
      )
      return
    }

    setSelectedServices((current) => ({
      ...current,
      [comanda.id]: '',
    }))

    setSelectedProfessionals((current) => ({
      ...current,
      [comanda.id]: '',
    }))

    await loadData()
  }

  async function removeItemFromComanda(
    comanda: Comanda,
    item: ComandaItem
  ) {
    if (comanda.status !== 'open') {
      alert(
        'Somente comandas abertas podem ter itens removidos.'
      )
      return
    }

    const { error: itemError } = await supabase
      .from('comanda_items')
      .delete()
      .eq('id', item.id)

    if (itemError) {
      alert(`Erro ao remover item: ${itemError.message}`)
      return
    }

    const removedValue =
      Number(item.price) * Number(item.quantity)

    const newTotal = Math.max(
      Number(comanda.total) - removedValue,
      0
    )

    const { error: totalError } = await supabase
      .from('comandas')
      .update({ total: newTotal })
      .eq('id', comanda.id)

    if (totalError) {
      alert(
        `Erro ao atualizar total: ${totalError.message}`
      )
      return
    }

    await loadData()
  }

  async function closeComanda(comanda: Comanda) {
    const paymentMethod =
      paymentByComanda[comanda.id]

    if (!paymentMethod) {
      alert('Selecione a forma de pagamento.')
      return
    }

    const { error: transactionError } =
      await supabase
        .from('financial_transactions')
        .insert({
          company_id: companyId,
          client_id: comanda.client_id,
          appointment_id: null,
          professional_id: null,
          type: 'income',
          category: 'comanda',
          description: `Comanda - ${comanda.client_name}`,
          amount: Number(comanda.total),
          payment_method: paymentMethod,
          status: 'paid',
          transaction_date:
            new Date().toISOString().split('T')[0],
        })

    if (transactionError) {
      alert(
        `Erro ao gerar entrada no financeiro: ${transactionError.message}`
      )
      return
    }

    const { error: comandaError } = await supabase
      .from('comandas')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', comanda.id)

    if (comandaError) {
      alert(
        `Erro ao fechar comanda: ${comandaError.message}`
      )
      return
    }

    setPaymentByComanda((current) => ({
      ...current,
      [comanda.id]: '',
    }))

    await loadData()
  }

  async function cancelComanda(comanda: Comanda) {
    const { error } = await supabase
      .from('comandas')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', comanda.id)

    if (error) {
      alert(`Erro ao cancelar comanda: ${error.message}`)
      return
    }

    await loadData()
  }
  function getOpenTime(comanda: Comanda) {
    if (comanda.status !== 'open') return null
  
    const created = new Date(comanda.created_at).getTime()
    const now = Date.now()
  
    const diffMinutes = Math.floor(
      (now - created) / 1000 / 60
    )
  
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
  
    if (hours <= 0) {
      return `${minutes} min aberta`
    }
  
    return `${hours}h ${minutes.toString().padStart(2, '0')}m aberta`
  }
  
  function getOpenTimeStyle(comanda: Comanda) {
    if (comanda.status !== 'open') {
      return 'bg-zinc-800 text-zinc-300'
    }
  
    const created = new Date(comanda.created_at).getTime()
    const now = Date.now()
  
    const diffMinutes = Math.floor(
      (now - created) / 1000 / 60
    )
  
    if (diffMinutes >= 60) {
      return 'bg-red-600 text-white'
    }
  
    if (diffMinutes >= 30) {
      return 'bg-yellow-500 text-black'
    }
  
    return 'bg-green-600 text-white'
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'open':
        return 'Aberta'
      case 'closed':
        return 'Fechada'
      case 'cancelled':
        return 'Cancelada'
      default:
        return status
    }
  }

  function renderComandaCard(comanda: Comanda) {
    const itemsCount = comanda.items.reduce(
      (sum, item) => sum + Number(item.quantity),
      0
    )

    return (
      <div
        key={comanda.id}
        className={`rounded-2xl border p-5 ${
          comanda.is_priority
            ? 'border-orange-500 bg-orange-950/20'
            : comanda.status === 'cancelled'
              ? 'border-red-900 bg-red-950/30'
              : 'border-zinc-800 bg-zinc-800'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold">
                {comanda.client_name}
              </p>

              {comanda.is_priority && (
                <span className="rounded-full bg-orange-500 px-2 py-1 text-xs font-bold text-black">
                  PRIORIDADE
                </span>
              )}
            </div>

            <div className="mt-1 space-y-1 text-sm text-zinc-500">
              <p>
                Criada em{' '}
                {new Date(comanda.created_at).toLocaleString('pt-BR')}
              </p>

              {comanda.closed_at && (
                <p>
                  Fechada em{' '}
                  {new Date(comanda.closed_at).toLocaleString('pt-BR')}
                </p>
              )}

              {comanda.cancelled_at && (
                <p>
                  Cancelada em{' '}
                  {new Date(comanda.cancelled_at).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          </div>

          <div className="text-right">
            <strong className="block text-xl text-green-400">
              R$ {Number(comanda.total).toFixed(2)}
            </strong>

            <p className="mt-1 text-sm text-zinc-400">
              {itemsCount} item(ns)
            </p>
            {comanda.status === 'open' && (
  <span
    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${getOpenTimeStyle(comanda)}`}
  >
    {getOpenTime(comanda)}
  </span>
)}
            <span
              className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-medium ${
                comanda.status === 'open'
                  ? 'bg-blue-900 text-blue-300'
                  : comanda.status === 'closed'
                    ? 'bg-green-900 text-green-300'
                    : 'bg-red-900 text-red-300'
              }`}
            >
              {getStatusLabel(comanda.status)}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-yellow-900 bg-yellow-950/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-yellow-400">
              Observações
            </p>

            {comanda.notes?.trim() && (
              <span className="rounded-full bg-yellow-400 px-2 py-1 text-xs font-bold text-black">
                Com observação
              </span>
            )}
          </div>

          <textarea
            value={editingNotes[comanda.id] || ''}
            onChange={(event) =>
              setEditingNotes((current) => ({
                ...current,
                [comanda.id]: event.target.value,
              }))
            }
            placeholder="Adicionar observações..."
            className="mt-2 h-24 w-full resize-none rounded-xl border border-yellow-900 bg-black/40 p-3 text-sm text-yellow-100 outline-none"
          />

          <button
            type="button"
            onClick={() => saveNotes(comanda.id)}
            disabled={savingNotes[comanda.id]}
            className="mt-3 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-black transition hover:bg-yellow-300 disabled:opacity-50"
          >
            {savingNotes[comanda.id] ? 'Salvando...' : 'Salvar observação'}
          </button>
        </div>

        <div className="mt-5 border-t border-zinc-700 pt-5">
          {comanda.status === 'open' && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
              <select
                value={selectedServices[comanda.id] || ''}
                onChange={(event) =>
                  setSelectedServices((current) => ({
                    ...current,
                    [comanda.id]: event.target.value,
                  }))
                }
                className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
              >
                <option value="">Selecionar serviço</option>

                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - R$ {service.price.toFixed(2)}
                  </option>
                ))}
              </select>

              <select
                value={selectedProfessionals[comanda.id] || ''}
                onChange={(event) =>
                  setSelectedProfessionals((current) => ({
                    ...current,
                    [comanda.id]: event.target.value,
                  }))
                }
                className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
              >
                <option value="">Selecionar profissional</option>

                {professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => addServiceToComanda(comanda)}
                className="rounded-xl bg-white px-5 py-3 font-bold text-black transition hover:bg-zinc-200"
              >
                Adicionar
              </button>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {comanda.items.length === 0 && (
              <p className="rounded-xl bg-zinc-900 p-3 text-sm text-zinc-500">
                Nenhum item adicionado.
              </p>
            )}

            {comanda.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-xl bg-zinc-900 p-3"
              >
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-sm text-zinc-500">
                    Quantidade: {item.quantity}
                  </p>

                  <p className="text-sm text-zinc-500">
                    Profissional: {item.professional_name || 'Não informado'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <strong className="text-green-400">
                    R$ {(item.price * item.quantity).toFixed(2)}
                  </strong>

                  {comanda.status === 'open' && (
                    <button
                      type="button"
                      onClick={() => removeItemFromComanda(comanda, item)}
                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-500"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {comanda.status === 'open' && (
            <div className="mt-5 grid grid-cols-1 gap-3 border-t border-zinc-700 pt-5 md:grid-cols-[1fr_auto_auto_auto]">
              <select
                value={paymentByComanda[comanda.id] || ''}
                onChange={(event) =>
                  setPaymentByComanda((current) => ({
                    ...current,
                    [comanda.id]: event.target.value,
                  }))
                }
                className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
              >
                <option value="">Forma de pagamento</option>

                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => togglePriority(comanda)}
                disabled={savingPriority[comanda.id]}
                className={`rounded-xl px-5 py-3 font-bold transition ${
                  comanda.is_priority
                    ? 'bg-orange-500 text-black hover:bg-orange-400'
                    : 'bg-zinc-700 text-white hover:bg-zinc-600'
                }`}
              >
                {savingPriority[comanda.id]
                  ? 'Salvando...'
                  : comanda.is_priority
                    ? 'Remover prioridade'
                    : 'Marcar prioridade'}
              </button>

              <button
                type="button"
                onClick={() => closeComanda(comanda)}
                className="rounded-xl bg-green-500 px-5 py-3 font-bold text-black transition hover:bg-green-400"
              >
                Fechar comanda
              </button>

              <button
                type="button"
                onClick={() => cancelComanda(comanda)}
                className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-500"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-4xl font-bold">
        Comandas
      </h1>

      <p className="mt-2 text-zinc-400">
        Controle de comandas abertas,
        fechamento e histórico.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
        <div className="rounded-2xl border border-blue-900 bg-blue-950/30 p-5">
          <p className="text-sm text-blue-300">
            Comandas abertas
          </p>

          <strong className="mt-2 block text-3xl font-bold text-white">
            {openCount}
          </strong>
        </div>

        <div className="rounded-2xl border border-yellow-900 bg-yellow-950/30 p-5">
          <p className="text-sm text-yellow-300">
            Valor em aberto
          </p>

          <strong className="mt-2 block text-3xl font-bold text-white">
            R$ {openTotal.toFixed(2)}
          </strong>
        </div>

        <div className="rounded-2xl border border-green-900 bg-green-950/30 p-5">
          <p className="text-sm text-green-300">
            Total fechado
          </p>

          <strong className="mt-2 block text-3xl font-bold text-white">
            R$ {closedTotal.toFixed(2)}
          </strong>
        </div>

        <div className="rounded-2xl border border-red-900 bg-red-950/30 p-5">
          <p className="text-sm text-red-300">
            Total cancelado
          </p>

          <strong className="mt-2 block text-3xl font-bold text-white">
            R$ {cancelledTotal.toFixed(2)}
          </strong>
        </div>

        <div className="rounded-2xl border border-purple-900 bg-purple-950/30 p-5">
          <p className="text-sm text-purple-300">
            Itens nas comandas
          </p>

          <strong className="mt-2 block text-3xl font-bold text-white">
            {totalItems}
          </strong>
        </div>

        <div className="rounded-2xl border border-yellow-900 bg-yellow-950/30 p-5">
          <p className="text-sm text-yellow-300">
            Com observações
          </p>

          <strong className="mt-2 block text-3xl font-bold text-white">
            {notesCount}
          </strong>
        </div>

        <button
          type="button"
          onClick={() => setPriorityOnly((current) => !current)}
          className={`rounded-2xl border p-5 text-left transition ${
            priorityOnly
              ? 'border-orange-500 bg-orange-500 text-black'
              : 'border-orange-900 bg-orange-950/30 text-white hover:bg-orange-950/50'
          }`}
        >
          <p className={priorityOnly ? 'text-sm text-black' : 'text-sm text-orange-300'}>
            Prioritárias
          </p>

          <strong className="mt-2 block text-3xl font-bold">
            {priorityCount}
          </strong>

          <span className="mt-2 block text-xs font-bold">
            {priorityOnly ? 'Filtro ativo' : 'Clique para filtrar'}
          </span>
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <form
          onSubmit={createComanda}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
        >
          <h2 className="text-2xl font-bold">
            Nova comanda
          </h2>

          <div className="mt-6">
            <label className="text-sm text-zinc-400">
              Cliente
            </label>

            <select
              value={selectedClientId}
              onChange={(event) =>
                setSelectedClientId(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
            >
              <option value="">
                Cliente não informado
              </option>

              {clients.map((client) => (
                <option
                  key={client.id}
                  value={client.id}
                >
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label className="text-sm text-zinc-400">
              Observações
            </label>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="Ex: cliente prefere pagar no pix"
              className="mt-2 h-28 w-full resize-none rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-white p-3 font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading
              ? 'Criando...'
              : 'Abrir comanda'}
          </button>
        </form>

        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">
                Filtros
              </h2>

              {priorityOnly && (
                <button
                  type="button"
                  onClick={() => setPriorityOnly(false)}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-orange-400"
                >
                  Limpar prioritárias
                </button>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar por cliente..."
                className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
              >
                {statusFilters.map((filter) => (
                  <option
                    key={filter.value}
                    value={filter.value}
                  >
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>

            <p className="mt-3 text-sm text-zinc-500">
              Exibindo {filteredComandas.length} de {comandas.length} comanda(s).
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Comandas abertas
              </h2>

              <span className="rounded-full bg-blue-900 px-3 py-1 text-sm text-blue-300">
                {openComandas.length} aberta(s)
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {openComandas.length === 0 && (
                <p className="rounded-xl bg-zinc-800 p-4 text-zinc-500">
                  Nenhuma comanda aberta encontrada.
                </p>
              )}

              {openComandas.map((comanda) =>
                renderComandaCard(comanda)
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Histórico de comandas
              </h2>

              <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-400">
                {historyComandas.length} registro(s)
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {historyComandas.length === 0 && (
                <p className="rounded-xl bg-zinc-800 p-4 text-zinc-500">
                  Nenhuma comanda fechada ou cancelada encontrada.
                </p>
              )}

              {historyComandas.map((comanda) =>
                renderComandaCard(comanda)
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}