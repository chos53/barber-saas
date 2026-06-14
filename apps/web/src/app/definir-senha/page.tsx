'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DefinirSenhaPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    prepareRecoverySession()
  }, [])

  async function prepareRecoverySession() {
    const hash = window.location.hash

    if (hash.includes('error=')) {
      setCheckingSession(false)
      alert('Link inválido ou expirado. Solicite um novo convite.')
      return
    }

    const params = new URLSearchParams(hash.replace('#', ''))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (error) {
        alert(`Erro ao validar convite: ${error.message}`)
      }
    }

    setCheckingSession(false)
  }

  async function handleUpdatePassword() {
    if (!password.trim() || !confirmPassword.trim()) {
      alert('Preencha a nova senha e a confirmação.')
      return
    }

    if (password.trim().length < 6) {
      alert('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (password.trim() !== confirmPassword.trim()) {
      alert('As senhas não conferem.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: password.trim(),
    })

    setLoading(false)

    if (error) {
      alert(`Erro ao definir senha: ${error.message}`)
      return
    }

    alert('Senha definida com sucesso. Faça login para acessar o sistema.')

    await supabase.auth.signOut()

    window.location.href = '/login'
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-8 py-6">
          <p className="text-zinc-400">Validando convite...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">
            Barber SaaS
          </p>

          <h1 className="mt-2 text-3xl font-bold">Definir senha</h1>

          <p className="mt-2 text-sm text-zinc-400">
            Crie uma senha para acessar o painel da sua empresa.
          </p>
        </div>

        <input
          type="password"
          placeholder="Nova senha"
          className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-white outline-none focus:ring-2 focus:ring-white"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <input
          type="password"
          placeholder="Confirmar nova senha"
          className="w-full rounded-xl border border-zinc-800 bg-black p-3 text-white outline-none focus:ring-2 focus:ring-white"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        <button
          type="button"
          disabled={loading}
          onClick={handleUpdatePassword}
          className="w-full rounded-xl bg-white p-3 font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Definir senha'}
        </button>

        <button
          type="button"
          onClick={() => {
            window.location.href = '/login'
          }}
          className="w-full text-sm text-zinc-400 transition hover:text-white"
        >
          Voltar para o login
        </button>
      </div>
    </main>
  )
}