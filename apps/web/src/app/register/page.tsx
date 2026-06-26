'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/register', {
      method: 'POST',
      body: JSON.stringify({ companyName, email, password }),
    })

    const result = await res.json() // Vamos ler o que o servidor respondeu

    if (res.ok) {
      alert('Cadastro realizado! Agora faça login.')
      router.push('/login')
    } else {
      // Agora o alerta vai mostrar o erro REAL vindo do backend
      alert('Erro: ' + (result.error || 'Ocorreu um erro desconhecido'))
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <form onSubmit={handleRegister} className="w-full max-w-sm space-y-4 rounded-xl bg-zinc-900 p-8">
        <h1 className="text-2xl font-bold">Criar conta e testar grátis</h1>
        <input required placeholder="Nome do seu Salão" className="w-full bg-zinc-800 p-3 rounded-lg" onChange={(e) => setCompanyName(e.target.value)} />
        <input required type="email" placeholder="Seu melhor e-mail" className="w-full bg-zinc-800 p-3 rounded-lg" onChange={(e) => setEmail(e.target.value)} />
        <input required type="password" placeholder="Sua senha" className="w-full bg-zinc-800 p-3 rounded-lg" onChange={(e) => setPassword(e.target.value)} />
        <button disabled={loading} className="w-full bg-amber-500 text-black font-bold p-3 rounded-lg hover:bg-amber-400">
          {loading ? 'Criando...' : 'Finalizar Cadastro'}
        </button>
        <Link href="/login" className="block text-center text-sm text-zinc-500">Já tem conta? Entrar</Link>
      </form>
    </main>
  )
}