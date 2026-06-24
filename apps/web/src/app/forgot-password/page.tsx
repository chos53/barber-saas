'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    // O Supabase enviará um e-mail para o usuário.
    // Certifique-se que o "Site URL" e "Redirect URL" estejam configurados no Dashboard do Supabase.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (error) {
      alert(error.message)
    } else {
      setMessage('Verifique seu e-mail para o link de recuperação.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-2xl">
        <h1 className="text-2xl font-bold text-white mb-6">Recuperar acesso</h1>
        {message ? (
          <p className="text-green-400 text-sm">{message}</p>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <input 
              type="email" 
              placeholder="Seu e-mail cadastrado" 
              className="w-full p-3 bg-black border border-zinc-800 rounded-lg text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button 
              disabled={loading}
              className="w-full bg-amber-500 text-black font-bold py-3 rounded-lg hover:bg-amber-400 transition"
            >
              {loading ? 'Enviando...' : 'Enviar e-mail de recuperação'}
            </button>
            <Link href="/login" className="block text-center text-zinc-500 text-sm hover:text-white">
              Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}