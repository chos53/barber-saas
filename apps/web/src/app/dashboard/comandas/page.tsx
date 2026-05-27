'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string
  name: string
}

type Service = {
  id: string
  name: string
  price: number
}

type ComandaItem = {
  id: string
  comanda_id: string
  description: string
  quantity: number
  price: number
}

type Comanda = {
  id: string
  client_id: string | null
  status: string
  total: number
  created_at: string
  client_name: string
  items: ComandaItem[]
}

const paymentMethods = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'credit_card', label: 'Crédito' },
  { value: 'debit_card', label: 'Débito' },
  { value: 'bank_transfer', label: 'Transferência' },
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
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [notes, setNotes] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [selectedServices, setSelectedServices] = useState<Record<string, string>>({})
  const [paymentByComanda, setPaymentByComanda] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [])

  const filteredComandas = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return comandas.filter((comanda) => {
      const matchesSearch =
        !normalizedSearch ||
        comanda.client_name.toLowerCase().includes(normalizedSearch)

      const matchesStatus =
        statusFilter === 'all' || comanda.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [comandas, search, statusFilter])

  const openComandas = useMemo(() => {
    return filteredComandas.filter((comanda) => comanda.status === 'open')
  }, [filteredComandas])

  const historyComandas = useMemo(() => {
    return filteredComandas.filter((comanda) => comanda.status !== 'open')
  }, [filteredComandas])

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

    const { data: comandasData } = await supabase
      .from('comandas')
      .select('id, client_id, status, total, created_at')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    const comandaIds = (comandasData || []).map((comanda) => comanda.id)

    const { data: itemsData } =
      comandaIds.length > 0
        ? await supabase
            .from('comanda_items')
            .select('id, comanda_id, description, quantity, price')
            .in('comanda_id', comandaIds)
            .order('created_at', { ascending: true })
        : { data: [] }

    const clientsMap = new Map(
      (clientsData || []).map((client) => [client.id, client.name])
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
      })

      itemsByComanda.set(item.comanda_id, currentItems)
    })

    const normalizedComandas =
      comandasData?.map((comanda) => ({
        ...comanda,
        total: Number(comanda.total),
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

    setComandas(normalizedComandas)
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
    })

    setLoading(false)

    if (error) {
      alert(`Erro ao criar comanda: ${error.message}`)
      console.error(error)
      return
    }

    setSelectedClientId('')
    setNotes('')
    await loadData()
  }

  async function addServiceToComanda(comanda: Comanda) {
    const serviceId = selectedServices[comanda.id]

    if (!serviceId) {
      alert('Selecione um serviço.')
      return
    }

    const service = services.find((item) => item.id === serviceId)

    if (!service) {
      alert('Serviço não encontrado.')
      return
    }

    const { error: itemError } = await supabase.from('comanda_items').insert({
      comanda_id: comanda.id,
      service_id: service.id,
      description: service.name,
      quantity: 1,
      price: service.price,
    })

    if (itemError) {
      alert(`Erro ao adicionar serviço: ${itemError.message}`)
      console.error(itemError)
      return
    }

    const newTotal = Number(comanda.total) + Number(service.price)

    const { error: totalError } = await supabase
      .from('comandas')
      .update({ total: newTotal })
      .eq('id', comanda.id)

    if (totalError) {
      alert(`Serviço adicionado, mas houve erro ao atualizar o total: ${totalError.message}`)
      console.error(totalError)
      return
    }

    setSelectedServices((current) => ({
      ...current,
      [comanda.id]: '',
    }))

    await loadData()
  }

  async function removeItemFromComanda(comanda: Comanda, item: ComandaItem) {
    if (comanda.status !== 'open') {
      alert('Somente comandas abertas podem ter itens removidos.')
      return
    }

    const confirmRemove = confirm(
      `Remover "${item.description}" da comanda de ${comanda.client_name}?`
    )

    if (!confirmRemove) return

    const { error: itemError } = await supabase
      .from('comanda_items')
      .delete()
      .eq('id', item.id)
      .eq('comanda_id', comanda.id)

    if (itemError) {
      alert(`Erro ao remover item: ${itemError.message}`)
      console.error(itemError)
      return
    }

    const removedValue = Number(item.price) * Number(item.quantity)
    const newTotal = Math.max(Number(comanda.total) - removedValue, 0)

    const { error: totalError } = await supabase
      .from('comandas')
      .update({ total: newTotal })
      .eq('id', comanda.id)

    if (totalError) {
      alert(`Item removido, mas houve erro ao atualizar o total: ${totalError.message}`)
      console.error(totalError)
      return
    }

    await loadData()
  }

  async function closeComanda(comanda: Comanda) {
    const paymentMethod = paymentByComanda[comanda.id]

    if (!paymentMethod) {
      alert('Selecione a forma de pagamento.')
      return
    }

    if (comanda.items.length === 0 || Number(comanda.total) <= 0) {
      alert('Adicione pelo menos um item antes de fechar a comanda.')
      return
    }

    const confirmClose = confirm(
      `Fechar comanda de ${comanda.client_name} no valor de R$ ${Number(
        comanda.total
      ).toFixed(2)}?`
    )

    if (!confirmClose) return

    const { error: transactionError } = await supabase
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
        transaction_date: new Date().toISOString().split('T')[0],
      })

    if (transactionError) {
      alert(`Erro ao gerar entrada no financeiro: ${transactionError.message}`)
      console.error(transactionError)
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
      alert(`Entrada financeira criada, mas houve erro ao fechar a comanda: ${comandaError.message}`)
      console.error(comandaError)
      return
    }

    setPaymentByComanda((current) => ({
      ...current,
      [comanda.id]: '',
    }))

    await loadData()
  }

  async function cancelComanda(comanda: Comanda) {
    if (comanda.status !== 'open') {
      alert('Somente comandas abertas podem ser canceladas.')
      return
    }

    const confirmCancel = confirm(
      `Cancelar comanda de ${comanda.client_name} no valor de R$ ${Number(
        comanda.total
      ).toFixed(2)}?`
    )

    if (!confirmCancel) return

    const { error } = await supabase
      .from('comandas')
      .update({ status: 'cancelled' })
      .eq('id', comanda.id)

    if (error) {
      alert(`Erro ao cancelar comanda: ${error.message}`)
      console.error(error)
      return
    }

    await loadData()
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
    return (
      <div
        key={comanda.id}
        className={`rounded-2xl border p-5 ${
          comanda.status === 'cancelled'
            ? 'border-red-900 bg-red-950/30'
            : 'border-zinc-800 bg-zinc-800'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold">{comanda.client_name}</p>

            <p className="mt-1 text-sm text-zinc-500">
              Criada em{' '}
              {new Date(comanda.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="text-right">
            <strong className="block text-xl text-green-400">
              R$ {Number(comanda.total).toFixed(2)}
            </strong>

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

        <div className="mt-5 border-t border-zinc-700 pt-5">
          {comanda.status === 'open' && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
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
            <div className="mt-5 grid grid-cols-1 gap-3 border-t border-zinc-700 pt-5 md:grid-cols-[1fr_auto_auto]">
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

          {comanda.status === 'cancelled' && (
            <p className="mt-5 rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
              Esta comanda foi cancelada e não pode mais ser editada ou fechada.
            </p>
          )}

          {comanda.status === 'closed' && (
            <p className="mt-5 rounded-xl border border-green-900 bg-green-950/40 p-3 text-sm text-green-300">
              Esta comanda já foi fechada e lançada no financeiro.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-4xl font-bold">Comandas</h1>

      <p className="mt-2 text-zinc-400">
        Controle de comandas abertas, fechamento e histórico.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <form
          onSubmit={createComanda}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
        >
          <h2 className="text-2xl font-bold">Nova comanda</h2>

          <div className="mt-6">
            <label className="text-sm text-zinc-400">Cliente</label>

            <select
              value={selectedClientId}
              onChange={(event) => setSelectedClientId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
            >
              <option value="">Cliente não informado</option>

              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label className="text-sm text-zinc-400">Observações</label>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ex: cliente chegou sem horário marcado"
              className="mt-2 h-28 w-full resize-none rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-white p-3 font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Abrir comanda'}
          </button>
        </form>

        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-bold">Filtros</h2>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por cliente..."
                className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
              >
                {statusFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
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
              <h2 className="text-2xl font-bold">Comandas abertas</h2>

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

              {openComandas.map((comanda) => renderComandaCard(comanda))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Histórico de comandas</h2>

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

              {historyComandas.map((comanda) => renderComandaCard(comanda))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}