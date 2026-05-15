'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function OnboardingPage() {
  const [companyName, setCompanyName] = useState('')

  async function handleCreateCompany() {
    if (!companyName.trim()) {
      alert('Digite o nome da empresa.')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert('Usuário não autenticado.')
      return
    }

    const slug = companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: companyName.trim(),
        slug,
        owner_id: user.id,
      })
      .select()
      .single()

    if (companyError) {
      console.error(companyError)
      alert(companyError.message)
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        company_id: company.id,
        email: user.email,
        role: 'owner',
      })

    if (profileError) {
      console.error(profileError)
      alert(profileError.message)
      return
    }

    alert('Empresa criada com sucesso!')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="w-full max-w-md space-y-4 rounded-xl bg-zinc-900 p-8">
        <h1 className="text-3xl font-bold">
          Criar empresa
        </h1>

        <input
          type="text"
          placeholder="Nome do salão ou barbearia"
          className="w-full rounded-lg bg-zinc-800 p-3 outline-none focus:ring-2 focus:ring-white"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />

        <button
          onClick={handleCreateCompany}
          className="w-full rounded-lg bg-white p-3 font-bold text-black"
        >
          Criar empresa
        </button>
      </div>
    </main>
  )
}