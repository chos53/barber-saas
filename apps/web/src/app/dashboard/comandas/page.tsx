'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string
  name: string
}

type Comanda = {
  id: string
  client_id: string | null
  status: string
  total: number
  created_at: string
  client_name: string
}

export default function ComandasPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [notes, setNotes] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

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

    const { data: comandasData } = await supabase
      .from('comandas')
      .select('id, client_id, status, total, created_at')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    const clientsMap = new Map(
      (clientsData || []).map((client) => [client.id, client.name])
    )

    const normalizedComandas =
      comandasData?.map((comanda) => ({
        ...comanda,
        client_name: comanda.client_id
          ? clientsMap.get(comanda.client_id) || 'Cliente não informado'
          : 'Cliente não informado',
      })) || []

    setClients(clientsData || [])
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
      alert('Erro ao criar comanda.')
      console.error(error)
      return
    }

    setSelectedClientId('')
    setNotes('')
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

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Comandas</h2>

            <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-400">
              {comandas.length} registro(s)
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {comandas.length === 0 && (
              <p className="rounded-xl bg-zinc-800 p-4 text-zinc-500">
                Nenhuma comanda encontrada.
              </p>
            )}

            {comandas.map((comanda) => (
              <div
                key={comanda.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-800 p-5"
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}