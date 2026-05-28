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

type CashRegisterSession = {
  id: string
  opening_amount: number
  closing_amount: number | null
  expected_amount: number | null
  difference_amount: number | null
  opened_at: string
  closed_at: string | null
  created_at?: string
  session_date?: string
  opened_by_name?: string | null
  status: 'open' | 'closed'
}

type CashMovement = {
  id: string
  cash_session_id: string
  type: 'withdrawal' | 'reinforcement'
  amount: number
  reason: string | null
  created_at: string
}

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

  const [periodFilter, setPeriodFilter] =
    useState<PeriodFilter>('today')

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
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<PaymentFilter>('cash')
  const [expenseDate, setExpenseDate] = useState('')

  const [cashSession, setCashSession] =
    useState<CashRegisterSession | null>(null)

  const [openingAmount, setOpeningAmount] = useState('')
  const [closingAmount, setClosingAmount] = useState('')
  const [openingCash, setOpeningCash] = useState(false)
  const [closingCash, setClosingCash] = useState(false)

  const [cashHistory, setCashHistory] = useState<CashRegisterSession[]>([])
  const [cashHistoryLoading, setCashHistoryLoading] = useState(false)

  const [cashMovements, setCashMovements] = useState<CashMovement[]>([])
  const [cashMovementType, setCashMovementType] =
    useState<'withdrawal' | 'reinforcement'>('withdrawal')
  const [cashMovementAmount, setCashMovementAmount] = useState('')
  const [cashMovementReason, setCashMovementReason] = useState('')
  const [savingCashMovement, setSavingCashMovement] = useState(false)

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

  useEffect(() => {
    loadCashRegister()
  }, [])

  useEffect(() => {
    loadCashHistory()
  }, [startDate, endDate])

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

    if (!profile?.company_id) return null

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

    if (!currentCompanyId) return

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

    if (savingExpense) return

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

    if (!confirmCancel || cancellingId) return

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


  async function loadCashRegister() {
    const currentCompanyId = companyId || (await getCompanyId())

    if (!currentCompanyId) return

    const todayDate = formatDate(new Date())

    const { data } = await supabase
      .from('cash_register_sessions')
      .select('*')
      .eq('company_id', currentCompanyId)
      .eq('session_date', todayDate)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data?.status === 'open') {
      setCashSession(data as CashRegisterSession)
      await loadCashMovements(data.id)
    } else {
      setCashSession(null)
      setCashMovements([])
    }
  }


  async function loadCashMovements(cashSessionId: string) {
    const { data, error } = await supabase
      .from('cash_register_movements')
      .select('*')
      .eq('cash_session_id', cashSessionId)
      .order('created_at', { ascending: false })

    if (error) {
      alert(error.message)
      return
    }

    setCashMovements((data || []) as CashMovement[])
  }

  async function saveCashMovement() {
    if (!companyId || !cashSession) {
      alert('Abra o caixa antes de registrar sangria ou reforço.')
      return
    }

    if (cashSession.status !== 'open') {
      alert('Somente caixas abertos podem receber sangria ou reforço.')
      return
    }

    if (!cashMovementAmount || Number(cashMovementAmount) <= 0) {
      alert('Informe um valor válido.')
      return
    }

    if (!cashMovementReason.trim()) {
      alert('Informe o motivo.')
      return
    }

    setSavingCashMovement(true)

    const { error } = await supabase
      .from('cash_register_movements')
      .insert({
        company_id: companyId,
        cash_session_id: cashSession.id,
        type: cashMovementType,
        amount: Number(cashMovementAmount),
        reason: cashMovementReason.trim(),
      })

    setSavingCashMovement(false)

    if (error) {
      alert(error.message)
      return
    }

    setCashMovementAmount('')
    setCashMovementReason('')
    setCashMovementType('withdrawal')

    await loadCashMovements(cashSession.id)
  }

  async function loadCashHistory() {
    const currentCompanyId = companyId || (await getCompanyId())

    if (!currentCompanyId || !startDate || !endDate) return

    setCashHistoryLoading(true)

    const { data, error } = await supabase
      .from('cash_register_sessions')
      .select('*')
      .eq('company_id', currentCompanyId)
      .gte('session_date', startDate)
      .lte('session_date', endDate)
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false })

    setCashHistoryLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setCashHistory((data || []) as CashRegisterSession[])
  }

  async function openCashRegister() {
    if (!companyId) {
      alert('Empresa não identificada.')
      return
    }

    if (!openingAmount || Number(openingAmount) < 0) {
      alert('Informe o valor de abertura.')
      return
    }

    setOpeningCash(true)

    const { data, error } = await supabase
      .from('cash_register_sessions')
      .insert({
        company_id: companyId,
        session_date: formatDate(new Date()),
        opening_amount: Number(openingAmount),
        status: 'open',
      })
      .select()
      .single()

    setOpeningCash(false)

    if (error) {
      alert(error.message)
      return
    }

    setCashSession(data as CashRegisterSession)
    setCashMovements([])
    setOpeningAmount('')

    loadCashHistory()
  }

  async function closeCashRegister() {
    if (!cashSession) return

    if (!closingAmount || Number(closingAmount) < 0) {
      alert('Informe o valor contado no caixa.')
      return
    }

    const expected = cashExpectedAmount

    const difference = Number(closingAmount) - expected

    setClosingCash(true)

    const { data, error } = await supabase
      .from('cash_register_sessions')
      .update({
        closing_amount: Number(closingAmount),
        expected_amount: expected,
        difference_amount: difference,
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', cashSession.id)
      .select()
      .single()

    setClosingCash(false)

    if (error) {
      alert(error.message)
      return
    }

    setCashSession(data as CashRegisterSession)
    setClosingAmount('')

    loadCashHistory()
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
      case 'comanda':
        return 'Comanda'
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

  function sumPayment(method: PaymentFilter) {
    if (method === 'all') return 0

    return transactions
      .filter(
        (transaction) =>
          transaction.type === 'income' &&
          transaction.status !== 'cancelled' &&
          transaction.payment_method === method
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
  }

  const totals = useMemo(() => calculateTotals(transactions), [transactions])

  const monthlyTotals = useMemo(
    () => calculateTotals(monthlyTransactions),
    [monthlyTransactions]
  )

  const cashWithdrawalsTotal = useMemo(() => {
    return cashMovements
      .filter((movement) => movement.type === 'withdrawal')
      .reduce((sum, movement) => sum + Number(movement.amount || 0), 0)
  }, [cashMovements])

  const cashReinforcementsTotal = useMemo(() => {
    return cashMovements
      .filter((movement) => movement.type === 'reinforcement')
      .reduce((sum, movement) => sum + Number(movement.amount || 0), 0)
  }, [cashMovements])

  const cashExpectedAmount = useMemo(() => {
    return (
      Number(cashSession?.opening_amount || 0) +
      totals.balance +
      cashReinforcementsTotal -
      cashWithdrawalsTotal
    )
  }, [
    cashSession,
    totals.balance,
    cashReinforcementsTotal,
    cashWithdrawalsTotal,
  ])

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
        <div className="flex flex-col justify-between gap-6 lg:flex-row">
          <div className="flex-1">
            <h2 className="text-2xl font-bold">
              Caixa diário
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Controle de abertura, fechamento e conferência do caixa.
            </p>

            {!cashSession && (
              <div className="mt-5 flex flex-col gap-3 md:flex-row">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingAmount}
                  onChange={(event) => setOpeningAmount(event.target.value)}
                  placeholder="Valor inicial do caixa"
                  className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                />

                <button
                  type="button"
                  onClick={openCashRegister}
                  disabled={openingCash}
                  className="rounded-xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-500 disabled:opacity-50"
                >
                  {openingCash ? 'Abrindo...' : 'Abrir caixa'}
                </button>
              </div>
            )}

            {cashSession && (
              <div className="mt-5 grid gap-4 md:grid-cols-7">
                <div className="rounded-xl bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-500">Abertura</p>
                  <strong className="mt-2 block text-xl text-green-300">
                    {formatCurrency(cashSession.opening_amount || 0)}
                  </strong>
                </div>

                <div className="rounded-xl bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-500">Entradas líquidas</p>
                  <strong className="mt-2 block text-xl text-blue-300">
                    {formatCurrency(totals.balance)}
                  </strong>
                </div>

                <div className="rounded-xl bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-500">Saldo esperado</p>
                  <strong className="mt-2 block text-xl text-yellow-300">
                    {formatCurrency(
                      cashExpectedAmount
                    )}
                  </strong>
                </div>

                <div className="rounded-xl bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-500">Sangrias</p>
                  <strong className="mt-2 block text-xl text-red-300">
                    {formatCurrency(cashWithdrawalsTotal)}
                  </strong>
                </div>

                <div className="rounded-xl bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-500">Reforços</p>
                  <strong className="mt-2 block text-xl text-green-300">
                    {formatCurrency(cashReinforcementsTotal)}
                  </strong>
                </div>

                <div className="rounded-xl bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-500">Status</p>
                  <strong
                    className={`mt-2 block text-xl ${
                      cashSession.status === 'open'
                        ? 'text-green-300'
                        : 'text-red-300'
                    }`}
                  >
                    {cashSession.status === 'open'
                      ? 'Caixa aberto'
                      : 'Caixa fechado'}
                  </strong>
                </div>

                <div className="rounded-xl bg-zinc-950 p-4">
                  <p className="text-sm text-zinc-500">Diferença</p>
                  <strong
                    className={`mt-2 block text-xl ${
                      Number(cashSession.difference_amount || 0) === 0
                        ? 'text-blue-300'
                        : Number(cashSession.difference_amount || 0) > 0
                          ? 'text-green-300'
                          : 'text-red-300'
                    }`}
                  >
                    {formatCurrency(
                      Number(cashSession.difference_amount || 0)
                    )}
                  </strong>
                </div>
              </div>
            )}

            {cashSession && cashSession.status === 'open' && (
              <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                <h3 className="text-lg font-bold">
                  Sangria / Reforço
                </h3>

                <p className="mt-1 text-sm text-zinc-500">
                  Registre retirada ou entrada extra de dinheiro no caixa.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-[auto_1fr_2fr_auto]">
                  <select
                    value={cashMovementType}
                    onChange={(event) =>
                      setCashMovementType(
                        event.target.value as 'withdrawal' | 'reinforcement'
                      )
                    }
                    className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                  >
                    <option value="withdrawal">Sangria</option>
                    <option value="reinforcement">Reforço</option>
                  </select>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashMovementAmount}
                    onChange={(event) =>
                      setCashMovementAmount(event.target.value)
                    }
                    placeholder="Valor"
                    className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                  />

                  <input
                    value={cashMovementReason}
                    onChange={(event) =>
                      setCashMovementReason(event.target.value)
                    }
                    placeholder="Motivo. Ex: retirada para troco, reforço inicial..."
                    className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                  />

                  <button
                    type="button"
                    onClick={saveCashMovement}
                    disabled={savingCashMovement}
                    className={`rounded-xl px-5 py-3 font-bold text-white disabled:opacity-50 ${
                      cashMovementType === 'withdrawal'
                        ? 'bg-red-600 hover:bg-red-500'
                        : 'bg-green-600 hover:bg-green-500'
                    }`}
                  >
                    {savingCashMovement ? 'Salvando...' : 'Registrar'}
                  </button>
                </div>

                <div className="mt-5 space-y-2">
                  {cashMovements.length === 0 && (
                    <p className="rounded-xl bg-zinc-900 p-3 text-sm text-zinc-500">
                      Nenhuma sangria ou reforço registrado.
                    </p>
                  )}

                  {cashMovements.map((movement) => (
                    <div
                      key={movement.id}
                      className="flex flex-col justify-between gap-2 rounded-xl bg-zinc-900 p-3 text-sm md:flex-row md:items-center"
                    >
                      <div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            movement.type === 'withdrawal'
                              ? 'bg-red-900 text-red-300'
                              : 'bg-green-900 text-green-300'
                          }`}
                        >
                          {movement.type === 'withdrawal'
                            ? 'Sangria'
                            : 'Reforço'}
                        </span>

                        <p className="mt-2 text-zinc-400">
                          {movement.reason}
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          {new Date(movement.created_at).toLocaleString(
                            'pt-BR'
                          )}
                        </p>
                      </div>

                      <strong
                        className={
                          movement.type === 'withdrawal'
                            ? 'text-red-300'
                            : 'text-green-300'
                        }
                      >
                        {formatCurrency(Number(movement.amount || 0))}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cashSession && cashSession.status === 'open' && (
              <div className="mt-5 flex flex-col gap-3 md:flex-row">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={closingAmount}
                  onChange={(event) => setClosingAmount(event.target.value)}
                  placeholder="Valor contado no caixa"
                  className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                />

                <button
                  type="button"
                  onClick={closeCashRegister}
                  disabled={closingCash}
                  className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {closingCash ? 'Fechando...' : 'Fechar caixa'}
                </button>
              </div>
            )}

            {cashSession?.closed_at && (
              <p className="mt-4 text-sm text-zinc-500">
                Caixa fechado em{' '}
                {new Date(cashSession.closed_at).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        </div>
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

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">Lançar despesa</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="text-sm text-zinc-400">Descrição</label>
            <input
              value={expenseDescription}
              onChange={(event) => setExpenseDescription(event.target.value)}
              placeholder="Ex: compra de lâminas"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400">Categoria</label>
            <select
              value={expenseCategory}
              onChange={(event) => setExpenseCategory(event.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
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
          </div>

          <div>
            <label className="text-sm text-zinc-400">Valor</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={expenseAmount}
              onChange={(event) => setExpenseAmount(event.target.value)}
              placeholder="0,00"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400">Data</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
          <div>
            <label className="text-sm text-zinc-400">Forma de pagamento</label>
            <select
              value={expensePaymentMethod}
              onChange={(event) =>
                setExpensePaymentMethod(event.target.value as PaymentFilter)
              }
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
            >
              <option value="cash">Dinheiro</option>
              <option value="pix">Pix</option>
              <option value="credit_card">Cartão de crédito</option>
              <option value="debit_card">Cartão de débito</option>
            </select>
          </div>

          <button
            type="button"
            onClick={createExpense}
            disabled={savingExpense}
            className="self-end rounded-xl bg-red-500 px-6 py-3 font-bold text-white transition hover:bg-red-400 disabled:opacity-50"
          >
            {savingExpense ? 'Salvando...' : 'Salvar despesa'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-zinc-900 p-6">
          <label className="text-sm text-zinc-400">Filtrar por período</label>

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
          <label className="text-sm text-zinc-400">Filtrar movimentações</label>

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
          <label className="text-sm text-zinc-400">Forma de pagamento</label>

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
            <option value="credit_card">Cartão de crédito</option>
            <option value="debit_card">Cartão de débito</option>
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
          <p className="text-sm text-zinc-500">Movimentações do período</p>
          <p className="mt-3 text-2xl font-bold">
            {filteredTransactions.length}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Entradas em Dinheiro</p>
          <p className="mt-3 text-2xl font-bold text-green-300">
            {formatCurrency(sumPayment('cash'))}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Entradas via Pix</p>
          <p className="mt-3 text-2xl font-bold text-cyan-300">
            {formatCurrency(sumPayment('pix'))}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Crédito</p>
          <p className="mt-3 text-2xl font-bold text-yellow-300">
            {formatCurrency(sumPayment('credit_card'))}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Débito</p>
          <p className="mt-3 text-2xl font-bold text-orange-300">
            {formatCurrency(sumPayment('debit_card'))}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold">
              Histórico de caixas
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Auditoria diária de abertura e fechamento de caixa.
            </p>
          </div>

          <div className="rounded-full bg-zinc-800 px-4 py-2 text-sm text-zinc-400">
            {cashHistory.length} caixa(s)
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr className="border-b border-zinc-800 text-sm text-zinc-500">
                <th className="py-3">Data</th>
                <th>Status</th>
                <th>Abertura</th>
                <th>Fechamento</th>
                <th>Esperado</th>
                <th>Diferença</th>
                <th>Abertura em</th>
                <th>Fechamento em</th>
              </tr>
            </thead>

            <tbody>
              {cashHistoryLoading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    Carregando histórico...
                  </td>
                </tr>
              )}

              {!cashHistoryLoading && cashHistory.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    Nenhum caixa encontrado no período.
                  </td>
                </tr>
              )}

              {!cashHistoryLoading &&
                cashHistory.map((cash) => (
                  <tr
                    key={cash.id}
                    className="border-b border-zinc-800 text-sm"
                  >
                    <td className="py-4">
                      {cash.session_date || '-'}
                    </td>

                    <td>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          cash.status === 'open'
                            ? 'bg-green-900 text-green-300'
                            : 'bg-red-900 text-red-300'
                        }`}
                      >
                        {cash.status === 'open'
                          ? 'Aberto'
                          : 'Fechado'}
                      </span>
                    </td>

                    <td className="text-green-300 font-bold">
                      {formatCurrency(Number(cash.opening_amount || 0))}
                    </td>

                    <td className="text-blue-300 font-bold">
                      {formatCurrency(Number(cash.closing_amount || 0))}
                    </td>

                    <td className="text-yellow-300 font-bold">
                      {formatCurrency(Number(cash.expected_amount || 0))}
                    </td>

                    <td
                      className={`font-bold ${
                        Number(cash.difference_amount || 0) === 0
                          ? 'text-blue-300'
                          : Number(cash.difference_amount || 0) > 0
                            ? 'text-green-300'
                            : 'text-red-300'
                      }`}
                    >
                      {formatCurrency(Number(cash.difference_amount || 0))}
                    </td>

                    <td>
                      {cash.opened_at
                        ? new Date(cash.opened_at).toLocaleString('pt-BR')
                        : '-'}
                    </td>

                    <td>
                      {cash.closed_at
                        ? new Date(cash.closed_at).toLocaleString('pt-BR')
                        : '-'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">Movimentações</h2>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-zinc-800 text-sm text-zinc-500">
                <th className="py-3">Data</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Pagamento</th>
                <th>Status</th>
                <th className="text-right">Valor</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    Carregando movimentações...
                  </td>
                </tr>
              )}

              {!loading && filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-500">
                    Nenhuma movimentação encontrada.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-zinc-800 text-sm"
                  >
                    <td className="py-4">{transaction.transaction_date}</td>
                    <td>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          transaction.type === 'income'
                            ? 'bg-green-900 text-green-300'
                            : 'bg-red-900 text-red-300'
                        }`}
                      >
                        {getTypeLabel(transaction.type)}
                      </span>
                    </td>
                    <td>{getCategoryLabel(transaction.category)}</td>
                    <td>{transaction.description || 'Sem descrição'}</td>
                    <td>{getPaymentMethodLabel(transaction.payment_method)}</td>
                    <td>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          transaction.status === 'cancelled'
                            ? 'bg-red-900 text-red-300'
                            : 'bg-blue-900 text-blue-300'
                        }`}
                      >
                        {getStatusLabel(transaction.status)}
                      </span>
                    </td>
                    <td
                      className={`text-right font-bold ${
                        transaction.type === 'income'
                          ? 'text-green-300'
                          : 'text-red-300'
                      }`}
                    >
                      {formatCurrency(Number(transaction.amount))}
                    </td>
                    <td className="text-right">
                      {transaction.status !== 'cancelled' ? (
                        <button
                          type="button"
                          onClick={() => cancelTransaction(transaction.id)}
                          disabled={cancellingId === transaction.id}
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
                        >
                          {cancellingId === transaction.id
                            ? 'Cancelando...'
                            : 'Cancelar'}
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-500">Cancelada</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
