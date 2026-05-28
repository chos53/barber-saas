'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

type UserAccessRole =
  | 'owner'
  | 'administrator'
  | 'manager'
  | 'reception'
  | 'barber'
  | 'financial'

type Professional = {
  id: string
  name: string
  phone: string | null
  email: string | null
  role: string | null
  active: boolean
  photo_url: string | null
  commission_percentage: number | null
  user_access_role?: UserAccessRole | null
  monthly_revenue?: number
  monthly_commission?: number
  commission_payment_status?: 'pending' | 'paid'
  commission_payment_date?: string | null
}

const userAccessRoles: { value: UserAccessRole; label: string }[] = [
  { value: 'owner', label: 'Proprietário(a)' },
  { value: 'administrator', label: 'Administrador(a)' },
  { value: 'manager', label: 'Gerente' },
  { value: 'reception', label: 'Recepção' },
  { value: 'barber', label: 'Profissional' },
  { value: 'financial', label: 'Financeiro' },
]

const professionalRoles = [
  'Cabeleireiro(a)',
  'Barbeiro(a)',
  'Manicure',
  'Pedicure',
  'Nail Designer',
  'Esteticista',
  'Maquiador(a)',
  'Depilador(a)',
  'Designer de Sobrancelhas',
  'Especialista em Cílios',
  'Podólogo(a)',
  'Massoterapeuta',
  'Micropigmentador(a)',
  'Trancista',
  'Colorista',
  'Outro',
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

function getUserAccessRoleLabel(role: UserAccessRole | null | undefined) {
  const accessRole = userAccessRoles.find((item) => item.value === role)

  return accessRole?.label || 'Sem usuário vinculado'
}

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [search, setSearch] = useState('')

  const [companyId, setCompanyId] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [userAccessRole, setUserAccessRole] =
    useState<UserAccessRole>('barber')
  const [commissionPercentage, setCommissionPercentage] = useState('40')

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')

  const [editingProfessionalId, setEditingProfessionalId] = useState('')
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editUserAccessRole, setEditUserAccessRole] =
    useState<UserAccessRole>('barber')
  const [editCommissionPercentage, setEditCommissionPercentage] = useState('40')
  const [payingCommissionId, setPayingCommissionId] = useState('')
  const [savingPermissionId, setSavingPermissionId] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const filteredProfessionals = useMemo(() => {
    return professionals.filter((professional) =>
      professional.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [professionals, search])

  const totalProduced = useMemo(() => {
    return professionals.reduce(
      (sum, professional) => sum + Number(professional.monthly_revenue || 0),
      0
    )
  }, [professionals])

  const totalCommissionToPay = useMemo(() => {
    return professionals.reduce(
      (sum, professional) => sum + Number(professional.monthly_commission || 0),
      0
    )
  }, [professionals])

  const companyBalanceAfterCommission = useMemo(() => {
    return totalProduced - totalCommissionToPay
  }, [totalProduced, totalCommissionToPay])

  const totalCommissionPaid = useMemo(() => {
    return professionals
      .filter(
        (professional) =>
          professional.commission_payment_status === 'paid'
      )
      .reduce(
        (sum, professional) =>
          sum + Number(professional.monthly_commission || 0),
        0
      )
  }, [professionals])

  const totalCommissionPending = useMemo(() => {
    return totalCommissionToPay - totalCommissionPaid
  }, [totalCommissionToPay, totalCommissionPaid])

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  function getCurrentMonthStartDate() {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0]
  }

  function getTodayDate() {
    return new Date().toISOString().split('T')[0]
  }

  function getCurrentMonthReference() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  function generateProfessionalPdf(professional: Professional) {
    const today = new Date().toLocaleDateString('pt-BR')

    const html = `
      <html>
        <head>
          <title>Relatório Profissional</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 32px;
              color: #111827;
            }

            h1 {
              margin-bottom: 24px;
            }

            .card {
              border: 1px solid #d1d5db;
              border-radius: 12px;
              padding: 20px;
              margin-top: 16px;
            }

            .label {
              color: #6b7280;
              font-size: 12px;
              margin-bottom: 6px;
            }

            .value {
              font-size: 24px;
              font-weight: bold;
            }
          </style>
        </head>

        <body>
          <h1>Relatório de Comissão</h1>

          <p><strong>Profissional:</strong> ${professional.name}</p>
          <p><strong>Função:</strong> ${professional.role || '-'}</p>
          <p><strong>Emitido em:</strong> ${today}</p>

          <div class="card">
            <div class="label">Comissão (%)</div>
            <div class="value">
              ${Number(professional.commission_percentage || 0).toFixed(2)}%
            </div>
          </div>

          <div class="card">
            <div class="label">Faturamento no mês</div>
            <div class="value">
              ${formatCurrency(professional.monthly_revenue || 0)}
            </div>
          </div>

          <div class="card">
            <div class="label">Comissão estimada</div>
            <div class="value">
              ${formatCurrency(professional.monthly_commission || 0)}
            </div>
          </div>

          <div class="card">
            <div class="label">Saldo da empresa após comissão</div>
            <div class="value">
              ${formatCurrency(
                Number(professional.monthly_revenue || 0) -
                  Number(professional.monthly_commission || 0)
              )}
            </div>
          </div>

          <div class="card">
            <div class="label">Status do pagamento</div>
            <div class="value">
              ${professional.commission_payment_status === 'paid' ? 'Pago' : 'Pendente'}
            </div>
          </div>

          <div class="card">
            <div class="label">Data do pagamento</div>
            <div class="value">
              ${professional.commission_payment_date
                ? new Date(professional.commission_payment_date).toLocaleDateString('pt-BR')
                : '-'}
            </div>
          </div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      alert('Não foi possível abrir o PDF.')
      return
    }

    printWindow.document.write(html)
    printWindow.document.close()

    setTimeout(() => {
      printWindow.print()
    }, 300)
  }

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

    const { data: professionalsData, error: professionalsError } = await supabase
      .from('professionals')
      .select(
        'id, name, phone, email, role, active, photo_url, commission_percentage'
      )
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (professionalsError) {
      alert(professionalsError.message)
      return
    }

    const { data: companyProfiles } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('company_id', profile.company_id)

    const profilesByEmail = new Map(
      (companyProfiles || [])
        .filter((companyProfile) => companyProfile.email)
        .map((companyProfile) => [
          String(companyProfile.email).toLowerCase(),
          companyProfile,
        ])
    )

    const monthStartDate = getCurrentMonthStartDate()
    const todayDate = getTodayDate()

    const { data: appointmentsData } = await supabase
      .from('appointments')
      .select(`
        id,
        professional_id,
        appointment_date,
        status,
        price,
        services (
          price
        )
      `)
      .eq('company_id', profile.company_id)
      .eq('status', 'completed')
      .gte('appointment_date', monthStartDate)
      .lte('appointment_date', todayDate)

    const { data: comandaItemsData } = await supabase
      .from('comanda_items')
      .select(`
        id,
        professional_id,
        quantity,
        price,
        comandas!inner (
          company_id,
          status,
          closed_at
        )
      `)
      .eq('comandas.company_id', profile.company_id)
      .eq('comandas.status', 'closed')
      .gte('comandas.closed_at', `${monthStartDate}T00:00:00`)
      .lte('comandas.closed_at', `${todayDate}T23:59:59`)

    const monthReference = getCurrentMonthReference()

    const { data: commissionPaymentsData } = await supabase
      .from('professional_commission_payments')
      .select('professional_id, status, paid_at')
      .eq('company_id', profile.company_id)
      .eq('month_reference', monthReference)

    const commissionPaymentsMap = new Map(
      (commissionPaymentsData || []).map((payment) => [
        payment.professional_id,
        payment,
      ])
    )

    const revenueByProfessional = new Map<string, number>()

    ;(appointmentsData || []).forEach((appointment) => {
      if (!appointment.professional_id) return

      const price = Number(
        appointment.price || appointment.services?.price || 0
      )

      revenueByProfessional.set(
        appointment.professional_id,
        (revenueByProfessional.get(appointment.professional_id) || 0) + price
      )
    })

    ;(comandaItemsData || []).forEach((item) => {
      if (!item.professional_id) return

      const itemTotal =
        Number(item.price || 0) * Number(item.quantity || 1)

      revenueByProfessional.set(
        item.professional_id,
        (revenueByProfessional.get(item.professional_id) || 0) + itemTotal
      )
    })

    const normalizedProfessionals = (professionalsData || []).map(
      (professional) => {
        const percentage = Number(professional.commission_percentage || 0)
        const monthlyRevenue = revenueByProfessional.get(professional.id) || 0

        const payment = commissionPaymentsMap.get(professional.id)
        const linkedProfile = professional.email
          ? profilesByEmail.get(String(professional.email).toLowerCase())
          : null

        return {
          ...professional,
          commission_percentage: percentage,
          user_access_role: linkedProfile
            ? normalizeUserAccessRole(linkedProfile.role)
            : null,
          monthly_revenue: monthlyRevenue,
          monthly_commission: (monthlyRevenue * percentage) / 100,
          commission_payment_status:
            payment?.status === 'paid' ? 'paid' : 'pending',
          commission_payment_date: payment?.paid_at || null,
        }
      }
    )

    setProfessionals(normalizedProfessionals)
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
    } = supabase.storage.from('professionals').getPublicUrl(fileName)

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

    const { error } = await supabase.from('professionals').insert({
      company_id: companyId,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      role: role.trim(),
      commission_percentage: Number(commissionPercentage || 0),
      photo_url: photoUrl || null,
      active: true,
    })

    if (error) {
      alert(error.message)
      return
    }

    if (email.trim()) {
      await updateProfilePermissionByEmail(email.trim(), userAccessRole, false)
    }

    setName('')
    setPhone('')
    setEmail('')
    setRole('')
    setUserAccessRole('barber')
    setCommissionPercentage('40')
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
    setEditUserAccessRole(
      normalizeUserAccessRole(professional.user_access_role || 'barber')
    )
    setEditCommissionPercentage(String(professional.commission_percentage ?? 0))
    setPhotoPreview(professional.photo_url || '')
  }

  function cancelEditing() {
    setEditingProfessionalId('')
    setEditName('')
    setEditPhone('')
    setEditEmail('')
    setEditRole('')
    setEditUserAccessRole('barber')
    setEditCommissionPercentage('40')
    setPhotoFile(null)
    setPhotoPreview('')
  }

  async function updateProfessional(professionalId: string) {
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
        commission_percentage: Number(editCommissionPercentage || 0),
        photo_url: photoUrl || null,
      })
      .eq('id', professionalId)

    if (error) {
      alert(error.message)
      return
    }

    if (editEmail.trim()) {
      await updateProfilePermissionByEmail(
        editEmail.trim(),
        editUserAccessRole,
        false
      )
    }

    cancelEditing()
    loadData()
  }

  async function updateProfilePermissionByEmail(
    userEmail: string,
    accessRole: UserAccessRole,
    showSuccessAlert = true
  ) {
    if (!companyId) {
      alert('Empresa não identificada.')
      return false
    }

    if (!userEmail.trim()) {
      alert('Informe o e-mail do usuário para alterar a permissão.')
      return false
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('company_id', companyId)
      .eq('email', userEmail.trim().toLowerCase())
      .maybeSingle()

    if (profileError) {
      alert(
        `Erro ao buscar usuário. Verifique se a tabela profiles possui a coluna email. Detalhe: ${profileError.message}`
      )
      return false
    }

    if (!profile) {
      if (showSuccessAlert) {
        alert(
          'Nenhum usuário do sistema foi encontrado com este e-mail. O profissional foi salvo, mas a permissão só será aplicada quando existir um usuário com esse e-mail em profiles.'
        )
      }

      return false
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: accessRole })
      .eq('id', profile.id)
      .eq('company_id', companyId)

    if (error) {
      alert(`Erro ao atualizar permissão: ${error.message}`)
      return false
    }

    if (showSuccessAlert) {
      alert('Permissão atualizada com sucesso.')
    }

    return true
  }

  async function updateProfessionalAccessRole(professional: Professional) {
    if (!professional.email) {
      alert('Este profissional não possui e-mail vinculado.')
      return
    }

    setSavingPermissionId(professional.id)

    const updated = await updateProfilePermissionByEmail(
      professional.email,
      normalizeUserAccessRole(professional.user_access_role || 'barber')
    )

    setSavingPermissionId('')

    if (updated) {
      loadData()
    }
  }

  async function toggleProfessionalActive(professionalId: string, active: boolean) {
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

  async function markCommissionAsPaid(professional: Professional) {
    if (!companyId) {
      alert('Empresa não identificada.')
      return
    }

    if (!professional.monthly_commission || professional.monthly_commission <= 0) {
      alert('Este profissional não possui comissão para pagar no mês.')
      return
    }

    const confirmPayment = window.confirm(
      `Marcar comissão de ${professional.name} como paga?`
    )

    if (!confirmPayment) return

    setPayingCommissionId(professional.id)

    const { error } = await supabase
      .from('professional_commission_payments')
      .upsert({
        company_id: companyId,
        professional_id: professional.id,
        month_reference: getCurrentMonthReference(),
        commission_amount: Number(professional.monthly_commission || 0),
        revenue_amount: Number(professional.monthly_revenue || 0),
        status: 'paid',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    setPayingCommissionId('')

    if (error) {
      alert(`Erro ao marcar comissão como paga: ${error.message}`)
      return
    }

    loadData()
  }

  return (
    <div>
      <h1 className="text-4xl font-bold">Profissionais</h1>

      <p className="mt-2 text-zinc-400">
        Cadastro, edição, permissões e comissão mensal da equipe para salões,
        barbearias, estética, esmalterias e negócios de beleza.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="rounded-2xl border border-green-900 bg-green-950/30 p-6">
          <p className="text-sm text-green-300">
            Total produzido no mês
          </p>

          <strong className="mt-2 block text-3xl text-white">
            {formatCurrency(totalProduced)}
          </strong>
        </div>

        <div className="rounded-2xl border border-blue-900 bg-blue-950/30 p-6">
          <p className="text-sm text-blue-300">
            Comissão a pagar
          </p>

          <strong className="mt-2 block text-3xl text-white">
            {formatCurrency(totalCommissionToPay)}
          </strong>
        </div>

        <div className="rounded-2xl border border-yellow-900 bg-yellow-950/30 p-6">
          <p className="text-sm text-yellow-300">
            Saldo da empresa após comissão
          </p>

          <strong className="mt-2 block text-3xl text-white">
            {formatCurrency(companyBalanceAfterCommission)}
          </strong>
        </div>

        <div className="rounded-2xl border border-cyan-900 bg-cyan-950/30 p-6">
          <p className="text-sm text-cyan-300">
            Comissão paga
          </p>

          <strong className="mt-2 block text-3xl text-white">
            {formatCurrency(totalCommissionPaid)}
          </strong>
        </div>

        <div className="rounded-2xl border border-red-900 bg-red-950/30 p-6">
          <p className="text-sm text-red-300">
            Comissão pendente
          </p>

          <strong className="mt-2 block text-3xl text-white">
            {formatCurrency(totalCommissionPending)}
          </strong>
        </div>
      </div>

      <div className="mt-8 grid gap-4 rounded-2xl bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">Cadastrar profissional</h2>

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
          placeholder="Função profissional"
          className="rounded-lg bg-zinc-800 p-3"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />

        <div>
          <label className="mb-2 block text-sm text-zinc-400">
            Permissão de acesso no sistema
          </label>

          <select
            className="w-full rounded-lg bg-zinc-800 p-3"
            value={userAccessRole}
            onChange={(e) =>
              setUserAccessRole(e.target.value as UserAccessRole)
            }
          >
            {userAccessRoles.map((accessRole) => (
              <option key={accessRole.value} value={accessRole.value}>
                {accessRole.label}
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs text-zinc-500">
            A permissão será aplicada ao usuário do sistema com o mesmo e-mail.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-400">
            Comissão sobre serviços concluídos (%)
          </label>

          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="Ex: 40"
            className="w-full rounded-lg bg-zinc-800 p-3"
            value={commissionPercentage}
            onChange={(e) => setCommissionPercentage(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-400">
            Foto do profissional
          </label>

          <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800 p-6 transition hover:bg-zinc-700">
            <span className="font-medium">Escolher foto</span>

            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setPhotoFile(file)
                setPhotoPreview(URL.createObjectURL(file))
              }}
            />
          </label>

          {photoPreview && !editingProfessionalId && (
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
          const isEditing = editingProfessionalId === professional.id

          return (
            <div key={professional.id} className="rounded-xl bg-zinc-900 p-4">
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
                      Função profissional
                    </label>

                    <input
                      list="edit-professional-roles"
                      className="w-full rounded-lg bg-zinc-800 p-3"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                    />

                    <datalist id="edit-professional-roles">
                      {professionalRoles.map((professionalRole) => (
                        <option key={professionalRole} value={professionalRole} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-zinc-400">
                      Permissão de acesso no sistema
                    </label>

                    <select
                      className="w-full rounded-lg bg-zinc-800 p-3"
                      value={editUserAccessRole}
                      onChange={(e) =>
                        setEditUserAccessRole(
                          e.target.value as UserAccessRole
                        )
                      }
                    >
                      {userAccessRoles.map((accessRole) => (
                        <option key={accessRole.value} value={accessRole.value}>
                          {accessRole.label}
                        </option>
                      ))}
                    </select>

                    <p className="mt-2 text-xs text-zinc-500">
                      Será aplicada ao usuário do sistema com o mesmo e-mail.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-zinc-400">
                      Comissão sobre serviços concluídos (%)
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full rounded-lg bg-zinc-800 p-3"
                      value={editCommissionPercentage}
                      onChange={(e) => setEditCommissionPercentage(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-zinc-400">
                      Foto do profissional
                    </label>

                    <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800 p-6 transition hover:bg-zinc-700">
                      <span className="font-medium">Trocar foto</span>

                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setPhotoFile(file)
                          setPhotoPreview(URL.createObjectURL(file))
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
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
                        <p className="font-bold">{professional.name}</p>
                        <p className="text-zinc-400">{professional.role}</p>
                        <p className="text-zinc-500">{professional.phone}</p>
                        <p className="text-zinc-500">{professional.email}</p>

                        <p className="mt-2 text-sm text-zinc-500">
                          Permissão:{' '}
                          <span className="font-bold text-blue-400">
                            {getUserAccessRoleLabel(professional.user_access_role)}
                          </span>
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
                            {professional.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-right md:min-w-[280px]">
                      <div>
                        <p className="text-sm text-zinc-500">Comissão</p>
                        <strong className="text-xl text-yellow-400">
                          {Number(professional.commission_percentage || 0).toFixed(2)}%
                        </strong>
                      </div>

                      <div>
                        <p className="text-sm text-zinc-500">Total produzido</p>
                        <strong className="text-green-400">
                          {formatCurrency(professional.monthly_revenue || 0)}
                        </strong>
                      </div>

                      <div>
                        <p className="text-sm text-zinc-500">Comissão a pagar</p>
                        <strong className="text-blue-400">
                          {formatCurrency(professional.monthly_commission || 0)}
                        </strong>
                      </div>

                      <div>
                        <p className="text-sm text-zinc-500">Saldo da empresa</p>
                        <strong className="text-purple-400">
                          {formatCurrency(
                            Number(professional.monthly_revenue || 0) -
                              Number(professional.monthly_commission || 0)
                          )}
                        </strong>
                      </div>

                      <div>
                        <p className="text-sm text-zinc-500">Pagamento</p>
                        <strong
                          className={
                            professional.commission_payment_status === 'paid'
                              ? 'text-green-400'
                              : 'text-red-400'
                          }
                        >
                          {professional.commission_payment_status === 'paid'
                            ? 'Pago'
                            : 'Pendente'}
                        </strong>

                        {professional.commission_payment_date && (
                          <p className="mt-1 text-xs text-zinc-500">
                            Pago em{' '}
                            {new Date(
                              professional.commission_payment_date
                            ).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => startEditing(professional)}
                      className="rounded-lg bg-white px-4 py-2 font-bold text-black"
                    >
                      Editar
                    </button>

                    {professional.commission_payment_status !== 'paid' && (
                      <button
                        onClick={() => markCommissionAsPaid(professional)}
                        disabled={payingCommissionId === professional.id}
                        className="rounded-lg bg-green-600 px-4 py-2 font-bold text-white disabled:opacity-50"
                      >
                        {payingCommissionId === professional.id
                          ? 'Salvando...'
                          : 'Marcar como pago'}
                      </button>
                    )}

                    <button
                      onClick={() => generateProfessionalPdf(professional)}
                      className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white"
                    >
                      PDF
                    </button>

                    <select
                      value={professional.user_access_role || 'barber'}
                      onChange={(e) => {
                        setProfessionals((currentProfessionals) =>
                          currentProfessionals.map((item) =>
                            item.id === professional.id
                              ? {
                                  ...item,
                                  user_access_role:
                                    e.target.value as UserAccessRole,
                                }
                              : item
                          )
                        )
                      }}
                      className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white"
                    >
                      {userAccessRoles.map((accessRole) => (
                        <option key={accessRole.value} value={accessRole.value}>
                          {accessRole.label}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => updateProfessionalAccessRole(professional)}
                      disabled={savingPermissionId === professional.id}
                      className="rounded-lg bg-purple-600 px-4 py-2 font-bold text-white disabled:opacity-50"
                    >
                      {savingPermissionId === professional.id
                        ? 'Salvando...'
                        : 'Salvar permissão'}
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
