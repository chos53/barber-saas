'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type AuditLog = {
  id: string
  company_id: string
  user_id: string | null
  action: string
  module: string
  record_id: string | null
  description: string
  created_at: string
}

const actionLabels: Record<string, string> = {
  create: 'Criação',
  update: 'Edição',
  delete: 'Exclusão',
  cancel: 'Cancelamento',
  export: 'Exportação',
  login: 'Login',
  logout: 'Saída',
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [currentUserId, setCurrentUserId] = useState('')
  const [currentUserEmail, setCurrentUserEmail] = useState('')

  useEffect(() => {
    loadAuditLogs()
  }, [])

  const filteredLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return logs.filter((log) => {
      const matchesModule =
        moduleFilter === 'all' || log.module.toLowerCase() === moduleFilter

      const matchesAction =
        actionFilter === 'all' || log.action.toLowerCase() === actionFilter

      const userName = getUserName(log).toLowerCase()

      const matchesSearch =
        !normalizedSearch ||
        log.description.toLowerCase().includes(normalizedSearch) ||
        log.module.toLowerCase().includes(normalizedSearch) ||
        log.action.toLowerCase().includes(normalizedSearch) ||
        userName.includes(normalizedSearch) ||
        String(log.record_id || '').toLowerCase().includes(normalizedSearch)

      return matchesModule && matchesAction && matchesSearch
    })
  }, [logs, search, moduleFilter, actionFilter, currentUserId, currentUserEmail])

  const availableModules = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.module.toLowerCase())))
      .filter(Boolean)
      .sort()
  }, [logs])

  const availableActions = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.action.toLowerCase())))
      .filter(Boolean)
      .sort()
  }, [logs])

  async function loadAuditLogs() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = '/login'
      return
    }

    setCurrentUserId(user.id)
    setCurrentUserEmail(user.email || '')

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
      .from('audit_logs')
      .select(`
        id,
        company_id,
        user_id,
        action,
        module,
        record_id,
        description,
        created_at
      `)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      alert(`Erro ao carregar auditoria: ${error.message}`)
      setLogs([])
      setLoading(false)
      return
    }

    setLogs((data || []) as AuditLog[])
    setLoading(false)
  }

  function getUserName(log: AuditLog) {
    if (!log.user_id) return 'Usuário não informado'

    if (log.user_id === currentUserId && currentUserEmail) {
      return currentUserEmail
    }

    return log.user_id
  }

  function formatDateTime(value: string) {
    return new Date(value).toLocaleString('pt-BR')
  }

  function getActionLabel(action: string) {
    return actionLabels[action.toLowerCase()] || action
  }

  function getActionClass(action: string) {
    const normalizedAction = action.toLowerCase()

    if (normalizedAction === 'create') return 'bg-green-500 text-black'
    if (normalizedAction === 'update') return 'bg-blue-500 text-white'
    if (normalizedAction === 'delete') return 'bg-red-500 text-white'
    if (normalizedAction === 'cancel') return 'bg-yellow-500 text-black'
    if (normalizedAction === 'export') return 'bg-purple-500 text-white'

    return 'bg-zinc-700 text-zinc-200'
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-8 py-6">
          <p className="text-zinc-400">Carregando auditoria...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-4xl font-bold">Auditoria</h1>

          <p className="mt-2 text-zinc-400">
            Histórico de ações importantes realizadas no sistema.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAuditLogs}
          className="rounded-xl bg-white px-5 py-3 font-bold text-black transition hover:bg-zinc-200"
        >
          Atualizar
        </button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-blue-900 bg-blue-950/30 p-6">
          <p className="text-sm text-blue-300">Logs carregados</p>
          <strong className="mt-2 block text-3xl text-white">
            {logs.length}
          </strong>
        </div>

        <div className="rounded-2xl border border-purple-900 bg-purple-950/30 p-6">
          <p className="text-sm text-purple-300">Módulos encontrados</p>
          <strong className="mt-2 block text-3xl text-white">
            {availableModules.length}
          </strong>
        </div>

        <div className="rounded-2xl border border-green-900 bg-green-950/30 p-6">
          <p className="text-sm text-green-300">Resultado filtrado</p>
          <strong className="mt-2 block text-3xl text-white">
            {filteredLogs.length}
          </strong>
        </div>
      </div>

      <div className="mt-8 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 md:grid-cols-[1fr_220px_220px]">
        <input
          placeholder="Pesquisar por usuário, ação, módulo, descrição ou registro..."
          className="rounded-xl border border-zinc-800 bg-black p-3 text-white outline-none"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          value={moduleFilter}
          onChange={(event) => setModuleFilter(event.target.value)}
          className="rounded-xl border border-zinc-800 bg-black p-3 text-white outline-none"
        >
          <option value="all">Todos os módulos</option>

          {availableModules.map((moduleName) => (
            <option key={moduleName} value={moduleName}>
              {moduleName}
            </option>
          ))}
        </select>

        <select
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          className="rounded-xl border border-zinc-800 bg-black p-3 text-white outline-none"
        >
          <option value="all">Todas as ações</option>

          {availableActions.map((actionName) => (
            <option key={actionName} value={actionName}>
              {getActionLabel(actionName)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-8 space-y-3">
        {filteredLogs.length === 0 && (
          <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-500">
            Nenhum log encontrado. Os registros aparecerão aqui conforme os módulos forem integrados à auditoria.
          </p>
        )}

        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${getActionClass(log.action)}`}>
                    {getActionLabel(log.action)}
                  </span>

                  <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300">
                    {log.module}
                  </span>
                </div>

                <p className="mt-3 font-bold text-white">
                  {log.description}
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Usuário: {getUserName(log)}
                </p>

                {log.record_id && (
                  <p className="mt-1 text-xs text-zinc-600">
                    Registro: {log.record_id}
                  </p>
                )}
              </div>

              <p className="text-sm text-zinc-400 xl:text-right">
                {formatDateTime(log.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
