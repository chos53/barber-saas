'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Product = {
  id: string
  name: string
  category: string | null
  code: string | null
  cost_price: number | null
  sale_price: number | null
  current_stock: number | null
  minimum_stock: number | null
  active: boolean
}

type StockMovement = {
  id: string
  product_id: string
  type: 'in' | 'out'
  quantity: number
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

type ProductPerformance = {
  product_id: string
  name: string
  quantity: number
  revenue: number
  estimatedCost: number
  estimatedProfit: number
  margin: number
}

export default function ProdutosDashboardPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  const [comandaItems, setComandaItems] = useState<ComandaItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const productMap = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]))
  }, [products])

  const performance = useMemo<ProductPerformance[]>(() => {
    const map = new Map<string, ProductPerformance>()

    comandaItems.forEach((item) => {
      if (!item.product_id) return

      const product = productMap.get(item.product_id)
      const quantity = Number(item.quantity || 0)
      const revenue = quantity * Number(item.price || 0)
      const estimatedCost = quantity * Number(product?.cost_price || 0)
      const current = map.get(item.product_id) || {
        product_id: item.product_id,
        name: product?.name || item.description || 'Produto não identificado',
        quantity: 0,
        revenue: 0,
        estimatedCost: 0,
        estimatedProfit: 0,
        margin: 0,
      }

      current.quantity += quantity
      current.revenue += revenue
      current.estimatedCost += estimatedCost
      current.estimatedProfit = current.revenue - current.estimatedCost
      current.margin =
        current.revenue > 0
          ? Number(((current.estimatedProfit / current.revenue) * 100).toFixed(2))
          : 0

      map.set(item.product_id, current)
    })

    return Array.from(map.values())
  }, [comandaItems, productMap])

  const totalRevenue = useMemo(() => {
    return performance.reduce((sum, product) => sum + product.revenue, 0)
  }, [performance])

  const totalEstimatedCost = useMemo(() => {
    return performance.reduce((sum, product) => sum + product.estimatedCost, 0)
  }, [performance])

  const totalEstimatedProfit = useMemo(() => {
    return totalRevenue - totalEstimatedCost
  }, [totalRevenue, totalEstimatedCost])

  const averageMargin = useMemo(() => {
    if (totalRevenue <= 0) return 0

    return Number(((totalEstimatedProfit / totalRevenue) * 100).toFixed(2))
  }, [totalRevenue, totalEstimatedProfit])

  const totalSoldUnits = useMemo(() => {
    return performance.reduce((sum, product) => sum + product.quantity, 0)
  }, [performance])

  const topByQuantity = useMemo(() => {
    return [...performance]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
  }, [performance])

  const topByRevenue = useMemo(() => {
    return [...performance]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
  }, [performance])

  const topByProfit = useMemo(() => {
    return [...performance]
      .sort((a, b) => b.estimatedProfit - a.estimatedProfit)
      .slice(0, 10)
  }, [performance])

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

  const topMovedProducts = useMemo(() => {
    const map = new Map<string, { product_id: string; name: string; quantity: number; movements: number }>()

    stockMovements.forEach((movement) => {
      const product = productMap.get(movement.product_id)
      const current = map.get(movement.product_id) || {
        product_id: movement.product_id,
        name: product?.name || 'Produto não identificado',
        quantity: 0,
        movements: 0,
      }

      current.quantity += Number(movement.quantity || 0)
      current.movements += 1

      map.set(movement.product_id, current)
    })

    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
  }, [stockMovements, productMap])

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
      .select('id, name, category, code, cost_price, sale_price, current_stock, minimum_stock, active')
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
      .select('id, product_id, type, quantity, created_at')
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

  function formatPercent(value: number) {
    return `${Number(value || 0).toFixed(2)}%`
  }

  function getStockLabel(product: Product) {
    const current = Number(product.current_stock || 0)
    const minimum = Number(product.minimum_stock || 0)

    if (!product.active) return 'Inativo'
    if (current <= 0) return 'Zerado'
    if (minimum > 0 && current <= minimum) return 'Baixo'
    return 'Ok'
  }

  function renderPerformanceList(
    title: string,
    description: string,
    productsList: ProductPerformance[],
    highlight: 'quantity' | 'revenue' | 'profit'
  ) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">
          {title}
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          {description}
        </p>

        <div className="mt-5 space-y-3">
          {productsList.length === 0 && (
            <p className="rounded-xl bg-zinc-950 p-4 text-zinc-500">
              Nenhuma venda de produto registrada ainda.
            </p>
          )}

          {productsList.map((product, index) => (
            <div
              key={product.product_id}
              className="grid gap-3 rounded-xl bg-zinc-950 p-4 md:grid-cols-[60px_1fr_110px_140px_140px_110px]"
            >
              <strong className="text-zinc-500">
                #{index + 1}
              </strong>

              <span className="font-bold text-white">
                {product.name}
              </span>

              <span className={highlight === 'quantity' ? 'font-bold text-blue-400' : 'text-zinc-300'}>
                {formatNumber(product.quantity)} un.
              </span>

              <span className={highlight === 'revenue' ? 'font-bold text-green-400' : 'text-zinc-300'}>
                {formatCurrency(product.revenue)}
              </span>

              <span className={highlight === 'profit' ? 'font-bold text-yellow-400' : 'text-zinc-300'}>
                {formatCurrency(product.estimatedProfit)}
              </span>

              <span className={product.margin >= 50 ? 'font-bold text-green-400' : 'font-bold text-orange-300'}>
                {formatPercent(product.margin)}
              </span>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-4xl font-bold">
            Dashboard de Produtos
          </h1>

          <p className="mt-2 text-zinc-400">
            Análise gerencial de vendas, faturamento, lucro estimado e giro de produtos.
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
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-blue-900 bg-blue-950/30 p-6">
              <p className="text-sm text-blue-300">
                Unidades vendidas
              </p>

              <strong className="mt-2 block text-3xl text-white">
                {formatNumber(totalSoldUnits)}
              </strong>
            </div>

            <div className="rounded-2xl border border-green-900 bg-green-950/30 p-6">
              <p className="text-sm text-green-300">
                Faturamento em produtos
              </p>

              <strong className="mt-2 block text-3xl text-white">
                {formatCurrency(totalRevenue)}
              </strong>
            </div>

            <div className="rounded-2xl border border-yellow-900 bg-yellow-950/30 p-6">
              <p className="text-sm text-yellow-300">
                Lucro estimado
              </p>

              <strong className="mt-2 block text-3xl text-white">
                {formatCurrency(totalEstimatedProfit)}
              </strong>

              <p className="mt-2 text-xs text-yellow-100">
                Custo estimado: {formatCurrency(totalEstimatedCost)}
              </p>
            </div>

            <div className="rounded-2xl border border-purple-900 bg-purple-950/30 p-6">
              <p className="text-sm text-purple-300">
                Margem média
              </p>

              <strong className="mt-2 block text-3xl text-white">
                {formatPercent(averageMargin)}
              </strong>
            </div>

            <div className="rounded-2xl border border-red-900 bg-red-950/30 p-6">
              <p className="text-sm text-red-300">
                Produtos críticos
              </p>

              <strong className="mt-2 block text-3xl text-white">
                {criticalProducts.length}
              </strong>

              <p className="mt-2 text-xs text-red-100">
                Zerados ou abaixo do mínimo
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            {renderPerformanceList(
              'Top produtos por faturamento',
              'Produtos que mais geraram receita nas comandas.',
              topByRevenue,
              'revenue'
            )}

            {renderPerformanceList(
              'Top produtos por lucro estimado',
              'Lucro calculado por preço de venda menos custo cadastrado.',
              topByProfit,
              'profit'
            )}

            {renderPerformanceList(
              'Top produtos por quantidade vendida',
              'Produtos com maior volume de unidades vendidas.',
              topByQuantity,
              'quantity'
            )}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="rounded-2xl border border-red-900 bg-red-950/20 p-6">
              <h2 className="text-2xl font-bold">
                Produtos críticos
              </h2>

              <p className="mt-1 text-sm text-red-200">
                Produtos zerados ou abaixo do estoque mínimo.
              </p>

              <div className="mt-5 space-y-3">
                {criticalProducts.length === 0 && (
                  <p className="rounded-xl bg-black/30 p-4 text-red-100">
                    Nenhum produto crítico no momento.
                  </p>
                )}

                {criticalProducts.map((product) => (
                  <div
                    key={product.id}
                    className="grid gap-3 rounded-xl bg-black/30 p-4"
                  >
                    <strong className="text-white">
                      {product.name}
                    </strong>

                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-zinc-300">
                        Atual: {formatNumber(product.current_stock)}
                      </span>

                      <span className="text-zinc-300">
                        Mín.: {formatNumber(product.minimum_stock)}
                      </span>

                      <span className={Number(product.current_stock || 0) <= 0 ? 'font-bold text-red-300' : 'font-bold text-orange-300'}>
                        {getStockLabel(product)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-bold">
                Top movimentados
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Produtos com mais entradas e saídas no estoque.
              </p>

              <div className="mt-5 space-y-3">
                {topMovedProducts.length === 0 && (
                  <p className="rounded-xl bg-zinc-950 p-4 text-zinc-500">
                    Nenhuma movimentação registrada.
                  </p>
                )}

                {topMovedProducts.map((product, index) => (
                  <div
                    key={product.product_id}
                    className="grid gap-2 rounded-xl bg-zinc-950 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-white">
                        #{index + 1} {product.name}
                      </strong>

                      <span className="text-blue-400">
                        {formatNumber(product.movements)} mov.
                      </span>
                    </div>

                    <p className="text-sm text-zinc-400">
                      Volume movimentado: {formatNumber(product.quantity)} un.
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-2xl font-bold">
                Produtos parados
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Sem venda ou movimentação nos últimos 30 dias.
              </p>

              <div className="mt-5 space-y-3">
                {stoppedProducts.length === 0 && (
                  <p className="rounded-xl bg-zinc-950 p-4 text-zinc-500">
                    Nenhum produto parado identificado.
                  </p>
                )}

                {stoppedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="grid gap-2 rounded-xl bg-zinc-950 p-4"
                  >
                    <strong className="text-white">
                      {product.name}
                    </strong>

                    <p className="text-sm text-zinc-400">
                      Estoque: {formatNumber(product.current_stock)} · Valor em custo:{' '}
                      {formatCurrency(
                        Number(product.current_stock || 0) *
                          Number(product.cost_price || 0)
                      )}
                    </p>
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
