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

type TransactionFilter = 'all' | 'income' | 'expense' | 'cancelled'

type PeriodFilter = 'today' | 'last_7_days' | 'current_month' | 'custom'

type PaymentFilter =
  | 'all'
  | 'cash'
  | 'pix'
  | 'credit_card'
  | 'debit_card'
  | 'transfer'

export default function FinanceiroPage() {
  const [companyId, setCompanyId] = useState('')
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [monthlyTransactions, setMonthlyTransactions] = useState<
    FinancialTransaction[]
  >([])
  const [transactionFilter, setTransactionFilter] =
    useState<TransactionFilter>('all')

  const [paymentFilter, setPaymentFilter] =
    useState<PaymentFilter>('all')

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [monthStartDate, setMonthStartDate] = useState('')
  const [monthEndDate, setMonthEndDate] = useState('')
  const [today, setToday] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingExpense, setSavingExpense] = useState(false)
  const [cancellingId, setCancellingId] = useState('')

  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('general')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expensePaymentMethod, setExpensePaymentMethod] = useState('cash')
  const [expenseDate, setExpenseDate] = useState('')

  useEffect(() => {
    const now = new Date()
    const currentDate = formatDate(now)
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    setToday(currentDate)
    setStartDate(currentDate)
    setEndDate(currentDate)
    setMonthStartDate(formatDate(firstDayOfMonth))
    setMonthEndDate(currentDate)
    setExpenseDate(currentDate)
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      loadTransactions()
    }
  }, [startDate, endDate])

  useEffect(() => {
    if (monthStartDate && monthEndDate) {
      loadMonthlyTransactions()
    }
  }, [monthStartDate, monthEndDate])

  function formatDate(date: Date) {
    return date.toISOString().split('T')[0]
  }

  function handlePeriodChange(period: PeriodFilter) {
    setPeriodFilter(period)

    const now = new Date()
    const currentDate = formatDate(now)

    if (period === 'today') {
      setStartDate(currentDate)
      setEndDate(currentDate)
      return
    }

    if (period === 'last_7_days') {
      const pastDate = new Date()
      pastDate.setDate(now.getDate() - 6)

      setStartDate(formatDate(pastDate))
      setEndDate(currentDate)
      return
    }

    if (period === 'current_month') {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      setStartDate(formatDate(firstDayOfMonth))
      setEndDate(currentDate)
      return
    }
  }

  async function getCompanyId() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = '/login'
      return null
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return null
    }

    setCompanyId(profile.company_id)

    return profile.company_id
  }

  async function loadTransactions() {
    setLoading(true)

    const currentCompanyId = await getCompanyId()

    if (!currentCompanyId) {
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
      .eq('company_id', currentCompanyId)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    setTransactions((data || []) as FinancialTransaction[])
    setLoading(false)
  }

  async function loadMonthlyTransactions() {
    const currentCompanyId = companyId || (await getCompanyId())

    if (!currentCompanyId) {
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
      .eq('company_id', currentCompanyId)
      .gte('transaction_date', monthStartDate)
      .lte('transaction_date', monthEndDate)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      alert(error.message)
      return
    }

    setMonthlyTransactions((data || []) as FinancialTransaction[])
  }

  async function createExpense() {
    if (!companyId) {
      alert('Empresa não identificada. Atualize a página e tente novamente.')
      return
    }

    if (!expenseDescription.trim()) {
      alert('Informe a descrição da despesa.')
      return
    }

    if (!expenseAmount || Number(expenseAmount) <= 0) {
      alert('Informe um valor válido para a despesa.')
      return
    }

    if (!expenseDate) {
      alert('Informe a data da despesa.')
      return
    }

    if (savingExpense) {
      return
    }

    setSavingExpense(true)

    const { error } = await supabase.from('financial_transactions').insert({
      company_id: companyId,
      type: 'expense',
      category: expenseCategory,
      description: expenseDescription.trim(),
      amount: Number(expenseAmount),
      payment_method: expensePaymentMethod,
      status: 'paid',
      transaction_date: expenseDate,
    })

    setSavingExpense(false)

    if (error) {
      alert(error.message)
      return
    }

    setExpenseDescription('')
    setExpenseCategory('general')
    setExpenseAmount('')
    setExpensePaymentMethod('cash')
    setExpenseDate(today || startDate)

    if (expenseDate < startDate || expenseDate > endDate) {
      setPeriodFilter('custom')
      setStartDate(expenseDate)
      setEndDate(expenseDate)
    } else {
      loadTransactions()
    }

    if (expenseDate >= monthStartDate && expenseDate <= monthEndDate) {
      loadMonthlyTransactions()
    }
  }

  async function cancelTransaction(transactionId: string) {
    const confirmCancel = window.confirm(
      'Tem certeza que deseja cancelar esta movimentação? Ela continuará no histórico, mas não entrará mais nos cálculos.'
    )

    if (!confirmCancel) {
      return
    }

    if (cancellingId) {
      return
    }

    setCancellingId(transactionId)

    const { error } = await supabase
      .from('financial_transactions')
      .update({ status: 'cancelled' })
      .eq('id', transactionId)

    setCancellingId('')

    if (error) {
      alert(error.message)
      return
    }

    loadTransactions()
    loadMonthlyTransactions()
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

  function getCategoryLabel(category: string) {
    switch (category) {
      case 'service':
        return 'Serviço'
      case 'general':
        return 'Geral'
      case 'rent':
        return 'Aluguel'
      case 'products':
        return 'Produtos'
      case 'commission':
        return 'Comissão'
      case 'energy':
        return 'Energia'
      case 'internet':
        return 'Internet'
      case 'maintenance':
        return 'Manutenção'
      case 'marketing':
        return 'Marketing'
      case 'tax':
        return 'Impostos'
      default:
        return category
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

  function calculateTotals(items: FinancialTransaction[]) {
    const income = items
      .filter(
        (transaction) =>
          transaction.type === 'income' && transaction.status !== 'cancelled'
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)

    const expenses = items
      .filter(
        (transaction) =>
          transaction.type === 'expense' && transaction.status !== 'cancelled'
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)

    const cancelled = items.filter(
      (transaction) => transaction.status === 'cancelled'
    ).length

    return {
      income,
      expenses,
      balance: income - expenses,
      totalTransactions: items.length,
      cancelled,
    }
  }

  const totals = useMemo(() => {
    return calculateTotals(transactions)
  }, [transactions])

  const monthlyTotals = useMemo(() => {
    return calculateTotals(monthlyTransactions)
  }, [monthlyTransactions])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const transactionMatches =
        transactionFilter === 'all'
          ? true
          : transactionFilter === 'cancelled'
            ? transaction.status === 'cancelled'
            : transaction.type === transactionFilter &&
              transaction.status !== 'cancelled'

      const paymentMatches =
        paymentFilter === 'all'
          ? true
          : transaction.payment_method === paymentFilter

      return transactionMatches && paymentMatches
    })
  }, [transactions, transactionFilter, paymentFilter])

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
          onClick={() => {
            loadTransactions()
            loadMonthlyTransactions()
          }}
          className="rounded-xl bg-white px-5 py-3 font-bold text-black"
        >
          Atualizar
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold">Resumo do mês atual</h2>

            <p className="mt-1 text-sm text-zinc-500">
              De {monthStartDate} até {monthEndDate}
            </p>
          </div>

          <span
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              monthlyTotals.balance >= 0
                ? 'bg-green-900 text-green-300'
                : 'bg-red-900 text-red-300'
            }`}
          >
            {monthlyTotals.balance >= 0 ? 'Lucro positivo' : 'Lucro negativo'}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-zinc-950 p-5">
            <p className="text-sm text-zinc-500">Faturamento mensal</p>

            <p className="mt-3 text-2xl font-bold text-green-300">
              {formatCurrency(monthlyTotals.income)}
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-950 p-5">
            <p className="text-sm text-zinc-500">Despesas mensais</p>

            <p className="mt-3 text-2xl font-bold text-red-300">
              {formatCurrency(monthlyTotals.expenses)}
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-950 p-5">
            <p className="text-sm text-zinc-500">Lucro mensal</p>

            <p
              className={`mt-3 text-2xl font-bold ${
                monthlyTotals.balance >= 0 ? 'text-blue-300' : 'text-red-300'
              }`}
            >
              {formatCurrency(monthlyTotals.balance)}
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-950 p-5">
            <p className="text-sm text-zinc-500">Movimentações no mês</p>

            <p className="mt-3 text-2xl font-bold">
              {monthlyTotals.totalTransactions}
            </p>

            {monthlyTotals.cancelled > 0 && (
              <p className="mt-2 text-xs text-zinc-500">
                {monthlyTotals.cancelled} cancelada(s)
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-zinc-900 p-6">
          <label className="text-sm text-zinc-400">
            Filtrar por período
          </label>

          <select
            className="mt-2 w-full rounded-lg bg-zinc-800 p-3"
            value={periodFilter}
            onChange={(event) =>
              handlePeriodChange(event.target.value as PeriodFilter)
            }
          >
            <option value="today">Hoje</option>
            <option value="last_7_days">Últimos 7 dias</option>
            <option value="current_month">Mês atual</option>
            <option value="custom">Período personalizado</option>
          </select>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              type="date"
              className="rounded-lg bg-zinc-800 p-3"
              value={startDate}
              disabled={periodFilter !== 'custom'}
              onChange={(event) => setStartDate(event.target.value)}
            />

            <input
              type="date"
              className="rounded-lg bg-zinc-800 p-3"
              value={endDate}
              disabled={periodFilter !== 'custom'}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <label className="text-sm text-zinc-400">
            Filtrar movimentações
          </label>

          <select
            className="mt-2 w-full rounded-lg bg-zinc-800 p-3"
            value={transactionFilter}
            onChange={(event) =>
              setTransactionFilter(event.target.value as TransactionFilter)
            }
          >
            <option value="all">Todas</option>
            <option value="income">Entradas</option>
            <option value="expense">Despesas</option>
            <option value="cancelled">Canceladas</option>
          </select>

          <p className="mt-3 text-sm text-zinc-500">
            Exibindo {filteredTransactions.length} de {transactions.length}{' '}
            movimentações.
          </p>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6">
          <label className="text-sm text-zinc-400">
            Forma de pagamento
          </label>

          <select
            className="mt-2 w-full rounded-lg bg-zinc-800 p-3"
            value={paymentFilter}
            onChange={(event) =>
              setPaymentFilter(event.target.value as PaymentFilter)
            }
          >
            <option value="all">Todas</option>
            <option value="cash">Dinheiro</option>
            <option value="pix">Pix</option>
            <option value="credit_card">
              Cartão de crédito
            </option>
            <option value="debit_card">
              Cartão de débito
            </option>
            <option value="transfer">
              Transferência
            </option>
          </select>

          <p className="mt-3 text-sm text-zinc-500">
            Filtre entradas e despesas pela forma de pagamento.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Entradas do período</p>

          <p className="mt-3 text-2xl font-bold text-green-300">
            {formatCurrency(totals.income)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Despesas do período</p>

          <p className="mt-3 text-2xl font-bold text-red-300">
            {formatCurrency(totals.expenses)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Saldo do período</p>

          <p
            className={`mt-3 text-2xl font-bold ${
              totals.balance >= 0 ? 'text-blue-300' : 'text-red-300'
            }`}
          >
            {formatCurrency(totals.balance)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">
            Movimentações do período
          </p>

          <p className="mt-3 text-2xl font-bold">
            {filteredTransactions.length}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">Lançar despesa</h2>

        <p className="mt-2 text-sm text-zinc-500">
          Registre saídas como aluguel, produtos, energia, internet,
          marketing ou manutenção.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <input
            placeholder="Descrição da despesa"
            className="rounded-xl bg-zinc-800 p-4"
            value={expenseDescription}
            onChange={(event) =>
              setExpenseDescription(event.target.value)
            }
          />

          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Valor"
            className="rounded-xl bg-zinc-800 p-4"
            value={expenseAmount}
            onChange={(event) => setExpenseAmount(event.target.value)}
          />

          <select
            className="rounded-xl bg-zinc-800 p-4"
            value={expenseCategory}
            onChange={(event) =>
              setExpenseCategory(event.target.value)
            }
          >
            <option value="general">Geral</option>
            <option value="rent">Aluguel</option>
            <option value="products">Produtos</option>
            <option value="commission">Comissão</option>
            <option value="energy">Energia</option>
            <option value="internet">Internet</option>
            <option value="maintenance">Manutenção</option>
            <option value="marketing">Marketing</option>
            <option value="tax">Impostos</option>
          </select>

          <select
            className="rounded-xl bg-zinc-800 p-4"
            value={expensePaymentMethod}
            onChange={(event) =>
              setExpensePaymentMethod(event.target.value)
            }
          >
            <option value="cash">Dinheiro</option>
            <option value="pix">Pix</option>
            <option value="credit_card">
              Cartão de crédito
            </option>
            <option value="debit_card">
              Cartão de débito
            </option>
            <option value="transfer">
              Transferência
            </option>
          </select>

          <input
            type="date"
            className="rounded-xl bg-zinc-800 p-4"
            value={expenseDate}
            onChange={(event) => setExpenseDate(event.target.value)}
          />

          <button
            onClick={createExpense}
            disabled={savingExpense}
            className={`rounded-xl p-4 font-bold transition ${
              savingExpense
                ? 'cursor-not-allowed bg-zinc-700 text-zinc-400'
                : 'bg-red-600 text-white hover:bg-red-500'
            }`}
          >
            {savingExpense ? 'Salvando...' : 'Lançar despesa'}
          </button>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">
          Movimentações financeiras
        </h2>

        {loading && (
          <p className="mt-6 rounded-xl bg-zinc-800 p-4 text-zinc-400">
            Carregando movimentações...
          </p>
        )}

        {!loading && transactions.length === 0 && (
          <p className="mt-6 rounded-xl bg-zinc-800 p-4 text-zinc-400">
            Nenhuma movimentação encontrada para este período.
          </p>
        )}

        {!loading &&
          transactions.length > 0 &&
          filteredTransactions.length === 0 && (
            <p className="mt-6 rounded-xl bg-zinc-800 p-4 text-zinc-400">
              Nenhuma movimentação encontrada para este filtro.
            </p>
          )}

        {!loading && filteredTransactions.length > 0 && (
          <div className="mt-6 space-y-3">
            {filteredTransactions.map((transaction) => {
              const isCancelled =
                transaction.status === 'cancelled'

              return (
                <div
                  key={transaction.id}
                  className={`rounded-2xl border p-5 ${
                    isCancelled
                      ? 'border-zinc-800 bg-zinc-950 opacity-60'
                      : 'border-zinc-800 bg-zinc-950'
                  }`}
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

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            isCancelled
                              ? 'bg-zinc-700 text-zinc-300'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {getStatusLabel(transaction.status)}
                        </span>
                      </div>

                      <p
                        className={`mt-3 text-lg font-bold ${
                          isCancelled
                            ? 'line-through text-zinc-500'
                            : ''
                        }`}
                      >
                        {transaction.description ||
                          'Movimentação financeira'}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        Categoria:{' '}
                        {getCategoryLabel(transaction.category)}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        Pagamento:{' '}
                        {getPaymentMethodLabel(
                          transaction.payment_method
                        )}
                      </p>

                      {isCancelled && (
                        <p className="mt-3 rounded-xl bg-zinc-900 p-3 text-sm text-zinc-400">
                          Esta movimentação foi cancelada e não entra
                          nos cálculos do financeiro.
                        </p>
                      )}
                    </div>

                    <div className="text-left md:text-right">
                      <p
                        className={`text-2xl font-bold ${
                          isCancelled
                            ? 'text-zinc-500 line-through'
                            : transaction.type === 'income'
                              ? 'text-green-300'
                              : 'text-red-300'
                        }`}
                      >
                        {transaction.type === 'income'
                          ? '+'
                          : '-'}{' '}
                        {formatCurrency(
                          Number(transaction.amount || 0)
                        )}
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        {transaction.transaction_date}
                      </p>

                      {!isCancelled && (
                        <button
                          onClick={() =>
                            cancelTransaction(transaction.id)
                          }
                          disabled={
                            cancellingId === transaction.id
                          }
                          className="mt-4 rounded-xl bg-zinc-800 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-950"
                        >
                          {cancellingId === transaction.id
                            ? 'Cancelando...'
                            : 'Cancelar'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}