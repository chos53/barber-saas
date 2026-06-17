'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Client = { id: string; name: string }
type Service = { id: string; name: string; price: number }
type Professional = { id: string; name: string }

type Product = {
  id: string
  name: string
  sale_price: number | null
  current_stock: number | null
  active: boolean
}

type ComandaItem = {
  id: string
  comanda_id: string
  description: string
  quantity: number
  price: number
  product_id?: string | null
  professional_id?: string | null
  professional_name?: string | null
}

type Comanda = {
  id: string
  client_id: string | null
  status: string
  is_priority?: boolean
  total: number
  discount?: number | null
  discount_type?: 'amount' | 'percentage' | null
  discount_value?: number | null
  surcharge?: number | null
  surcharge_type?: 'amount' | 'percentage' | null
  surcharge_value?: number | null
  notes?: string | null
  created_at: string
  closed_at?: string | null
  cancelled_at?: string | null
  client_name: string
  items: ComandaItem[]
}

const paymentMethods = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'credit_card', label: 'Crédito' },
  { value: 'debit_card', label: 'Débito' },
]

const statusFilters = [
  { value: 'all', label: 'Todas' },
  { value: 'open', label: 'Abertas' },
  { value: 'closed', label: 'Fechadas' },
  { value: 'cancelled', label: 'Canceladas' },
]

export default function ComandasPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [comandas, setComandas] = useState<Comanda[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [notes, setNotes] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityOnly, setPriorityOnly] = useState(false)
  const [selectedServices, setSelectedServices] = useState<Record<string, string>>({})
  const [selectedProfessionals, setSelectedProfessionals] = useState<Record<string, string>>({})
  const [selectedProductIds, setSelectedProductIds] = useState<Record<string, string>>({})
  const [registeredProductQuantities, setRegisteredProductQuantities] = useState<Record<string, string>>({})
  const [discountsByComanda, setDiscountsByComanda] = useState<Record<string, string>>({})
  const [discountTypesByComanda, setDiscountTypesByComanda] = useState<Record<string, 'amount' | 'percentage'>>({})
  const [surchargesByComanda, setSurchargesByComanda] = useState<Record<string, string>>({})
  const [surchargeTypesByComanda, setSurchargeTypesByComanda] = useState<Record<string, 'amount' | 'percentage'>>({})
  const [paymentByComanda, setPaymentByComanda] = useState<Record<string, string>>({})
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({})
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})
  const [savingDiscount, setSavingDiscount] = useState<Record<string, boolean>>({})
  const [savingSurcharge, setSavingSurcharge] = useState<Record<string, boolean>>({})
  const [savingPriority, setSavingPriority] = useState<Record<string, boolean>>({})
  const [, forceClock] = useState(0)

