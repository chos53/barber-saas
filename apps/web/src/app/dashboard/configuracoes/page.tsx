'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

type UserAccessRole =
  | 'owner'
  | 'administrator'
  | 'manager'
  | 'reception'
  | 'barber'
  | 'financial'

type TeamUser = {
  id: string
  email: string | null
  role: string | null
}

const userAccessRoles: { value: UserAccessRole; label: string }[] = [
  { value: 'owner', label: 'Proprietário(a)' },
  { value: 'administrator', label: 'Administrador(a)' },
  { value: 'manager', label: 'Gerente' },
  { value: 'reception', label: 'Recepção' },
  { value: 'barber', label: 'Profissional' },
  { value: 'financial', label: 'Financeiro' },
]

function normalizeUserAccessRole(role: string | null | undefined): UserAccessRole {
  const normalized = String(role || 'barber').toLowerCase()

  if (normalized === 'owner') return 'owner'
  if (normalized === 'admin') return 'administrator'
  if (normalized === 'administrator') return 'administrator'
  if (normalized === 'manager') return 'manager'
  if (normalized === 'reception') return 'reception'
  if (normalized === 'barber') return 'barber'
  if (normalized === 'financial') return 'financial'

  return 'barber'
}

function getRoleLabel(role: string | null | undefined) {
  const normalizedRole = normalizeUserAccessRole(role)
  const option = userAccessRoles.find((item) => item.value === normalizedRole)

  return option?.label || 'Profissional'
}

