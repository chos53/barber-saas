'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string
  name: string
  phone: string | null
  email: string | null
  active: boolean
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
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

    const { data } = await supabase
      .from('clients')
      .select('id, name, phone, email, active')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    setClients(data || [])
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

  return (
    <div>
      <h1 className="text-4xl font-bold">Clientes</h1>

      <div className="mt-8 grid gap-4 rounded-2xl bg-zinc-900 p-6">
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

      <div className="mt-8 space-y-3">
        {clients.map((client) => {
          const isEditing = editingClientId === client.id

          return (
            <div key={client.id} className="rounded-xl bg-zinc-900 p-4">
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
                  <p className="font-bold">{client.name}</p>

                  <p className="text-zinc-400">
                    {client.phone}
                  </p>

                  <p className="text-zinc-500">
                    {client.email}
                  </p>

                  <p className="mt-2 text-sm text-zinc-500">
                    Status:{' '}
                    <span
                      className={client.active ? 'text-green-400' : 'text-yellow-400'}
                    >
                      {client.active ? 'Ativo' : 'Inativo'}
                    </span>
               
                  </p>

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