useEffect(() => {
  const interval = setInterval(() => {
    forceClock(Date.now())
  }, 60000)

  return () => clearInterval(interval)
}, [])

  useEffect(() => {
    loadData()
  }, [])

  function getSortGroup(comanda: Comanda) {
    if (comanda.status === 'open' && comanda.is_priority) return 1
    if (comanda.status === 'open') return 2
    if (comanda.status === 'closed' && comanda.is_priority) return 3
    if (comanda.status === 'closed') return 4
    if (comanda.status === 'cancelled') return 5
    return 6
  }

  function getSortDate(comanda: Comanda) {
    return new Date(
      comanda.closed_at || comanda.cancelled_at || comanda.created_at
    ).getTime()
  }

  function sortComandas(a: Comanda, b: Comanda) {
    const groupA = getSortGroup(a)
    const groupB = getSortGroup(b)

    if (groupA !== groupB) {
      return groupA - groupB
    }

    return getSortDate(b) - getSortDate(a)
  }

  const filteredComandas = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return comandas
      .filter((comanda) => {
        const matchesSearch =
          !normalizedSearch ||
          comanda.client_name.toLowerCase().includes(normalizedSearch)

        const matchesStatus =
          statusFilter === 'all' || comanda.status === statusFilter

        const matchesPriority =
          !priorityOnly || Boolean(comanda.is_priority)

        return matchesSearch && matchesStatus && matchesPriority
      })
      .sort(sortComandas)
  }, [comandas, search, statusFilter, priorityOnly])

  const openComandas = useMemo(() => {
    return filteredComandas
      .filter((comanda) => comanda.status === 'open')
      .sort((a, b) => {
        if (a.is_priority !== b.is_priority) {
          return a.is_priority ? -1 : 1
        }

        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        )
      })
  }, [filteredComandas])

  const historyComandas = useMemo(() => {
    return filteredComandas
      .filter((comanda) => comanda.status !== 'open')
      .sort((a, b) => {
        if (a.is_priority !== b.is_priority) {
          return a.is_priority ? -1 : 1
        }

        const dateA = new Date(
          a.closed_at || a.cancelled_at || a.created_at
        ).getTime()

        const dateB = new Date(
          b.closed_at || b.cancelled_at || b.created_at
        ).getTime()

        return dateB - dateA
      })
  }, [filteredComandas])

  const openCount = useMemo(() => {
    return comandas.filter((comanda) => comanda.status === 'open').length
  }, [comandas])

  const openTotal = useMemo(() => {
    return comandas
      .filter((comanda) => comanda.status === 'open')
      .reduce((sum, comanda) => sum + getComandaFinalTotal(comanda), 0)
  }, [comandas])

  const closedTotal = useMemo(() => {
    return comandas
      .filter((comanda) => comanda.status === 'closed')
      .reduce((sum, comanda) => sum + getComandaFinalTotal(comanda), 0)
  }, [comandas])

  const cancelledTotal = useMemo(() => {
    return comandas
      .filter((comanda) => comanda.status === 'cancelled')
      .reduce((sum, comanda) => sum + getComandaFinalTotal(comanda), 0)
  }, [comandas])

  const totalItems = useMemo(() => {
    return comandas.reduce((sum, comanda) => {
      const itemsCount = comanda.items.reduce(
        (itemsSum, item) => itemsSum + Number(item.quantity),
        0
      )

      return sum + itemsCount
    }, 0)
  }, [comandas])

  const notesCount = useMemo(() => {
    return comandas.filter((comanda) => Boolean(comanda.notes?.trim())).length
  }, [comandas])

  const priorityCount = useMemo(() => {
    return comandas.filter((comanda) => comanda.is_priority).length
  }, [comandas])

  function getComandaDiscountType(comanda: Comanda) {
    return comanda.discount_type === 'percentage' ? 'percentage' : 'amount'
  }

  function getComandaDiscountValue(comanda: Comanda) {
    return Number(comanda.discount_value ?? comanda.discount ?? 0)
  }

  function calculateDiscountAmount(
    subtotal: number,
    discountType: 'amount' | 'percentage',
    discountValue: number
  ) {
    if (discountValue <= 0 || subtotal <= 0) return 0

    if (discountType === 'percentage') {
      const percentage = Math.min(discountValue, 100)
      return Math.min(Number(((subtotal * percentage) / 100).toFixed(2)), subtotal)
    }

    return Math.min(Number(discountValue.toFixed(2)), subtotal)
  }

  function getComandaSubtotal(comanda: Comanda) {
    const itemsTotal = comanda.items.reduce((sum, item) => {
      return sum + Number(item.price || 0) * Number(item.quantity || 0)
    }, 0)

    if (itemsTotal > 0) {
      return Number(itemsTotal.toFixed(2))
    }

    return Number(comanda.total || 0)
  }

  function getComandaDiscount(comanda: Comanda) {
    return calculateDiscountAmount(
      getComandaSubtotal(comanda),
      getComandaDiscountType(comanda),
      getComandaDiscountValue(comanda)
    )
  }

  function getComandaSurchargeType(comanda: Comanda) {
    return comanda.surcharge_type === 'percentage' ? 'percentage' : 'amount'
  }

  function getComandaSurchargeValue(comanda: Comanda) {
    return Number(comanda.surcharge_value ?? comanda.surcharge ?? 0)
  }

  function calculateSurchargeAmount(
    subtotal: number,
    surchargeType: 'amount' | 'percentage',
    surchargeValue: number
  ) {
    if (surchargeValue <= 0 || subtotal <= 0) return 0

    if (surchargeType === 'percentage') {
      return Number(((subtotal * surchargeValue) / 100).toFixed(2))
    }

    return Number(surchargeValue.toFixed(2))
  }

  function getComandaSurcharge(comanda: Comanda) {
    return calculateSurchargeAmount(
      getComandaSubtotal(comanda),
      getComandaSurchargeType(comanda),
      getComandaSurchargeValue(comanda)
    )
  }

  function getComandaFinalTotal(comanda: Comanda) {
    return Math.max(
      getComandaSubtotal(comanda) - getComandaDiscount(comanda) + getComandaSurcharge(comanda),
      0
    )
  }

  async function recalculateComandaTotal(comandaId: string) {
    const { data: itemsData, error: itemsError } = await supabase
      .from('comanda_items')
      .select('quantity, price')
      .eq('comanda_id', comandaId)

    if (itemsError) {
      return itemsError
    }

    const recalculatedTotal = (itemsData || []).reduce((sum, item: any) => {
      return sum + Number(item.price || 0) * Number(item.quantity || 0)
    }, 0)

    const { error: totalError } = await supabase
      .from('comandas')
      .update({ total: Number(recalculatedTotal.toFixed(2)) })
      .eq('id', comandaId)

    return totalError
  }

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) return

    setCompanyId(profile.company_id)

    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, name')
      .eq('company_id', profile.company_id)
      .order('name', { ascending: true })

    const { data: servicesData } = await supabase
      .from('services')
      .select('id, name, price')
      .eq('company_id', profile.company_id)
      .order('name', { ascending: true })

    const { data: professionalsData } = await supabase
      .from('professionals')
      .select('id, name')
      .eq('company_id', profile.company_id)
      .eq('active', true)
      .order('name', { ascending: true })

    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, name, sale_price, current_stock, active')
      .eq('company_id', profile.company_id)
      .eq('active', true)
      .order('name', { ascending: true })

    if (productsError) {
      alert(`Erro ao carregar produtos cadastrados: ${productsError.message}`)
      return
    }

    const { data: comandasData } = await supabase
      .from('comandas')
      .select(
        'id, client_id, status, total, discount, discount_type, discount_value, surcharge, surcharge_type, surcharge_value, notes, is_priority, created_at, closed_at, cancelled_at'
      )
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    const comandaIds = (comandasData || []).map((comanda) => comanda.id)

    const { data: itemsData } =
      comandaIds.length > 0
        ? await supabase
            .from('comanda_items')
            .select('id, comanda_id, description, quantity, price, professional_id, product_id')
            .in('comanda_id', comandaIds)
            .order('created_at', { ascending: true })
        : { data: [] }

    const clientsMap = new Map(
      (clientsData || []).map((client) => [client.id, client.name])
    )

    const professionalsMap = new Map<string, string>(
      (professionalsData || []).map((professional: any) => [
        professional.id,
        professional.name,
      ])
    )

    const itemsByComanda = new Map<string, ComandaItem[]>()

    ;(itemsData || []).forEach((item: any) => {
      const currentItems = itemsByComanda.get(item.comanda_id) || []

      currentItems.push({
        id: item.id,
        comanda_id: item.comanda_id,
        description: item.description,
        quantity: Number(item.quantity),
        price: Number(item.price),
        product_id: item.product_id || null,
        professional_id: item.professional_id || null,
        professional_name: item.professional_id
          ? professionalsMap.get(String(item.professional_id)) || 'Profissional não informado'
          : 'Profissional não informado',
      })

      itemsByComanda.set(item.comanda_id, currentItems)
    })

    const normalizedComandas =
      comandasData?.map((comanda) => ({
        ...comanda,
        total: Number(comanda.total),
        discount: Number((comanda as any).discount || 0),
        discount_type:
          (comanda as any).discount_type === 'percentage'
            ? 'percentage'
            : 'amount',
        discount_value: Number(
          (comanda as any).discount_value ?? (comanda as any).discount ?? 0
        ),
        surcharge: Number((comanda as any).surcharge || 0),
        surcharge_type:
          (comanda as any).surcharge_type === 'percentage'
            ? 'percentage'
            : 'amount',
        surcharge_value: Number(
          (comanda as any).surcharge_value ?? (comanda as any).surcharge ?? 0
        ),
        is_priority: Boolean(comanda.is_priority),
        client_name: comanda.client_id
          ? clientsMap.get(comanda.client_id) || 'Cliente não informado'
          : 'Cliente não informado',
        items: itemsByComanda.get(comanda.id) || [],
      })) || []

    setClients(clientsData || [])

    setServices(
      (servicesData || []).map((service) => ({
        ...service,
        price: Number(service.price),
      }))
    )

    setProfessionals(professionalsData || [])
    setProducts(
      (productsData || []).map((product) => ({
        ...product,
        sale_price: Number(product.sale_price || 0),
        current_stock: Number(product.current_stock || 0),
      }))
    )

    setComandas(normalizedComandas as unknown as Comanda[])

    const initialEditingNotes: Record<string, string> = {}
    const initialDiscounts: Record<string, string> = {}
    const initialDiscountTypes: Record<string, 'amount' | 'percentage'> = {}
    const initialSurcharges: Record<string, string> = {}
    const initialSurchargeTypes: Record<string, 'amount' | 'percentage'> = {}

    ;(normalizedComandas as unknown as Comanda[]).forEach((comanda) => {
      initialEditingNotes[comanda.id] = comanda.notes || ''
      initialDiscounts[comanda.id] = String(getComandaDiscountValue(comanda))
      initialDiscountTypes[comanda.id] = getComandaDiscountType(comanda)
      initialSurcharges[comanda.id] = String(getComandaSurchargeValue(comanda))
      initialSurchargeTypes[comanda.id] = getComandaSurchargeType(comanda)
    })

    setEditingNotes(initialEditingNotes)
    setDiscountsByComanda(initialDiscounts)
    setDiscountTypesByComanda(initialDiscountTypes)
    setSurchargesByComanda(initialSurcharges)
    setSurchargeTypesByComanda(initialSurchargeTypes)
  }

  async function saveNotes(comandaId: string) {
    const notesValue = editingNotes[comandaId] || ''

    setSavingNotes((current) => ({
      ...current,
      [comandaId]: true,
    }))

    const { error } = await supabase
      .from('comandas')
      .update({
        notes: notesValue || null,
      })
      .eq('id', comandaId)

    setSavingNotes((current) => ({
      ...current,
      [comandaId]: false,
    }))

    if (error) {
      alert(`Erro ao salvar observações: ${error.message}`)
      return
    }

    await loadData()
  }

  async function saveDiscount(comanda: Comanda) {
    if (comanda.status !== 'open') {
      alert('Somente comandas abertas podem receber desconto.')
      return
    }

    const discountType = discountTypesByComanda[comanda.id] || 'amount'
    const discountValue = Number(discountsByComanda[comanda.id] || 0)
    const subtotal = getComandaSubtotal(comanda)

    if (discountValue < 0) {
      alert('O desconto não pode ser negativo.')
      return
    }

    if (discountType === 'amount' && discountValue > subtotal) {
      alert('O desconto em R$ não pode ser maior que o subtotal da comanda.')
      return
    }

    if (discountType === 'percentage' && discountValue > 100) {
      alert('O desconto em % não pode ser maior que 100%.')
      return
    }

    const discountAmount = calculateDiscountAmount(
      subtotal,
      discountType,
      discountValue
    )

    setSavingDiscount((current) => ({
      ...current,
      [comanda.id]: true,
    }))

    const { error } = await supabase
      .from('comandas')
      .update({
        discount: discountAmount,
        discount_type: discountType,
        discount_value: discountValue,
      })
      .eq('id', comanda.id)

    setSavingDiscount((current) => ({
      ...current,
      [comanda.id]: false,
    }))

    if (error) {
      alert(`Erro ao salvar desconto: ${error.message}`)
      return
    }

    await loadData()
  }


  async function saveSurcharge(comanda: Comanda) {
    if (comanda.status !== 'open') {
      alert('Somente comandas abertas podem receber acréscimo.')
      return
    }

    const surchargeType = surchargeTypesByComanda[comanda.id] || 'amount'
    const surchargeValue = Number(surchargesByComanda[comanda.id] || 0)
    const subtotal = getComandaSubtotal(comanda)

    if (surchargeValue < 0) {
      alert('O acréscimo não pode ser negativo.')
      return
    }

    const surchargeAmount = calculateSurchargeAmount(
      subtotal,
      surchargeType,
      surchargeValue
    )

    setSavingSurcharge((current) => ({
      ...current,
      [comanda.id]: true,
    }))

    const { error } = await supabase
      .from('comandas')
      .update({
        surcharge: surchargeAmount,
        surcharge_type: surchargeType,
        surcharge_value: surchargeValue,
      })
      .eq('id', comanda.id)

    setSavingSurcharge((current) => ({
      ...current,
      [comanda.id]: false,
    }))

    if (error) {
      alert(`Erro ao salvar acréscimo: ${error.message}`)
      return
    }

    await loadData()
  }

  async function togglePriority(comanda: Comanda) {
    setSavingPriority((current) => ({
      ...current,
      [comanda.id]: true,
    }))

    const { error } = await supabase
      .from('comandas')
      .update({
        is_priority: !comanda.is_priority,
      })
      .eq('id', comanda.id)

    setSavingPriority((current) => ({
      ...current,
      [comanda.id]: false,
    }))

    if (error) {
      alert(`Erro ao atualizar prioridade: ${error.message}`)
      return
    }

    await loadData()
  }

  async function createComanda(event: React.FormEvent) {
    event.preventDefault()

    if (!companyId) {
      alert('Empresa não encontrada.')
      return
    }

    setLoading(true)

    const { error } = await supabase.from('comandas').insert({
      company_id: companyId,
      client_id: selectedClientId || null,
      status: 'open',
      total: 0,
      discount: 0,
      discount_type: 'amount',
      discount_value: 0,
      surcharge: 0,
      surcharge_type: 'amount',
      surcharge_value: 0,
      notes: notes || null,
      is_priority: false,
    })

    setLoading(false)

    if (error) {
      alert(`Erro ao criar comanda: ${error.message}`)
      return
    }

    setSelectedClientId('')
    setNotes('')

    await loadData()
  }

  async function addServiceToComanda(comanda: Comanda) {
    const serviceId = selectedServices[comanda.id]
    const professionalId = selectedProfessionals[comanda.id]

    if (!serviceId) {
      alert('Selecione um serviço.')
      return
    }

    if (!professionalId) {
      alert('Selecione o profissional que executou o serviço.')
      return
    }

    const service = services.find(
      (item) => item.id === serviceId
    )

    if (!service) {
      alert('Serviço não encontrado.')
      return
    }

    const { error: itemError } = await supabase
      .from('comanda_items')
      .insert({
        comanda_id: comanda.id,
        service_id: service.id,
        professional_id: professionalId,
        description: service.name,
        quantity: 1,
        price: service.price,
      })

    if (itemError) {
      alert(
        `Erro ao adicionar serviço: ${itemError.message}`
      )
      return
    }

    const totalError = await recalculateComandaTotal(comanda.id)

    if (totalError) {
      alert(
        `Erro ao atualizar total: ${totalError.message}`
      )
      return
    }

    setSelectedServices((current) => ({
      ...current,
      [comanda.id]: '',
    }))

    setSelectedProfessionals((current) => ({
      ...current,
      [comanda.id]: '',
    }))

    await loadData()
  }


  async function addProductToComanda(comanda: Comanda) {
    const productId = selectedProductIds[comanda.id]
    const quantity = Number(registeredProductQuantities[comanda.id] || 1)

    if (!productId) {
      alert('Selecione um produto cadastrado.')
      return
    }

    if (!quantity || quantity <= 0) {
      alert('Informe uma quantidade válida.')
      return
    }

    const product = products.find((item) => item.id === productId)

    if (!product) {
      alert('Produto não encontrado.')
      return
    }

    const currentStock = Number(product.current_stock || 0)

    if (quantity > currentStock) {
      alert(`Estoque insuficiente para ${product.name}. Disponível: ${currentStock}.`)
      return
    }

    const salePrice = Number(product.sale_price || 0)

    if (salePrice <= 0) {
      alert('Este produto está sem valor de venda cadastrado.')
      return
    }

    const { error: itemError } = await supabase
      .from('comanda_items')
      .insert({
        comanda_id: comanda.id,
        service_id: null,
        product_id: product.id,
        professional_id: null,
        description: product.name,
        quantity,
        price: salePrice,
      })

    if (itemError) {
      alert(`Erro ao adicionar produto: ${itemError.message}`)
      return
    }

    const totalError = await recalculateComandaTotal(comanda.id)

    if (totalError) {
      alert(`Erro ao atualizar total: ${totalError.message}`)
      return
    }

    setSelectedProductIds((current) => ({
      ...current,
      [comanda.id]: '',
    }))

    setRegisteredProductQuantities((current) => ({
      ...current,
      [comanda.id]: '',
    }))

    await loadData()
  }

  async function removeItemFromComanda(
    comanda: Comanda,
    item: ComandaItem
  ) {
    if (comanda.status !== 'open') {
      alert(
        'Somente comandas abertas podem ter itens removidos.'
      )
      return
    }

    const { error: itemError } = await supabase
      .from('comanda_items')
      .delete()
      .eq('id', item.id)

    if (itemError) {
      alert(`Erro ao remover item: ${itemError.message}`)
      return
    }

    const totalError = await recalculateComandaTotal(comanda.id)

    if (totalError) {
      alert(
        `Erro ao atualizar total: ${totalError.message}`
      )
      return
    }

    await loadData()
  }

  async function closeComanda(comanda: Comanda) {
    const paymentMethod = paymentByComanda[comanda.id]

    if (!paymentMethod) {
      alert('Selecione a forma de pagamento.')
      return
    }

    if (comanda.items.length === 0) {
      alert('Adicione ao menos um item antes de fechar a comanda.')
      return
    }

    const productItems = comanda.items.filter((item) => item.product_id)
    const quantityByProduct = new Map<string, number>()

    productItems.forEach((item) => {
      if (!item.product_id) return

      quantityByProduct.set(
        item.product_id,
        (quantityByProduct.get(item.product_id) || 0) + Number(item.quantity || 0)
      )
    })

    const productIds = Array.from(quantityByProduct.keys())

    if (productIds.length > 0) {
      const { data: stockProducts, error: stockProductsError } = await supabase
        .from('products')
        .select('id, name, current_stock')
        .eq('company_id', companyId)
        .in('id', productIds)

      if (stockProductsError) {
        alert(`Erro ao validar estoque: ${stockProductsError.message}`)
        return
      }

      const stockProductMap = new Map(
        (stockProducts || []).map((product: any) => [product.id, product])
      )

      for (const productId of productIds) {
        const product: any = stockProductMap.get(productId)
        const requestedQuantity = quantityByProduct.get(productId) || 0
        const currentStock = Number(product?.current_stock || 0)

        if (!product) {
          alert('Um dos produtos da comanda não foi encontrado no cadastro.')
          return
        }

        if (requestedQuantity > currentStock) {
          alert(
            `Estoque insuficiente para ${product.name}. Disponível: ${currentStock}. Tentativa de venda: ${requestedQuantity}.`
          )
          return
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      for (const productId of productIds) {
        const product: any = stockProductMap.get(productId)
        const quantity = quantityByProduct.get(productId) || 0
        const previousStock = Number(product?.current_stock || 0)
        const newStock = previousStock - quantity

        const { error: productUpdateError } = await supabase
          .from('products')
          .update({
            current_stock: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId)
          .eq('company_id', companyId)

        if (productUpdateError) {
          alert(`Erro ao baixar estoque: ${productUpdateError.message}`)
          return
        }

        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert({
            company_id: companyId,
            product_id: productId,
            type: 'out',
            quantity,
            previous_stock: previousStock,
            new_stock: newStock,
            reason: `Venda na comanda ${comanda.id.slice(0, 8)} - ${comanda.client_name}`,
            created_by: user?.id || null,
          })

        if (movementError) {
          alert(`Erro ao registrar movimentação de estoque: ${movementError.message}`)
          return
        }
      }
    }

    const { error: transactionError } =
      await supabase
        .from('financial_transactions')
        .insert({
          company_id: companyId,
          client_id: comanda.client_id,
          appointment_id: null,
          professional_id: null,
          type: 'income',
          category: 'comanda',
          description: `Comanda - ${comanda.client_name}`,
          amount: getComandaFinalTotal(comanda),
          payment_method: paymentMethod,
          status: 'paid',
          transaction_date:
            new Date().toISOString().split('T')[0],
        })

    if (transactionError) {
      alert(
        `Erro ao gerar entrada no financeiro: ${transactionError.message}`
      )
      return
    }

    const { error: comandaError } = await supabase
      .from('comandas')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', comanda.id)

    if (comandaError) {
      alert(
        `Erro ao fechar comanda: ${comandaError.message}`
      )
      return
    }

    setPaymentByComanda((current) => ({
      ...current,
      [comanda.id]: '',
    }))

    await loadData()
  }

  async function cancelComanda(comanda: Comanda) {
    const { error } = await supabase
      .from('comandas')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', comanda.id)

    if (error) {
      alert(`Erro ao cancelar comanda: ${error.message}`)
      return
    }

    await loadData()
  }
  function getOpenTime(comanda: Comanda) {
    if (comanda.status !== 'open') return null
  
    const created = new Date(comanda.created_at).getTime()
    const now = Date.now()
  
    const diffMinutes = Math.floor(
      (now - created) / 1000 / 60
    )
  
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
  
    if (hours <= 0) {
      return `${minutes} min aberta`
    }
  
    return `${hours}h ${minutes.toString().padStart(2, '0')}m aberta`
  }
  
  function getOpenTimeStyle(comanda: Comanda) {
    if (comanda.status !== 'open') {
      return 'bg-zinc-800 text-zinc-300'
    }
  
    const created = new Date(comanda.created_at).getTime()
    const now = Date.now()
  
    const diffMinutes = Math.floor(
      (now - created) / 1000 / 60
    )
  
    if (diffMinutes >= 60) {
      return 'bg-red-600 text-white'
    }
  
    if (diffMinutes >= 30) {
      return 'bg-yellow-500 text-black'
    }
  
    return 'bg-green-600 text-white'
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'open':
        return 'Aberta'
      case 'closed':
        return 'Fechada'
      case 'cancelled':
        return 'Cancelada'
      default:
        return status
    }
  }


  function escapePrintText(value: string | number | null | undefined) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  function printComanda(comanda: Comanda) {
    const subtotal = getComandaSubtotal(comanda)
    const discount = getComandaDiscount(comanda)
    const surcharge = getComandaSurcharge(comanda)
    const finalTotal = getComandaFinalTotal(comanda)
    const issuedAt = new Date().toLocaleString('pt-BR')
    const createdAt = new Date(comanda.created_at).toLocaleString('pt-BR')
    const closedAt = comanda.closed_at
      ? new Date(comanda.closed_at).toLocaleString('pt-BR')
      : ''
    const cancelledAt = comanda.cancelled_at
      ? new Date(comanda.cancelled_at).toLocaleString('pt-BR')
      : ''

    const itemsHtml = comanda.items
      .map((item) => {
        const itemTotal = Number(item.price || 0) * Number(item.quantity || 0)

        return `
          <tr>
            <td>
              <strong>${escapePrintText(item.description)}</strong>
              <br />
              <span>${escapePrintText(item.professional_name || 'Produto / sem profissional')}</span>
            </td>
            <td class="center">${escapePrintText(item.quantity)}</td>
            <td class="right">R$ ${Number(item.price || 0).toFixed(2)}</td>
            <td class="right">R$ ${itemTotal.toFixed(2)}</td>
          </tr>
        `
      })
      .join('')

    const html = `
      <html>
        <head>
          <title>Comanda - ${escapePrintText(comanda.client_name)}</title>
          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 24px;
              font-family: Arial, sans-serif;
              color: #111827;
              background: #ffffff;
            }

            .receipt {
              max-width: 760px;
              margin: 0 auto;
              border: 1px solid #d1d5db;
              border-radius: 16px;
              padding: 24px;
            }

            .header {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              border-bottom: 2px solid #111827;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }

            h1 {
              margin: 0;
              font-size: 28px;
            }

            .muted {
              color: #6b7280;
              font-size: 13px;
            }

            .status {
              display: inline-block;
              border: 1px solid #111827;
              border-radius: 999px;
              padding: 6px 12px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }

            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
              margin-bottom: 20px;
            }

            .info-card {
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 12px;
            }

            .label {
              margin-bottom: 4px;
              color: #6b7280;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: .08em;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }

            th,
            td {
              border-bottom: 1px solid #e5e7eb;
              padding: 10px 8px;
              vertical-align: top;
              font-size: 14px;
            }

            th {
              color: #374151;
              text-align: left;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: .08em;
            }

            .center {
              text-align: center;
            }

            .right {
              text-align: right;
            }

            .totals {
              margin-top: 20px;
              margin-left: auto;
              width: 320px;
              max-width: 100%;
            }

            .total-row {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }

            .final-total {
              margin-top: 8px;
              padding: 14px;
              border-radius: 12px;
              background: #111827;
              color: #ffffff;
              font-size: 22px;
              font-weight: bold;
              display: flex;
              justify-content: space-between;
              gap: 16px;
            }

            .notes {
              margin-top: 20px;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 12px;
              white-space: pre-wrap;
            }

            .footer {
              margin-top: 24px;
              color: #6b7280;
              font-size: 12px;
              text-align: center;
            }

            @media print {
              body {
                padding: 0;
              }

              .receipt {
                border: none;
                border-radius: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div>
                <h1>Comanda</h1>
                <p class="muted">Emitida em ${escapePrintText(issuedAt)}</p>
              </div>

              <div class="right">
                <span class="status">${escapePrintText(getStatusLabel(comanda.status))}</span>
                <p class="muted">ID: ${escapePrintText(comanda.id.slice(0, 8))}</p>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-card">
                <div class="label">Cliente</div>
                <strong>${escapePrintText(comanda.client_name)}</strong>
              </div>

              <div class="info-card">
                <div class="label">Criada em</div>
                <strong>${escapePrintText(createdAt)}</strong>
              </div>

              ${closedAt ? `
                <div class="info-card">
                  <div class="label">Fechada em</div>
                  <strong>${escapePrintText(closedAt)}</strong>
                </div>
              ` : ''}

              ${cancelledAt ? `
                <div class="info-card">
                  <div class="label">Cancelada em</div>
                  <strong>${escapePrintText(cancelledAt)}</strong>
                </div>
              ` : ''}
            </div>

            <h2>Itens</h2>

            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th class="center">Qtd</th>
                  <th class="right">Unitário</th>
                  <th class="right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml || `
                  <tr>
                    <td colspan="4" class="center muted">Nenhum item adicionado.</td>
                  </tr>
                `}
              </tbody>
            </table>

            <div class="totals">
              <div class="total-row">
                <span>Subtotal</span>
                <strong>R$ ${subtotal.toFixed(2)}</strong>
              </div>

              <div class="total-row">
                <span>Desconto</span>
                <strong>R$ ${discount.toFixed(2)}</strong>
              </div>

              <div class="total-row">
                <span>Acréscimo</span>
                <strong>R$ ${surcharge.toFixed(2)}</strong>
              </div>

              <div class="final-total">
                <span>Total</span>
                <span>R$ ${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            ${comanda.notes?.trim() ? `
              <div class="notes">
                <div class="label">Observações</div>
                ${escapePrintText(comanda.notes)}
              </div>
            ` : ''}

            <div class="footer">
              Barber SaaS · Documento gerado pelo sistema
            </div>
          </div>

          <script>
            window.onload = function () {
              window.print()
            }
          </script>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')

    if (!printWindow) {
      alert('Não foi possível abrir a janela de impressão.')
      return
    }

    printWindow.document.write(html)
    printWindow.document.close()
  }

  function renderComandaCard(comanda: Comanda) {
    const itemsCount = comanda.items.reduce(
      (sum, item) => sum + Number(item.quantity),
      0
    )

    return (
      <div
        key={comanda.id}
        className={`rounded-2xl border p-5 ${
          comanda.is_priority
            ? 'border-orange-500 bg-orange-950/20'
            : comanda.status === 'cancelled'
              ? 'border-red-900 bg-red-950/30'
              : 'border-zinc-800 bg-zinc-800'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold">
                {comanda.client_name}
              </p>

              {comanda.is_priority && (
                <span className="rounded-full bg-orange-500 px-2 py-1 text-xs font-bold text-black">
                  PRIORIDADE
                </span>
              )}
            </div>

            <div className="mt-1 space-y-1 text-sm text-zinc-500">
              <p>
                Criada em{' '}
                {new Date(comanda.created_at).toLocaleString('pt-BR')}
              </p>

              {comanda.closed_at && (
                <p>
                  Fechada em{' '}
                  {new Date(comanda.closed_at).toLocaleString('pt-BR')}
                </p>
              )}

              {comanda.cancelled_at && (
                <p>
                  Cancelada em{' '}
                  {new Date(comanda.cancelled_at).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          </div>

          <div className="text-right">
            <strong className="block text-xl text-green-400">
              R$ {getComandaFinalTotal(comanda).toFixed(2)}
            </strong>

            {getComandaDiscount(comanda) > 0 && (
              <p className="mt-1 text-xs text-red-300">
                Desc. {getComandaDiscountType(comanda) === 'percentage' ? `${getComandaDiscountValue(comanda)}%` : `R$ ${getComandaDiscount(comanda).toFixed(2)}`}
              </p>
            )}

            {getComandaSurcharge(comanda) > 0 && (
              <p className="mt-1 text-xs text-blue-300">
                Acrésc. {getComandaSurchargeType(comanda) === 'percentage' ? `${getComandaSurchargeValue(comanda)}%` : `R$ ${getComandaSurcharge(comanda).toFixed(2)}`}
              </p>
            )}

            <p className="mt-1 text-sm text-zinc-400">
              {itemsCount} item(ns)
            </p>
            {comanda.status === 'open' && (
  <span
    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${getOpenTimeStyle(comanda)}`}
  >
    {getOpenTime(comanda)}
  </span>
)}
            <span
              className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-medium ${
                comanda.status === 'open'
                  ? 'bg-blue-900 text-blue-300'
                  : comanda.status === 'closed'
                    ? 'bg-green-900 text-green-300'
                    : 'bg-red-900 text-red-300'
              }`}
            >
              {getStatusLabel(comanda.status)}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-yellow-900 bg-yellow-950/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-yellow-400">
              Observações
            </p>

            {comanda.notes?.trim() && (
              <span className="rounded-full bg-yellow-400 px-2 py-1 text-xs font-bold text-black">
                Com observação
              </span>
            )}
          </div>

          <textarea
            value={editingNotes[comanda.id] || ''}
            onChange={(event) =>
              setEditingNotes((current) => ({
                ...current,
                [comanda.id]: event.target.value,
              }))
            }
            placeholder="Adicionar observações..."
            className="mt-2 h-24 w-full resize-none rounded-xl border border-yellow-900 bg-black/40 p-3 text-sm text-yellow-100 outline-none"
          />

          <button
            type="button"
            onClick={() => saveNotes(comanda.id)}
            disabled={savingNotes[comanda.id]}
            className="mt-3 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-black transition hover:bg-yellow-300 disabled:opacity-50"
          >
            {savingNotes[comanda.id] ? 'Salvando...' : 'Salvar observação'}
          </button>
        </div>

        <div className="mt-5 border-t border-zinc-700 pt-5">
          {comanda.status === 'open' && (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-4">
                <p className="mb-3 text-sm font-bold text-zinc-300">
                  Adicionar serviço
                </p>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <select
                    value={selectedServices[comanda.id] || ''}
                    onChange={(event) =>
                      setSelectedServices((current) => ({
                        ...current,
                        [comanda.id]: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                  >
                    <option value="">Selecionar serviço</option>

                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - R$ {service.price.toFixed(2)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedProfessionals[comanda.id] || ''}
                    onChange={(event) =>
                      setSelectedProfessionals((current) => ({
                        ...current,
                        [comanda.id]: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                  >
                    <option value="">Selecionar profissional</option>

                    {professionals.map((professional) => (
                      <option key={professional.id} value={professional.id}>
                        {professional.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => addServiceToComanda(comanda)}
                    className="rounded-xl bg-white px-5 py-3 font-bold text-black transition hover:bg-zinc-200"
                  >
                    Adicionar serviço
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-900 bg-emerald-950/20 p-4">
                <p className="mb-3 text-sm font-bold text-emerald-300">
                  Adicionar produto cadastrado
                </p>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px_auto]">
                  <select
                    value={selectedProductIds[comanda.id] || ''}
                    onChange={(event) =>
                      setSelectedProductIds((current) => ({
                        ...current,
                        [comanda.id]: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                  >
                    <option value="">Selecionar produto</option>

                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - R$ {Number(product.sale_price || 0).toFixed(2)} · estoque {Number(product.current_stock || 0)}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={registeredProductQuantities[comanda.id] || ''}
                    onChange={(event) =>
                      setRegisteredProductQuantities((current) => ({
                        ...current,
                        [comanda.id]: event.target.value,
                      }))
                    }
                    placeholder="Qtd"
                    className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => addProductToComanda(comanda)}
                    className="rounded-xl bg-emerald-500 px-5 py-3 font-bold text-black transition hover:bg-emerald-400"
                  >
                    Adicionar produto
                  </button>
                </div>

                <p className="mt-3 text-xs text-emerald-200">
                  O estoque será baixado automaticamente quando a comanda for fechada.
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {comanda.items.length === 0 && (
              <p className="rounded-xl bg-zinc-900 p-3 text-sm text-zinc-500">
                Nenhum item adicionado.
              </p>
            )}

            {comanda.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-xl bg-zinc-900 p-3"
              >
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-sm text-zinc-500">
                    Quantidade: {item.quantity} · Unitário: R${' '}
                    {Number(item.price).toFixed(2)}
                  </p>

                  <p className="text-sm text-zinc-500">
                    {item.product_id
                      ? 'Produto cadastrado'
                      : `Profissional: ${item.professional_name || 'Produto / sem profissional'}`}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <strong className="text-green-400">
                    R$ {(item.price * item.quantity).toFixed(2)}
                  </strong>

                  {comanda.status === 'open' && (
                    <button
                      type="button"
                      onClick={() => removeItemFromComanda(comanda, item)}
                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-500"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
            <div className="grid gap-4 md:grid-cols-[1fr_180px_220px_auto]">
              <div>
                <p className="text-sm uppercase tracking-wide text-zinc-300">
                  Desconto
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Escolha R$ ou % antes de fechar a comanda.
                </p>
              </div>

              <select
                disabled={comanda.status !== 'open'}
                value={discountTypesByComanda[comanda.id] || 'amount'}
                onChange={(event) =>
                  setDiscountTypesByComanda((current) => ({
                    ...current,
                    [comanda.id]: event.target.value as 'amount' | 'percentage',
                  }))
                }
                className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none disabled:opacity-50"
              >
                <option value="amount">Valor (R$)</option>
                <option value="percentage">Percentual (%)</option>
              </select>

              <input
                type="number"
                min="0"
                max={(discountTypesByComanda[comanda.id] || 'amount') === 'percentage' ? '100' : undefined}
                step="0.01"
                disabled={comanda.status !== 'open'}
                value={discountsByComanda[comanda.id] || ''}
                onChange={(event) =>
                  setDiscountsByComanda((current) => ({
                    ...current,
                    [comanda.id]: event.target.value,
                  }))
                }
                placeholder={(discountTypesByComanda[comanda.id] || 'amount') === 'percentage' ? 'Ex: 10' : 'Ex: 10.00'}
                className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none disabled:opacity-50"
              />

              {comanda.status === 'open' && (
                <button
                  type="button"
                  onClick={() => saveDiscount(comanda)}
                  disabled={savingDiscount[comanda.id]}
                  className="rounded-xl bg-red-500 px-5 py-3 font-bold text-white transition hover:bg-red-400 disabled:opacity-50"
                >
                  {savingDiscount[comanda.id] ? 'Salvando...' : 'Aplicar desconto'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-blue-900 bg-blue-950/20 p-5">
            <div className="grid gap-4 md:grid-cols-[1fr_180px_220px_auto]">
              <div>
                <p className="text-sm uppercase tracking-wide text-blue-300">
                  Acréscimo
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Use para taxa extra, atendimento VIP ou serviço adicional.
                </p>
              </div>

              <select
                disabled={comanda.status !== 'open'}
                value={surchargeTypesByComanda[comanda.id] || 'amount'}
                onChange={(event) =>
                  setSurchargeTypesByComanda((current) => ({
                    ...current,
                    [comanda.id]: event.target.value as 'amount' | 'percentage',
                  }))
                }
                className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none disabled:opacity-50"
              >
                <option value="amount">Valor (R$)</option>
                <option value="percentage">Percentual (%)</option>
              </select>

              <input
                type="number"
                min="0"
                step="0.01"
                disabled={comanda.status !== 'open'}
                value={surchargesByComanda[comanda.id] || ''}
                onChange={(event) =>
                  setSurchargesByComanda((current) => ({
                    ...current,
                    [comanda.id]: event.target.value,
                  }))
                }
                placeholder={(surchargeTypesByComanda[comanda.id] || 'amount') === 'percentage' ? 'Ex: 10' : 'Ex: 10.00'}
                className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none disabled:opacity-50"
              />

              {comanda.status === 'open' && (
                <button
                  type="button"
                  onClick={() => saveSurcharge(comanda)}
                  disabled={savingSurcharge[comanda.id]}
                  className="rounded-xl bg-blue-500 px-5 py-3 font-bold text-white transition hover:bg-blue-400 disabled:opacity-50"
                >
                  {savingSurcharge[comanda.id] ? 'Salvando...' : 'Aplicar acréscimo'}
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-green-900 bg-green-950/30 p-5">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-zinc-400">
                  Subtotal
                </p>

                <strong className="mt-1 block text-2xl font-bold text-white">
                  R$ {getComandaSubtotal(comanda).toFixed(2)}
                </strong>
              </div>

              <div>
                <p className="text-sm uppercase tracking-wide text-red-300">
                  Desconto
                </p>

                <strong className="mt-1 block text-2xl font-bold text-red-300">
                  R$ {getComandaDiscount(comanda).toFixed(2)}
                </strong>

                {getComandaDiscountType(comanda) === 'percentage' && (
                  <p className="mt-1 text-xs text-red-200">
                    {getComandaDiscountValue(comanda)}% aplicado
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm uppercase tracking-wide text-blue-300">
                  Acréscimo
                </p>

                <strong className="mt-1 block text-2xl font-bold text-blue-300">
                  R$ {getComandaSurcharge(comanda).toFixed(2)}
                </strong>

                {getComandaSurchargeType(comanda) === 'percentage' && (
                  <p className="mt-1 text-xs text-blue-200">
                    {getComandaSurchargeValue(comanda)}% aplicado
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm uppercase tracking-wide text-green-300">
                  Total final
                </p>

                <strong className="mt-1 block text-3xl font-bold text-green-400">
                  R$ {getComandaFinalTotal(comanda).toFixed(2)}
                </strong>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-zinc-700 pt-5 md:flex-row md:items-center md:justify-end">
            <button
              type="button"
              onClick={() => printComanda(comanda)}
              className="rounded-xl bg-white px-5 py-3 font-bold text-black transition hover:bg-zinc-200"
            >
              Imprimir comanda
            </button>
          </div>

          {comanda.status === 'open' && (
            <div className="mt-5 grid grid-cols-1 gap-3 border-t border-zinc-700 pt-5 md:grid-cols-[1fr_auto_auto_auto]">
              <select
                value={paymentByComanda[comanda.id] || ''}
                onChange={(event) =>
                  setPaymentByComanda((current) => ({
                    ...current,
                    [comanda.id]: event.target.value,
                  }))
                }
                className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
              >
                <option value="">Forma de pagamento</option>

                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => togglePriority(comanda)}
                disabled={savingPriority[comanda.id]}
                className={`rounded-xl px-5 py-3 font-bold transition ${
                  comanda.is_priority
                    ? 'bg-orange-500 text-black hover:bg-orange-400'
                    : 'bg-zinc-700 text-white hover:bg-zinc-600'
                }`}
              >
                {savingPriority[comanda.id]
                  ? 'Salvando...'
                  : comanda.is_priority
                    ? 'Remover prioridade'
                    : 'Marcar prioridade'}
              </button>

              <button
                type="button"
                onClick={() => closeComanda(comanda)}
                className="rounded-xl bg-green-500 px-5 py-3 font-bold text-black transition hover:bg-green-400"
              >
                Fechar comanda
              </button>

              <button
                type="button"
                onClick={() => cancelComanda(comanda)}
                className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-500"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-4xl font-bold">
        Comandas
      </h1>

      <p className="mt-2 text-zinc-400">
        Controle de comandas abertas,
        fechamento e histórico.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
        <div className="rounded-2xl border border-blue-900 bg-blue-950/30 p-5">
          <p className="text-sm text-blue-300">
            Comandas abertas
          </p>

          <strong className="mt-2 block text-3xl font-bold text-white">
            {openCount}
          </strong>
        </div>

        <div className="rounded-2xl border border-yellow-900 bg-yellow-950/30 p-5">
          <p className="text-sm text-yellow-300">
            Valor em aberto
          </p>

          <strong className="mt-2 block text-3xl font-bold text-white">
            R$ {openTotal.toFixed(2)}
          </strong>
        </div>

        <div className="rounded-2xl border border-green-900 bg-green-950/30 p-5">
          <p className="text-sm text-green-300">
            Total fechado
          </p>

          <strong className="mt-2 block text-3xl font-bold text-white">
            R$ {closedTotal.toFixed(2)}
          </strong>
        </div>

        <div className="rounded-2xl border border-red-900 bg-red-950/30 p-5">
          <p className="text-sm text-red-300">
            Total cancelado
          </p>

          <strong className="mt-2 block text-3xl font-bold text-white">
            R$ {cancelledTotal.toFixed(2)}
          </strong>
        </div>

        <div className="rounded-2xl border border-purple-900 bg-purple-950/30 p-5">
          <p className="text-sm text-purple-300">
            Itens nas comandas
          </p>

          <strong className="mt-2 block text-3xl font-bold text-white">
            {totalItems}
          </strong>
        </div>

        <div className="rounded-2xl border border-yellow-900 bg-yellow-950/30 p-5">
          <p className="text-sm text-yellow-300">
            Com observações
          </p>

          <strong className="mt-2 block text-3xl font-bold text-white">
            {notesCount}
          </strong>
        </div>

        <button
          type="button"
          onClick={() => setPriorityOnly((current) => !current)}
          className={`rounded-2xl border p-5 text-left transition ${
            priorityOnly
              ? 'border-orange-500 bg-orange-500 text-black'
              : 'border-orange-900 bg-orange-950/30 text-white hover:bg-orange-950/50'
          }`}
        >
          <p className={priorityOnly ? 'text-sm text-black' : 'text-sm text-orange-300'}>
            Prioritárias
          </p>

          <strong className="mt-2 block text-3xl font-bold">
            {priorityCount}
          </strong>

          <span className="mt-2 block text-xs font-bold">
            {priorityOnly ? 'Filtro ativo' : 'Clique para filtrar'}
          </span>
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <form
          onSubmit={createComanda}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
        >
          <h2 className="text-2xl font-bold">
            Nova comanda
          </h2>

          <div className="mt-6">
            <label className="text-sm text-zinc-400">
              Cliente
            </label>

            <select
              value={selectedClientId}
              onChange={(event) =>
                setSelectedClientId(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
            >
              <option value="">
                Cliente não informado
              </option>

              {clients.map((client) => (
                <option
                  key={client.id}
                  value={client.id}
                >
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label className="text-sm text-zinc-400">
              Observações
            </label>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="Ex: cliente prefere pagar no pix"
              className="mt-2 h-28 w-full resize-none rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-white p-3 font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading
              ? 'Criando...'
              : 'Abrir comanda'}
          </button>
        </form>

        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">
                Filtros
              </h2>

              {priorityOnly && (
                <button
                  type="button"
                  onClick={() => setPriorityOnly(false)}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-orange-400"
                >
                  Limpar prioritárias
                </button>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar por cliente..."
                className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
              >
                {statusFilters.map((filter) => (
                  <option
                    key={filter.value}
                    value={filter.value}
                  >
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>

            <p className="mt-3 text-sm text-zinc-500">
              Exibindo {filteredComandas.length} de {comandas.length} comanda(s).
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Comandas abertas
              </h2>

              <span className="rounded-full bg-blue-900 px-3 py-1 text-sm text-blue-300">
                {openComandas.length} aberta(s)
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {openComandas.length === 0 && (
                <p className="rounded-xl bg-zinc-800 p-4 text-zinc-500">
                  Nenhuma comanda aberta encontrada.
                </p>
              )}

              {openComandas.map((comanda) =>
                renderComandaCard(comanda)
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Histórico de comandas
              </h2>

              <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-400">
                {historyComandas.length} registro(s)
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {historyComandas.length === 0 && (
                <p className="rounded-xl bg-zinc-800 p-4 text-zinc-500">
                  Nenhuma comanda fechada ou cancelada encontrada.
                </p>
              )}

              {historyComandas.map((comanda) =>
                renderComandaCard(comanda)
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}