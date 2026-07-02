'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Service = {
  id: string
  name: string
  duration_minutes: number
  price: number
  active: boolean
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [search, setSearch] = useState('')

  const [companyId, setCompanyId] = useState('')
  const [name, setName] = useState('')
  const [duration, setDuration] = useState('30')
  const [price, setPrice] = useState('0')

  const [editingServiceId, setEditingServiceId] = useState('')
  const [editName, setEditName] = useState('')
  const [editDuration, setEditDuration] = useState('30')
  const [editPrice, setEditPrice] = useState('0')

  useEffect(() => {
    loadData()
  }, [])

  const filteredServices = useMemo(() => {
    return services.filter((service) =>
      service.name
        .toLowerCase()
        .includes(search.toLowerCase())
    )
  }, [services, search])

  async function loadData() {
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

    if (!profile?.company_id) return

    setCompanyId(profile.company_id)

    const { data } = await supabase
      .from('services')
      .select('id, name, duration_minutes, price, active')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    setServices(data || [])
  }

  async function createService() {
    if (!name.trim()) {
      alert('Digite o nome do serviço.')
      return
    }
    if (!companyId) {
      alert('Erro: Empresa não identificada.')
      return
    }

    try {
      // 1. TRAVA SaaS: Buscar plano e status de assinatura da empresa em tempo real
      const { data: sub, error: subError } = await supabase
        .from('company_subscriptions')
        .select('status, trial_ends_at, subscription_ends_at, saas_plans ( max_services )')
        .eq('company_id', companyId)
        .single()

      if (subError) throw new Error('Não foi possível verificar seu plano SaaS.')

      // 2. Calcular expiração real para AMBOS os cenários (Trial ou Ativa vencida)
      const hoje = new Date()
      const dataVencimento = sub?.status === 'trial' ? sub?.trial_ends_at : sub?.subscription_ends_at
      
      const assinaturaExpirada = dataVencimento && new Date(dataVencimento) < hoje
      const statusEfetivo = assinaturaExpirada ? 'expired' : sub?.status

      // Se estiver expirada, suspensa ou cancelada, bloqueia na hora!
      if (statusEfetivo === 'expired' || statusEfetivo === 'suspended' || statusEfetivo === 'cancelled') {
        alert('Sua assinatura ou período de testes está expirado/suspenso. Regularize seu plano no painel para gerenciar os serviços.')
        return
      }

      // 3. Blindagem da relação do Plano
      const dadosDoPlano = Array.isArray(sub?.saas_plans) ? sub.saas_plans[0] : sub?.saas_plans
      const limitePlanoDefinido = dadosDoPlano?.max_services

      const maxServicos = statusEfetivo === 'trial' 
        ? 999 
        : (limitePlanoDefinido === 0 ? 999 : (limitePlanoDefinido || 5))

      // 4. Contagem por array de IDs
      const { data: servicosAtivos, error: countError } = await supabase
        .from('services')
        .select('id')
        .eq('company_id', companyId)
        .eq('active', true)

      if (countError) throw countError
      const totalAtivos = servicosAtivos?.length || 0

      // 5. Comparar contagem e aplicar o bloqueio rígido do Downgrade
      if (totalAtivos >= maxServicos) {
        alert(`Seu plano atual permite até ${limitePlanoDefinido || 5} serviços ativos, mas você possui ${totalAtivos}. Inative serviços antigos ou faça um upgrade para continuar!`)
        return
      }

      // Se passou em todas as travas, executa o INSERT normalmente
      const { error } = await supabase.from('services').insert({
        company_id: companyId,
        name: name.trim(),
        duration_minutes: Number(duration),
        price: Number(price),
        active: true,
      })

      if (error) {
        alert(error.message)
        return
      }

      setName('')
      setDuration('30')
      setPrice('0')

      loadData()
    } catch (err: any) {
      alert(`Falha na validação de limites: ${err.message || err}`)
    }
  }

  function startEditing(service: Service) {
    setEditingServiceId(service.id)
    setEditName(service.name)
    setEditDuration(String(service.duration_minutes))
    setEditPrice(String(service.price))
  }

  function cancelEditing() {
    setEditingServiceId('')
    setEditName('')
    setEditDuration('30')
    setEditPrice('0')
  }

  async function updateService(serviceId: string) {
    if (!editName.trim()) {
      alert('Digite o nome do serviço.')
      return
    }

    const { error } = await supabase
      .from('services')
      .update({
        name: editName.trim(),
        duration_minutes: Number(editDuration),
        price: Number(editPrice),
      })
      .eq('id', serviceId)

    if (error) {
      alert(error.message)
      return
    }

    cancelEditing()
    loadData()
  }

  async function toggleServiceActive(
    serviceId: string,
    active: boolean
  ) {
    const { error } = await supabase
      .from('services')
      .update({
        active: !active,
      })
      .eq('id', serviceId)

    if (error) {
      alert(error.message)
      return
    }

    loadData()
  }

  return (
    <div>
      <h1 className="text-4xl font-bold">Serviços</h1>

      <div className="mt-8 grid gap-4 rounded-2xl bg-zinc-900 p-6">
        <input
          placeholder="Nome do serviço"
          className="rounded-lg bg-zinc-800 p-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Duração em minutos"
          type="number"
          className="rounded-lg bg-zinc-800 p-3"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />

        <input
          placeholder="Preço"
          type="number"
          className="rounded-lg bg-zinc-800 p-3"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <button
          onClick={createService}
          className="rounded-lg bg-white p-3 font-bold text-black"
        >
          Cadastrar serviço
        </button>
      </div>

      <div className="mt-8">
        <input
          placeholder="Pesquisar serviço..."
          className="w-full rounded-xl bg-zinc-900 p-4"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-8 space-y-3">
        {filteredServices.map((service) => {
          const isEditing = editingServiceId === service.id

          return (
            <div key={service.id} className="rounded-xl bg-zinc-900 p-4">
              {isEditing ? (
                <div className="grid gap-3">
                  <input
                    className="rounded-lg bg-zinc-800 p-3"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />

                  <input
                    type="number"
                    className="rounded-lg bg-zinc-800 p-3"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                  />

                  <input
                    type="number"
                    className="rounded-lg bg-zinc-800 p-3"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => updateService(service.id)}
                      className="rounded-lg bg-green-600 px-4 py-2 font-bold"
                    >
                      Salvar
                    </button>

                    <button
                      onClick={cancelEditing}
                      className="rounded-lg bg-zinc-700 px-4 py-2 font-bold"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="font-bold">{service.name}</p>

                  <p className="text-zinc-400">
                    {service.duration_minutes} minutos
                  </p>

                  <p className="text-zinc-500">
                    R$ {Number(service.price).toFixed(2)}
                  </p>

                  <p className="mt-2 text-sm text-zinc-500">
                    Status:{' '}
                    <span
                      className={
                        service.active
                          ? 'text-green-400'
                          : 'text-yellow-400'
                      }
                    >
                      {service.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => startEditing(service)}
                      className="rounded-lg bg-white px-4 py-2 font-bold text-black"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() =>
                        toggleServiceActive(
                          service.id,
                          service.active
                        )
                      }
                      className="rounded-lg bg-yellow-600 px-4 py-2 font-bold text-black"
                    >
                      {service.active ? 'Inativar' : 'Ativar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}