'use client'

export default function ComandasPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold">Comandas</h1>

      <p className="mt-2 text-zinc-400">
        Controle de comandas abertas, fechamento e histórico.
      </p>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">Estrutura inicial</h2>

        <p className="mt-3 text-zinc-400">
          A página de comandas foi criada com sucesso. No próximo passo vamos
          criar a estrutura no Supabase para salvar comandas reais.
        </p>
      </div>
    </div>
  )
}