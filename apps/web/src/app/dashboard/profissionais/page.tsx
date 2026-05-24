'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

type Professional = {
  id: string
  name: string
  phone: string | null
  email: string | null
  role: string | null
  active: boolean
  photo_url: string | null
}

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [search, setSearch] = useState('')

  const [companyId, setCompanyId] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')

  const [editingProfessionalId, setEditingProfessionalId] =
    useState('')

  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const filteredProfessionals = useMemo(() => {
    return professionals.filter((professional) =>
      professional.name
        .toLowerCase()
        .includes(search.toLowerCase())
    )
  }, [professionals, search])

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
      .select(
        'id, name, phone, email, role, active, photo_url'
      )
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    setProfessionals(data || [])
  }

  async function uploadPhoto() {
    if (!photoFile) return ''

    const fileExt = photoFile.name.split('.').pop()

    const fileName = `${uuidv4()}.${fileExt}`

    const { error } = await supabase.storage
      .from('professionals')
      .upload(fileName, photoFile)

    if (error) {
      alert(error.message)
      return ''
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from('professionals')
      .getPublicUrl(fileName)

    return publicUrl
  }

  async function createProfessional() {
    if (!name.trim()) {
      alert('Digite o nome do profissional.')
      return
    }

    let photoUrl = ''

    if (photoFile) {
      photoUrl = await uploadPhoto()
    }

    const { error } = await supabase
      .from('professionals')
      .insert({
        company_id: companyId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        role: role.trim(),
        photo_url: photoUrl || null,
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
    setPhotoFile(null)
    setPhotoPreview('')

    loadData()
  }

  function startEditing(professional: Professional) {
    setEditingProfessionalId(professional.id)

    setEditName(professional.name)
    setEditPhone(professional.phone || '')
    setEditEmail(professional.email || '')
    setEditRole(professional.role || '')

    setPhotoPreview(professional.photo_url || '')
  }

  function cancelEditing() {
    setEditingProfessionalId('')
    setEditName('')
    setEditPhone('')
    setEditEmail('')
    setEditRole('')
  }

  async function updateProfessional(
    professionalId: string
  ) {
    if (!editName.trim()) {
      alert('Digite o nome do profissional.')
      return
    }

    let photoUrl = photoPreview

    if (photoFile) {
      photoUrl = await uploadPhoto()
    }

    const { error } = await supabase
      .from('professionals')
      .update({
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        role: editRole.trim(),
        photo_url: photoUrl || null,
      })
      .eq('id', professionalId)

    if (error) {
      alert(error.message)
      return
    }

    setPhotoFile(null)
    setPhotoPreview('')

    cancelEditing()
    loadData()
  }

  async function toggleProfessionalActive(
    professionalId: string,
    active: boolean
  ) {
    const { error } = await supabase
      .from('professionals')
      .update({
        active: !active,
      })
      .eq('id', professionalId)

    if (error) {
      alert(error.message)
      return
    }

    loadData()
  }

  return (
    <div>
      <h1 className="text-4xl font-bold">
        Profissionais
      </h1>

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
          placeholder="Função. Ex: Barbeiro"
          className="rounded-lg bg-zinc-800 p-3"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />

        <div>
          <label className="mb-2 block text-sm text-zinc-400">
            Foto do profissional
          </label>

          <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800 p-6 transition hover:bg-zinc-700">
            <span className="font-medium">
              Escolher foto
            </span>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]

                if (!file) return

                setPhotoFile(file)

                setPhotoPreview(
                  URL.createObjectURL(file)
                )
              }}
            />
          </label>

          {photoPreview && (
            <div className="mt-4 flex justify-center">
              <img
                src={photoPreview}
                alt="Preview"
                className="h-28 w-28 rounded-full object-cover ring-4 ring-zinc-700"
              />
            </div>
          )}
        </div>

        <button
          onClick={createProfessional}
          className="rounded-lg bg-white p-3 font-bold text-black"
        >
          Cadastrar profissional
        </button>
      </div>

      <div className="mt-8">
        <input
          placeholder="Pesquisar profissional..."
          className="w-full rounded-xl bg-zinc-900 p-4"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-8 space-y-3">
        {filteredProfessionals.map((professional) => {
          const isEditing =
            editingProfessionalId === professional.id

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
                    onChange={(e) =>
                      setEditName(e.target.value)
                    }
                  />

                  <input
                    className="rounded-lg bg-zinc-800 p-3"
                    value={editPhone}
                    onChange={(e) =>
                      setEditPhone(e.target.value)
                    }
                  />

                  <input
                    className="rounded-lg bg-zinc-800 p-3"
                    value={editEmail}
                    onChange={(e) =>
                      setEditEmail(e.target.value)
                    }
                  />

                  <input
                    className="rounded-lg bg-zinc-800 p-3"
                    value={editRole}
                    onChange={(e) =>
                      setEditRole(e.target.value)
                    }
                  />

                  <div>
                    <label className="mb-2 block text-sm text-zinc-400">
                      Foto do profissional
                    </label>

                    <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800 p-6 transition hover:bg-zinc-700">
                      <span className="font-medium">
                        Trocar foto
                      </span>

                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setPhotoFile(file);
                          setPhotoPreview(
                            URL.createObjectURL(file)
                          );
                        }}
                      />
                    </label>

                    {photoPreview && (
                      <div className="mt-4 flex justify-center">
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="h-28 w-28 rounded-full object-cover ring-4 ring-zinc-700"
                        />
                      </div>
                    )}
                  </div>
           

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        updateProfessional(professional.id)
                      }
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
                  <div className="flex items-center gap-4">
                    {professional.photo_url ? (
                      <img
                        src={professional.photo_url}
                        alt={professional.name}
                        className="h-20 w-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800 text-2xl font-bold">
                        {professional.name.charAt(0)}
                      </div>
                    )}

                    <div>
                      <p className="font-bold">
                        {professional.name}
                      </p>

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
                        <span
                          className={
                            professional.active
                              ? 'text-green-400'
                              : 'text-yellow-400'
                          }
                        >
                          {professional.active
                            ? 'Ativo'
                            : 'Inativo'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() =>
                        startEditing(professional)
                      }
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
                      {professional.active
                        ? 'Inativar'
                        : 'Ativar'}
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