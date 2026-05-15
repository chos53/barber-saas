'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Novo estado para controlar qual "tela" estamos vendo
  const [isLoginView, setIsLoginView] = useState(true)

  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      alert('Por favor, preencha seu email e senha.')
      return
    }

    // Se estiver na tela de Login, faz o signIn
    if (isLoginView) {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      })

      if (error) {
        console.error(error)
        alert(`Erro ao logar: ${error.message}`)
        return
      }

      window.location.href = '/dashboard'
    
    } 
    // Se não, faz o signUp (Cadastro)
    else {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      })

      if (error) {
        console.error(error)
        alert(`Erro ao criar conta: ${error.message}`)
        return
      }

      alert('Conta criada com sucesso! Verifique seu email.')
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-zinc-900 p-8">
        
        {/* O título muda dependendo da tela */}
        <h1 className="text-3xl font-bold">
          {isLoginView ? 'Login' : 'Criar Conta'}
        </h1>

        <input
          type="email"
          placeholder="Seu email"
          className="w-full rounded-lg bg-zinc-800 p-3 outline-none focus:ring-2 focus:ring-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Sua senha"
          className="w-full rounded-lg bg-zinc-800 p-3 outline-none focus:ring-2 focus:ring-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Botão principal de ação */}
        <button
          onClick={handleAuth}
          className="w-full rounded-lg bg-white p-3 font-bold text-black transition-colors hover:bg-zinc-200"
        >
          {isLoginView ? 'Entrar' : 'Cadastrar'}
        </button>

        {/* Botão para trocar de tela (Login <-> Cadastro) */}
        <button
          onClick={() => {
            setIsLoginView(!isLoginView) // Inverte a tela
            setEmail('') // Limpa os campos ao trocar de tela
            setPassword('')
          }}
          className="w-full text-sm text-zinc-400 hover:text-white transition-colors"
        >
          {isLoginView 
            ? 'Não tem uma conta? Crie uma agora' 
            : 'Já tem uma conta? Faça login'}
        </button>

      </div>
    </main>
  )
}