export default function SettingsPage() {
  const [companyId, setCompanyId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [openingHours, setOpeningHours] = useState('')
  const [openingTime, setOpeningTime] = useState('08:00')
  const [closingTime, setClosingTime] = useState('20:00')
  const [intervalMinutes, setIntervalMinutes] = useState('30')

  const [logoUrl, setLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')

  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const [currentUserId, setCurrentUserId] = useState('')
  const [currentUserRole, setCurrentUserRole] =
    useState<UserAccessRole>('barber')
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([])
  const [savingRoleUserId, setSavingRoleUserId] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
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
    setCurrentUserId(user.id)
    setCurrentUserRole(normalizeUserAccessRole(profile.role))

    await loadTeamUsers(profile.company_id)

    const { data: settings } = await supabase
      .from('company_settings')
      .select(
        'company_name, phone, address, opening_hours, opening_time, closing_time, interval_minutes, logo_url'
      )
      .eq('company_id', profile.company_id)
      .single()

    if (settings) {
      setCompanyName(settings.company_name || '')
      setPhone(settings.phone || '')
      setAddress(settings.address || '')
      setOpeningHours(settings.opening_hours || '')
      setOpeningTime(settings.opening_time || '08:00')
      setClosingTime(settings.closing_time || '20:00')
      setIntervalMinutes(String(settings.interval_minutes || 30))
      setLogoUrl(settings.logo_url || '')
      setLogoPreview(settings.logo_url || '')
    }
  }

  async function loadTeamUsers(currentCompanyId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('company_id', currentCompanyId)
      .order('email', { ascending: true })

    if (error) {
      alert(`Erro ao carregar usuários da equipe: ${error.message}`)
      return
    }

    setTeamUsers((data || []) as TeamUser[])
  }

  async function updateTeamUserRole(userId: string, nextRole: UserAccessRole) {
    if (!companyId) {
      alert('Empresa não identificada.')
      return
    }

    if (currentUserRole !== 'owner' && currentUserRole !== 'administrator') {
      alert('Apenas proprietário ou administrador pode alterar permissões.')
      return
    }

    if (userId === currentUserId && currentUserRole === 'owner' && nextRole !== 'owner') {
      alert(
        'Você não pode remover sua própria permissão de proprietário por segurança.'
      )
      return
    }

    const targetUser = teamUsers.find((userItem) => userItem.id === userId)

    if (normalizeUserAccessRole(targetUser?.role) === 'owner' && nextRole !== 'owner') {
      const confirmOwnerChange = window.confirm(
        'Você está alterando um usuário proprietário. Tem certeza que deseja continuar?'
      )

      if (!confirmOwnerChange) return
    }

    setSavingRoleUserId(userId)

    const { error } = await supabase
      .from('profiles')
      .update({ role: nextRole })
      .eq('id', userId)
      .eq('company_id', companyId)

    setSavingRoleUserId('')

    if (error) {
      alert(`Erro ao atualizar permissão: ${error.message}`)
      return
    }

    await loadTeamUsers(companyId)

    alert('Permissão atualizada com sucesso.')
  }

  async function uploadLogo() {
    if (!logoFile) return logoUrl

    const fileExt = logoFile.name.split('.').pop()
    const fileName = `${uuidv4()}.${fileExt}`

    const { error } = await supabase.storage
      .from('logos')
      .upload(fileName, logoFile)

    if (error) {
      alert(error.message)
      return logoUrl
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('logos').getPublicUrl(fileName)

    return publicUrl
  }

  async function saveSettings() {
    if (!companyId) return

    setSaving(true)
    setSuccessMessage('')

    const finalLogoUrl = await uploadLogo()

    const { error } = await supabase.from('company_settings').upsert(
      {
        company_id: companyId,
        company_name: companyName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        opening_hours: openingHours.trim(),
        opening_time: openingTime,
        closing_time: closingTime,
        interval_minutes: Number(intervalMinutes),
        logo_url: finalLogoUrl || null,
      },
      {
        onConflict: 'company_id',
      }
    )

    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    setLogoUrl(finalLogoUrl || '')
    setLogoFile(null)
    setSuccessMessage('Configurações salvas com sucesso!')
  }

  return (
    <div>
      <h1 className="text-4xl font-bold">Configurações</h1>

      <p className="mt-2 text-zinc-400">
        Dados da empresa e preferências do sistema.
      </p>

      <div className="mt-8 grid gap-4 rounded-2xl bg-zinc-900 p-6">
        <div>
          <label className="mb-2 block text-sm text-zinc-400">
            Logo da empresa
          </label>

          <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800 p-6 transition hover:bg-zinc-700">
            <span className="font-medium">Escolher logo</span>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return

                setLogoFile(file)
                setLogoPreview(URL.createObjectURL(file))
              }}
            />
          </label>

          {logoPreview && (
            <div className="mt-4 flex justify-center">
              <img
                src={logoPreview}
                alt="Logo"
                className="h-28 w-28 rounded-2xl object-cover ring-4 ring-zinc-700"
              />
            </div>
          )}
        </div>

        <input
          placeholder="Nome da empresa"
          className="rounded-lg bg-zinc-800 p-3"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />

        <input
          placeholder="Telefone"
          className="rounded-lg bg-zinc-800 p-3"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          placeholder="Endereço"
          className="rounded-lg bg-zinc-800 p-3"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <textarea
          placeholder="Horário de funcionamento em texto livre"
          className="rounded-lg bg-zinc-800 p-3"
          value={openingHours}
          onChange={(e) => setOpeningHours(e.target.value)}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Hora de abertura
            </label>

            <input
              type="time"
              className="w-full rounded-lg bg-zinc-800 p-3"
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Hora de fechamento
            </label>

            <input
              type="time"
              className="w-full rounded-lg bg-zinc-800 p-3"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Intervalo em minutos
            </label>

            <input
              type="number"
              min="10"
              step="5"
              className="w-full rounded-lg bg-zinc-800 p-3"
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(e.target.value)}
            />
          </div>
        </div>

        {successMessage && (
          <p className="rounded-lg bg-green-900 p-3 text-green-300">
            {successMessage}
          </p>
        )}

        <button
          onClick={saveSettings}
          disabled={saving}
          className="rounded-lg bg-white p-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </div>

      <div className="mt-8 rounded-2xl bg-zinc-900 p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold">Usuários da equipe</h2>

            <p className="mt-2 text-zinc-400">
              Gerencie permissões de acesso dos usuários vinculados à empresa.
            </p>
          </div>

          <span className="rounded-full bg-zinc-800 px-4 py-2 text-sm text-zinc-400">
            {teamUsers.length} usuário(s)
          </span>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-zinc-800 text-sm text-zinc-500">
                <th className="py-3">E-mail</th>
                <th>Permissão atual</th>
                <th>Alterar permissão</th>
                <th className="text-right">Ação</th>
              </tr>
            </thead>

            <tbody>
              {teamUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-500">
                    Nenhum usuário encontrado para esta empresa.
                  </td>
                </tr>
              )}

              {teamUsers.map((teamUser) => {
                const normalizedRole = normalizeUserAccessRole(teamUser.role)

                return (
                  <tr
                    key={teamUser.id}
                    className="border-b border-zinc-800 text-sm"
                  >
                    <td className="py-4">
                      <div>
                        <p className="font-medium">
                          {teamUser.email || 'E-mail não informado'}
                        </p>

                        {teamUser.id === currentUserId && (
                          <p className="mt-1 text-xs text-blue-400">
                            Usuário logado
                          </p>
                        )}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          normalizedRole === 'owner'
                            ? 'bg-yellow-900 text-yellow-300'
                            : normalizedRole === 'administrator'
                              ? 'bg-purple-900 text-purple-300'
                              : normalizedRole === 'financial'
                                ? 'bg-green-900 text-green-300'
                                : 'bg-blue-900 text-blue-300'
                        }`}
                      >
                        {getRoleLabel(teamUser.role)}
                      </span>
                    </td>

                    <td>
                      <select
                        value={normalizedRole}
                        onChange={(event) => {
                          setTeamUsers((currentUsers) =>
                            currentUsers.map((item) =>
                              item.id === teamUser.id
                                ? {
                                    ...item,
                                    role: event.target.value,
                                  }
                                : item
                            )
                          )
                        }}
                        className="w-full rounded-lg bg-zinc-800 p-3 text-white"
                      >
                        {userAccessRoles.map((accessRole) => (
                          <option key={accessRole.value} value={accessRole.value}>
                            {accessRole.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() =>
                          updateTeamUserRole(
                            teamUser.id,
                            normalizeUserAccessRole(teamUser.role)
                          )
                        }
                        disabled={savingRoleUserId === teamUser.id}
                        className="rounded-lg bg-white px-4 py-2 font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
                      >
                        {savingRoleUserId === teamUser.id
                          ? 'Salvando...'
                          : 'Salvar'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 rounded-xl border border-yellow-900 bg-yellow-950/30 p-4 text-sm text-yellow-200">
          Para criar login de novos funcionários, primeiro crie o usuário pelo
          fluxo de cadastro/login. Depois vincule o mesmo e-mail à empresa em
          profiles e ajuste a permissão por aqui.
        </div>
      </div>
    </div>
  )
}