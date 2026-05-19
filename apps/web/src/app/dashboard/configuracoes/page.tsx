'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const [companyId, setCompanyId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [openingHours, setOpeningHours] = useState('')

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
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) return

    setCompanyId(profile.company_id)

    const { data: settings } = await supabase
      .from('company_settings')
      .select('company_name, phone, address, opening_hours')
      .eq('company_id', profile.company_id)
      .single()

    if (settings) {
      setCompanyName(settings.company_name || '')
      setPhone(settings.phone || '')
      setAddress(settings.address || '')
      setOpeningHours(settings.opening_hours || '')
    }
  }

  async function saveSettings() {
    if (!companyId) return

    const { error } = await supabase
      .from('company_settings')
      .upsert(
        {
          company_id: companyId,
          company_name: companyName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          opening_hours: openingHours.trim(),
        },
        {
          onConflict: 'company_id',
        }
      )
 

    if (error) {
      alert(error.message)
      return
    }

    alert('Configurações salvas com sucesso!')
  }

  return (
    <div>
      <h1 className="text-4xl font-bold">Configurações</h1>

      <p className="mt-2 text-zinc-400">
        Dados da empresa e preferências do sistema.
      </p>

      <div className="mt-8 grid gap-4 rounded-2xl bg-zinc-900 p-6">
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
          placeholder="Horário de funcionamento"
          className="rounded-lg bg-zinc-800 p-3"
          value={openingHours}
          onChange={(e) => setOpeningHours(e.target.value)}
        />

        <button
          onClick={saveSettings}
          className="rounded-lg bg-white p-3 font-bold text-black"
        >
          Salvar configurações
        </button>
      </div>
    </div>
  )
}