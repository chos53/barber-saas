'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export default function SettingsPage() {
  const [companyId, setCompanyId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [openingHours, setOpeningHours] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')

  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

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
      .select('company_name, phone, address, opening_hours, logo_url')
      .eq('company_id', profile.company_id)
      .single()

    if (settings) {
      setCompanyName(settings.company_name || '')
      setPhone(settings.phone || '')
      setAddress(settings.address || '')
      setOpeningHours(settings.opening_hours || '')
      setLogoUrl(settings.logo_url || '')
      setLogoPreview(settings.logo_url || '')
    }
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
          placeholder="Horário de funcionamento"
          className="rounded-lg bg-zinc-800 p-3"
          value={openingHours}
          onChange={(e) => setOpeningHours(e.target.value)}
        />

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
    </div>
  )
}