'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // O Supabase precisa de um momento para processar o hash da URL (o #access_token)
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Agora o Supabase sabe que estamos em modo de recuperação
      }
    })
  }, [])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.auth.updateUser({ 
      password: password 
    })

    if (error) {
      alert('Erro: ' + error.message)
    } else {
      alert('Senha atualizada com sucesso!')
      router.push('/login')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-2xl">
        <h1 className="text-2xl font-bold text-white mb-6">Definir nova senha</h1>
        <form onSubmit={handleUpdate} className="space-y-4">
          <input 
            type="password" 
            placeholder="Nova senha" 
            className="w-full p-3 bg-black border border-zinc-800 rounded-lg text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button 
            disabled={loading}
            className="w-full bg-amber-500 text-black font-bold py-3 rounded-lg hover:bg-amber-400 transition"
          >
            {loading ? 'Salvando...' : 'Atualizar senha'}
          </button>
        </form>
      </div>
    </div>
  )
}