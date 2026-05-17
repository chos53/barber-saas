'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Professional = {
  id: string
  name: string
  phone: string | null
  email: string | null
  role: string | null
  active: boolean
}

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [companyId, setCompanyId] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')

  const [editingProfessionalId, setEditingProfessionalId] = useState('')
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('')

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
      .from('professionals')
      .select('id, name, phone, email, role, active')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    setProfessionals(data || [])
  }

  async function createProfessional() {
    if (!name.trim()) {
      alert('Digite o nome do profissional.')
      return
    }

    const { error } = await supabase.from('professionals').insert({
      company_id: companyId,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      role: role.trim(),
      active: true,
    })

    if (error) {
      alert(error.message)
      return
    }

    setName('')
    setPhone('')
    setEmail('')
    setRole('')

    loadData()
  }

  function startEditing(professional: Professional) {
    setEditingProfessionalId(professional.id)
    setEditName(professional.name)
    setEditPhone(professional.phone || '')
    setEditEmail(professional.email || '')
    setEditRole(professional.role || '')
  }

  function cancelEditing() {
    setEditingProfessionalId('')
    setEditName('')
    setEditPhone('')
    setEditEmail('')
    setEditRole('')
  }

  async function updateProfessional(professionalId: string) {
    if (!editName.trim()) {
      alert('Digite o nome do profissional.')
      return
    }

    const { error } = await supabase
      .from('professionals')
      .update({
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        role: editRole.trim(),
      })
      .eq('id', professionalId)

    if (error) {
      alert(error.message)
      return
    }

    cancelEditing()
    loadData()
  }

  async function deleteProfessional(professionalId: string) {
    const confirmed = confirm(
      'Tem certeza que deseja excluir este profissional?'
    )

    if (!confirmed) {
      return
    }

    const { error } = await supabase
      .from('professionals')
      .delete()
      .eq('id', professionalId)

    if (error) {
      alert(error.message)
      return
    }

    loadData()
  }

  async function toggleProfessionalActive(
    professionalId: string,
    active: boolean
  ) {
    const { error } = await supabase
      .from('professionals')
      .update({ active: !active })
      .eq('id', professionalId)

    if (error) {
      alert(error.message)
      return
    }

    loadData()
  }

  return (
    <div>
      <h1 className="text-4xl font-bold">Profissionais</h1>

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

        <input
          placeholder="Função. Ex: Barbeiro, Cabeleireira"
          className="rounded-lg bg-zinc-800 p-3"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />

        <button
          onClick={createProfessional}
          className="rounded-lg bg-white p-3 font-bold text-black"
        >
          Cadastrar profissional
        </button>
      </div>

      <div className="mt-8 space-y-3">
        {professionals.map((professional) => {
          const isEditing = editingProfessionalId === professional.id

          return (
            <div
              key={professional.id}
              className="rounded-xl bg-zinc-900 p-4"
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

                  <input
                    className="rounded-lg bg-zinc-800 p-3"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => updateProfessional(professional.id)}
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
                  <p className="font-bold">{professional.name}</p>

                  <p className="text-zinc-400">
                    {professional.role}
                  </p>

                  <p className="text-zinc-500">
                    {professional.phone}
                  </p>

                  <p className="text-zinc-500">
                    {professional.email}
                  </p>

                  <p className="mt-2 text-sm text-zinc-500">
                    Status:{' '}
                    {professional.active ? 'Ativo' : 'Inativo'}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => startEditing(professional)}
                      className="rounded-lg bg-white px-4 py-2 font-bold text-black"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() =>
                        toggleProfessionalActive(
                          professional.id,
                          professional.active
                        )
                      }
                      className="rounded-lg bg-yellow-600 px-4 py-2 font-bold text-black"
                    >
                      {professional.active ? 'Inativar' : 'Ativar'}
                    </button>

                    <button
                      onClick={() => deleteProfessional(professional.id)}
                      className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white"
                    >
                      Excluir
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