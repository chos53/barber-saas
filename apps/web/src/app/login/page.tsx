'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const masterEmails = ['caheolsa@yahoo.com.br']

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoginView, setIsLoginView] = useState(true)

  async function handleAuth() {
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !password.trim()) {
      alert('Por favor, preencha seu email e senha.')
      return
    }

    if (isLoginView) {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password.trim(),
      })

      if (error) {
        console.error(error)
        alert(`Erro ao logar: ${error.message}`)
        return
      }

      if (masterEmails.includes(normalizedEmail)) {
        window.location.href = '/master'
        return
      }

      window.location.href = '/dashboard'
      return
    }

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: password.trim(),
    })

    if (error) {
      console.error(error)
      alert(`Erro ao criar conta: ${error.message}`)
      return
    }

    alert('Conta criada com sucesso! Verifique seu email.')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-zinc-900 p-8">
        <h1 className="text-3xl font-bold">
          {isLoginView ? 'Login' : 'Criar Conta'}
        </h1>

        <input
          type="email"
          placeholder="Seu email"
          className="w-full rounded-lg bg-zinc-800 p-3 outline-none focus:ring-2 focus:ring-white"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <input
          type="password"
          placeholder="Sua senha"
          className="w-full rounded-lg bg-zinc-800 p-3 outline-none focus:ring-2 focus:ring-white"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <button
          type="button"
          onClick={handleAuth}
          className="w-full rounded-lg bg-white p-3 font-bold text-black transition-colors hover:bg-zinc-200"
        >
          {isLoginView ? 'Entrar' : 'Cadastrar'}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsLoginView(!isLoginView)
            setEmail('')
            setPassword('')
          }}
          className="w-full text-sm text-zinc-400 transition-colors hover:text-white"
        >
          {isLoginView
            ? 'Não tem uma conta? Crie uma agora'
            : 'Já tem uma conta? Faça login'}
        </button>
      </div>
    </main>
  )
}
