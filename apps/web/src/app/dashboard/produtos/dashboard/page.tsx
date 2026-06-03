'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Product = {
  id: string
  company_id: string
  name: string
  category: string | null
  code: string | null
  cost_price: number | null
  sale_price: number | null
  current_stock: number | null
  minimum_stock: number | null
  active: boolean
  created_at: string
}

type StockMovement = {
  id: string
  company_id: string
  product_id: string
  type: 'in' | 'out'
  quantity: number
  previous_stock: number
  new_stock: number
  reason: string | null
  created_by: string | null
  created_at: string
}

type ComandaItem = {
  id: string
  product_id: string | null
  description: string
  quantity: number
  price: number
  created_at?: string | null
}

type ProductRanking = {
  product_id: string
  name: string
  quantity: number
  total: number
}

type MovementRanking = {
  product_id: string
  name: string
  quantity: number
  movements: number
}

export default function ProdutosDashboardPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  const [comandaItems, setComandaItems] = useState<ComandaItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const activeProducts = useMemo(() => products.filter((product) => product.active).length, [products])
  const inactiveProducts = useMemo(() => products.filter((product) => !product.active).length, [products])

  const zeroStockProducts = useMemo(() => {
    return products.filter((product) => product.active && Number(product.current_stock || 0) <= 0).length
  }, [products])

  const lowStockProducts = useMemo(() => {
    return products.filter((product) => {
      const current = Number(product.current_stock || 0)
      const minimum = Number(product.minimum_stock || 0)

      return product.active && current > 0 && minimum > 0 && current <= minimum
    }).length
  }, [products])

  const totalStockValue = useMemo(() => {
    return products.reduce((sum, product) => {
      return sum + Number(product.current_stock || 0) * Number(product.cost_price || 0)
    }, 0)
  }, [products])

  const totalSalePotential = useMemo(() => {
    return products.reduce((sum, product) => {
      return sum + Number(product.current_stock || 0) * Number(product.sale_price || 0)
    }, 0)
  }, [products])

  const totalUnits = useMemo(() => {
    return products
      .filter((product) => product.active)
      .reduce((sum, product) => sum + Number(product.current_stock || 0), 0)
  }, [products])

  const topSoldProducts = useMemo<ProductRanking[]>(() => {
    const rankingMap = new Map<string, ProductRanking>()
    const productsMap = new Map(products.map((product) => [product.id, product]))

    comandaItems.forEach((item) => {
      if (!item.product_id) return

      const product = productsMap.get(item.product_id)
      const current = rankingMap.get(item.product_id) || {
        product_id: item.product_id,
        name: product?.name || item.description || 'Produto não identificado',
        quantity: 0,
        total: 0,
      }

      current.quantity += Number(item.quantity || 0)
      current.total += Number(item.quantity || 0) * Number(item.price || 0)

      rankingMap.set(item.product_id, current)
    })

    return Array.from(rankingMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
  }, [comandaItems, products])

  const topMovedProducts = useMemo<MovementRanking[]>(() => {
    const rankingMap = new Map<string, MovementRanking>()
    const productsMap = new Map(products.map((product) => [product.id, product]))

    stockMovements.forEach((movement) => {
      const current = rankingMap.get(movement.product_id) || {
        product_id: movement.product_id,
        name: productsMap.get(movement.product_id)?.name || 'Produto não identificado',
        quantity: 0,
        movements: 0,
      }

      current.quantity += Number(movement.quantity || 0)
      current.movements += 1

      rankingMap.set(movement.product_id, current)
    })

    return Array.from(rankingMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
  }, [stockMovements, products])

  const criticalProducts = useMemo(() => {
    return products
      .filter((product) => {
        const current = Number(product.current_stock || 0)
        const minimum = Number(product.minimum_stock || 0)

        return product.active && (current <= 0 || (minimum > 0 && current <= minimum))
      })
      .sort((a, b) => Number(a.current_stock || 0) - Number(b.current_stock || 0))
      .slice(0, 10)
  }, [products])

  const stoppedProducts = useMemo(() => {
    const last30Days = new Date()
    last30Days.setDate(last30Days.getDate() - 30)

    const movedProductIds = new Set(
      stockMovements
        .filter((movement) => new Date(movement.created_at).getTime() >= last30Days.getTime())
        .map((movement) => movement.product_id)
    )

    const soldProductIds = new Set(
      comandaItems
        .filter((item) => {
          if (!item.product_id || !item.created_at) return false
          return new Date(item.created_at).getTime() >= last30Days.getTime()
        })
        .map((item) => item.product_id as string)
    )

    return products
      .filter((product) => product.active && !movedProductIds.has(product.id) && !soldProductIds.has(product.id))
      .slice(0, 10)
  }, [products, stockMovements, comandaItems])

  async function loadData() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = '/login'
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      setLoading(false)
      alert(`Erro ao carregar empresa: ${profileError.message}`)
      return
    }

    if (!profile?.company_id) {
      setLoading(false)
      return
    }

    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, company_id, name, category, code, cost_price, sale_price, current_stock, minimum_stock, active, created_at')
      .eq('company_id', profile.company_id)
      .order('name', { ascending: true })

    if (productsError) {
      setLoading(false)
      alert(`Erro ao carregar produtos: ${productsError.message}`)
      return
    }

    const normalizedProducts = (productsData || []) as Product[]
    setProducts(normalizedProducts)

    const productIds = normalizedProducts.map((product) => product.id)

    if (productIds.length === 0) {
      setStockMovements([])
      setComandaItems([])
      setLoading(false)
      return
    }

    const { data: movementsData } = await supabase
      .from('stock_movements')
      .select('id, company_id, product_id, type, quantity, previous_stock, new_stock, reason, created_by, created_at')
      .eq('company_id', profile.company_id)
      .in('product_id', productIds)
      .order('created_at', { ascending: false })
      .limit(1000)

    setStockMovements((movementsData || []) as StockMovement[])

    const { data: itemsData } = await supabase
      .from('comanda_items')
      .select('id, product_id, description, quantity, price, created_at')
      .in('product_id', productIds)
      .not('product_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000)

    setComandaItems((itemsData || []) as ComandaItem[])
    setLoading(false)
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  function formatNumber(value: number | null | undefined) {
    return Number(value || 0).toLocaleString('pt-BR')
  }

  function getStockLabel(product: Product) {
    const current = Number(product.current_stock || 0)
    const minimum = Number(product.minimum_stock || 0)

    if (!product.active) return 'Inativo'
    if (current <= 0) return 'Zerado'
    if (minimum > 0 && current <= minimum) return 'Baixo'
    return 'Ok'
  }

  return (
    <div>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-4xl font-bold">
            Dashboard de Produtos
          </h1>

          <p className="mt-2 text-zinc-400">
            Indicadores gerenciais de estoque, vendas e movimentações de produtos.
          </p>
        </div>

        <Link
          href="/dashboard/produtos"
          className="rounded-xl bg-white px-5 py-3 text-center font-bold text-black transition hover:bg-zinc-200"
        >
          Voltar para produtos
        </Link>
      </div>

      {loading ? (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-400">
          Carregando dashboard...
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-2xl border border-blue-900 bg-blue-950/30 p-6">
              <p className="text-sm text-blue-300">Produtos cadastrados</p>
              <strong className="mt-2 block text-3xl text-white">{products.length}</strong>
            </div>

            <div className="rounded-2xl border border-green-900 bg-green-950/30 p-6">
              <p className="text-sm text-green-300">Produtos ativos</p>
              <strong className="mt-2 block text-3xl text-white">{activeProducts}</strong>
              <p className="mt-2 text-xs text-green-100">{inactiveProducts} inativo(s)</p>
            </div>

            <div className="rounded-2xl border border-red-900 bg-red-950/30 p-6">
              <p className="text-sm text-red-300">Zerados</p>
              <strong className="mt-2 block text-3xl text-white">{zeroStockProducts}</strong>
            </div>

            <div className="rounded-2xl border border-orange-900 bg-orange-950/30 p-6">
              <p className="text-sm text-orange-300">Estoque baixo</p>
              <strong className="mt-2 block text-3xl text-white">{lowStockProducts}</strong>
            </div>

            <div className="rounded-2xl border border-yellow-900 bg-yellow-950/30 p-6">
              <p className="text-sm text-yellow-300">Valor em estoque</p>
              <strong className="mt-2 block text-3xl text-white">{formatCurrency(totalStockValue)}</strong>
              <p className="mt-2 text-xs text-yellow-100">{formatNumber(totalUnits)} unidade(s)</p>
            </div>

            <div className="rounded-2xl border border-purple-900 bg-purple-950/30 p-6">
              <p className="text-sm text-purple-300">Potencial de venda</p>
              <strong className="mt-2 block text-3xl text-white">{formatCurrency(totalSalePotential)}</strong>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-bold">Top produtos vendidos</h2>
              <p className="mt-1 text-sm text-zinc-500">Ranking baseado nos produtos vendidos em comandas.</p>

              <div className="mt-5 space-y-3">
                {topSoldProducts.length === 0 && (
                  <p className="rounded-xl bg-zinc-950 p-4 text-zinc-500">Nenhuma venda de produto cadastrada ainda.</p>
                )}

                {topSoldProducts.map((product, index) => (
                  <div key={product.product_id} className="grid gap-3 rounded-xl bg-zinc-950 p-4 md:grid-cols-[60px_1fr_120px_150px]">
                    <strong className="text-zinc-500">#{index + 1}</strong>
                    <span className="font-bold text-white">{product.name}</span>
                    <span className="text-zinc-300">{formatNumber(product.quantity)} un.</span>
                    <span className="text-green-400">{formatCurrency(product.total)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-bold">Top produtos movimentados</h2>
              <p className="mt-1 text-sm text-zinc-500">Ranking baseado em entradas e saídas de estoque.</p>

              <div className="mt-5 space-y-3">
                {topMovedProducts.length === 0 && (
                  <p className="rounded-xl bg-zinc-950 p-4 text-zinc-500">Nenhuma movimentação de estoque registrada ainda.</p>
                )}

                {topMovedProducts.map((product, index) => (
                  <div key={product.product_id} className="grid gap-3 rounded-xl bg-zinc-950 p-4 md:grid-cols-[60px_1fr_120px_150px]">
                    <strong className="text-zinc-500">#{index + 1}</strong>
                    <span className="font-bold text-white">{product.name}</span>
                    <span className="text-zinc-300">{formatNumber(product.quantity)} un.</span>
                    <span className="text-blue-400">{formatNumber(product.movements)} mov.</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-red-900 bg-red-950/20 p-6">
              <h2 className="text-2xl font-bold">Produtos críticos</h2>
              <p className="mt-1 text-sm text-red-200">Produtos zerados ou abaixo do estoque mínimo.</p>

              <div className="mt-5 space-y-3">
                {criticalProducts.length === 0 && (
                  <p className="rounded-xl bg-black/30 p-4 text-red-100">Nenhum produto crítico no momento.</p>
                )}

                {criticalProducts.map((product) => (
                  <div key={product.id} className="grid gap-3 rounded-xl bg-black/30 p-4 md:grid-cols-[1fr_120px_120px_120px]">
                    <strong className="text-white">{product.name}</strong>
                    <span className="text-zinc-300">Atual: {formatNumber(product.current_stock)}</span>
                    <span className="text-zinc-300">Mín.: {formatNumber(product.minimum_stock)}</span>
                    <span className={Number(product.current_stock || 0) <= 0 ? 'font-bold text-red-300' : 'font-bold text-orange-300'}>
                      {getStockLabel(product)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-bold">Produtos parados</h2>
              <p className="mt-1 text-sm text-zinc-500">Produtos sem venda ou movimentação nos últimos 30 dias.</p>

              <div className="mt-5 space-y-3">
                {stoppedProducts.length === 0 && (
                  <p className="rounded-xl bg-zinc-950 p-4 text-zinc-500">Nenhum produto parado identificado.</p>
                )}

                {stoppedProducts.map((product) => (
                  <div key={product.id} className="grid gap-3 rounded-xl bg-zinc-950 p-4 md:grid-cols-[1fr_120px_150px]">
                    <strong className="text-white">{product.name}</strong>
                    <span className="text-zinc-300">Estoque: {formatNumber(product.current_stock)}</span>
                    <span className="text-yellow-400">
                      {formatCurrency(Number(product.current_stock || 0) * Number(product.cost_price || 0))}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
