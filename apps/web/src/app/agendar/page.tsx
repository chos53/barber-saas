'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PublicBookingPage() {
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    loadCompany()
  }, [])

  async function loadCompany() {
    const { data } = await supabase
      .from('company_settings')
      .select('company_name')
      .limit(1)
      .single()

    if (data?.company_name) {
      setCompanyName(data.company_name)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-900 p-8">
        <h1 className="text-4xl font-bold">
          Agendar horário
        </h1>

        <p className="mt-2 text-zinc-400">
          {companyName || 'Escolha seu serviço, profissional e horário.'}
        </p>
      </div>
    </main>
  )
}