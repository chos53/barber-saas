'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type FinancialTransaction = {
  id: string
  type: string
  category: string
  description: string | null
  amount: number
  payment_method: string | null
  status: string | null
  transaction_date: string
  created_at: string | null
}

export default function FinanceiroPage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [filterDate, setFilterDate] = useState('')
  const [today, setToday] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    const currentDate = now.toISOString().split('T')[0]

    setToday(currentDate)
    setFilterDate(currentDate)
  }, [])

  useEffect(() => {
    if (filterDate) {
      loadTransactions()
    }
  }, [filterDate])

  async function loadTransactions() {
    setLoading(true)

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

    if (!profile?.company_id) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('financial_transactions')
      .select(`
        id,
        type,
        category,
        description,
        amount,
        payment_method,
        status,
        transaction_date,
        created_at
      `)
      .eq('company_id', profile.company_id)
      .eq('transaction_date', filterDate)
      .order('created_at', { ascending: false })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    setTransactions((data || []) as FinancialTransaction[])
    setLoading(false)
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  function getTypeLabel(type: string) {
    switch (type) {
      case 'income':
        return 'Entrada'
      case 'expense':
        return 'Despesa'
      default:
        return type
    }
  }

  function getStatusLabel(status: string | null) {
    switch (status) {
      case 'paid':
        return 'Pago'
      case 'pending':
        return 'Pendente'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status || 'Sem status'
    }
  }

  function getPaymentMethodLabel(paymentMethod: string | null) {
    switch (paymentMethod) {
      case 'cash':
        return 'Dinheiro'
      case 'pix':
        return 'Pix'
      case 'credit_card':
        return 'Cartão de crédito'
      case 'debit_card':
        return 'Cartão de débito'
      case 'transfer':
        return 'Transferência'
      default:
        return paymentMethod || 'Não informado'
    }
  }

  const totals = useMemo(() => {
    const income = transactions
      .filter(
        (transaction) =>
          transaction.type === 'income' && transaction.status !== 'cancelled'
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)

    const expenses = transactions
      .filter(
        (transaction) =>
          transaction.type === 'expense' && transaction.status !== 'cancelled'
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)

    return {
      income,
      expenses,
      balance: income - expenses,
      totalTransactions: transactions.length,
    }
  }, [transactions])

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-4xl font-bold">Financeiro</h1>

          <p className="mt-2 text-zinc-400">
            Controle de entradas, despesas e saldo do caixa.
          </p>
        </div>

        <button
          onClick={loadTransactions}
          className="rounded-xl bg-white px-5 py-3 font-bold text-black"
        >
          Atualizar
        </button>
      </div>

      <div className="mt-6 rounded-2xl bg-zinc-900 p-6">
        <label className="text-sm text-zinc-400">Filtrar por data</label>

        <input
          type="date"
          className="mt-2 w-full rounded-lg bg-zinc-800 p-3"
          value={filterDate}
          onChange={(event) => setFilterDate(event.target.value)}
        />

        {today && filterDate === today && (
          <p className="mt-3 text-sm text-zinc-500">
            Exibindo movimentações de hoje.
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Entradas</p>

          <p className="mt-3 text-2xl font-bold text-green-300">
            {formatCurrency(totals.income)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Despesas</p>

          <p className="mt-3 text-2xl font-bold text-red-300">
            {formatCurrency(totals.expenses)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Saldo</p>

          <p
            className={`mt-3 text-2xl font-bold ${
              totals.balance >= 0 ? 'text-blue-300' : 'text-red-300'
            }`}
          >
            {formatCurrency(totals.balance)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Movimentações</p>

          <p className="mt-3 text-2xl font-bold">
            {totals.totalTransactions}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">Movimentações financeiras</h2>

        {loading && (
          <p className="mt-6 rounded-xl bg-zinc-800 p-4 text-zinc-400">
            Carregando movimentações...
          </p>
        )}

        {!loading && transactions.length === 0 && (
          <p className="mt-6 rounded-xl bg-zinc-800 p-4 text-zinc-400">
            Nenhuma movimentação encontrada para esta data.
          </p>
        )}

        {!loading && transactions.length > 0 && (
          <div className="mt-6 space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          transaction.type === 'income'
                            ? 'bg-green-900 text-green-300'
                            : 'bg-red-900 text-red-300'
                        }`}
                      >
                        {getTypeLabel(transaction.type)}
                      </span>

                      <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300">
                        {getStatusLabel(transaction.status)}
                      </span>
                    </div>

                    <p className="mt-3 text-lg font-bold">
                      {transaction.description || 'Movimentação financeira'}
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      Categoria: {transaction.category}
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      Pagamento: {getPaymentMethodLabel(transaction.payment_method)}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p
                      className={`text-2xl font-bold ${
                        transaction.type === 'income'
                          ? 'text-green-300'
                          : 'text-red-300'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}{' '}
                      {formatCurrency(Number(transaction.amount || 0))}
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      {transaction.transaction_date}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}