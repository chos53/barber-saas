'use client'

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

export default function ProdutosPage() {
  const [companyId, setCompanyId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [code, setCode] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [currentStock, setCurrentStock] = useState('')
  const [minimumStock, setMinimumStock] = useState('')

  const [editingProductId, setEditingProductId] = useState('')
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editCostPrice, setEditCostPrice] = useState('')
  const [editSalePrice, setEditSalePrice] = useState('')
  const [editCurrentStock, setEditCurrentStock] = useState('')
  const [editMinimumStock, setEditMinimumStock] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return products.filter((product) => {
      if (!normalizedSearch) return true

      return (
        product.name.toLowerCase().includes(normalizedSearch) ||
        String(product.category || '').toLowerCase().includes(normalizedSearch) ||
        String(product.code || '').toLowerCase().includes(normalizedSearch)
      )
    })
  }, [products, search])

  const activeProducts = useMemo(() => {
    return products.filter((product) => product.active).length
  }, [products])

  const inactiveProducts = useMemo(() => {
    return products.filter((product) => !product.active).length
  }, [products])

  const lowStockProducts = useMemo(() => {
    return products.filter((product) => {
      const current = Number(product.current_stock || 0)
      const minimum = Number(product.minimum_stock || 0)

      return product.active && minimum > 0 && current <= minimum
    }).length
  }, [products])

  const totalStockValue = useMemo(() => {
    return products.reduce((sum, product) => {
      return (
        sum +
        Number(product.current_stock || 0) *
          Number(product.cost_price || 0)
      )
    }, 0)
  }, [products])

  const totalSalePotential = useMemo(() => {
    return products.reduce((sum, product) => {
      return (
        sum +
        Number(product.current_stock || 0) *
          Number(product.sale_price || 0)
      )
    }, 0)
  }, [products])

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  function formatNumber(value: number | null | undefined) {
    return Number(value || 0).toLocaleString('pt-BR')
  }

  function getStockStatus(product: Product) {
    const current = Number(product.current_stock || 0)
    const minimum = Number(product.minimum_stock || 0)

    if (!product.active) {
      return {
        label: 'Inativo',
        className: 'bg-zinc-700 text-zinc-300',
      }
    }

    if (minimum > 0 && current <= minimum) {
      return {
        label: 'Estoque baixo',
        className: 'bg-red-900 text-red-300',
      }
    }

    return {
      label: 'Estoque ok',
      className: 'bg-green-900 text-green-300',
    }
  }

  async function loadData() {
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
      alert(`Erro ao carregar empresa: ${profileError.message}`)
      return
    }

    if (!profile?.company_id) return

    setCompanyId(profile.company_id)

    const { data, error } = await supabase
      .from('products')
      .select(
        'id, company_id, name, category, code, cost_price, sale_price, current_stock, minimum_stock, active, created_at'
      )
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (error) {
      alert(`Erro ao carregar produtos: ${error.message}`)
      return
    }

    setProducts((data || []) as Product[])
  }

  function resetForm() {
    setName('')
    setCategory('')
    setCode('')
    setCostPrice('')
    setSalePrice('')
    setCurrentStock('')
    setMinimumStock('')
  }

  async function createProduct(event: React.FormEvent) {
    event.preventDefault()

    if (!companyId) {
      alert('Empresa não identificada.')
      return
    }

    if (!name.trim()) {
      alert('Digite o nome do produto.')
      return
    }

    if (Number(salePrice || 0) < 0) {
      alert('O valor de venda não pode ser negativo.')
      return
    }

    if (Number(costPrice || 0) < 0) {
      alert('O valor de custo não pode ser negativo.')
      return
    }

    if (Number(currentStock || 0) < 0) {
      alert('O estoque atual não pode ser negativo.')
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from('products')
      .insert({
        company_id: companyId,
        name: name.trim(),
        category: category.trim() || null,
        code: code.trim() || null,
        cost_price: Number(costPrice || 0),
        sale_price: Number(salePrice || 0),
        current_stock: Number(currentStock || 0),
        minimum_stock: Number(minimumStock || 0),
        active: true,
      })

    setLoading(false)

    if (error) {
      alert(`Erro ao cadastrar produto: ${error.message}`)
      return
    }

    resetForm()
    await loadData()
  }

  function startEditing(product: Product) {
    setEditingProductId(product.id)
    setEditName(product.name)
    setEditCategory(product.category || '')
    setEditCode(product.code || '')
    setEditCostPrice(String(product.cost_price || 0))
    setEditSalePrice(String(product.sale_price || 0))
    setEditCurrentStock(String(product.current_stock || 0))
    setEditMinimumStock(String(product.minimum_stock || 0))
  }

  function cancelEditing() {
    setEditingProductId('')
    setEditName('')
    setEditCategory('')
    setEditCode('')
    setEditCostPrice('')
    setEditSalePrice('')
    setEditCurrentStock('')
    setEditMinimumStock('')
  }

  async function updateProduct(productId: string) {
    if (!editName.trim()) {
      alert('Digite o nome do produto.')
      return
    }

    if (Number(editSalePrice || 0) < 0) {
      alert('O valor de venda não pode ser negativo.')
      return
    }

    if (Number(editCostPrice || 0) < 0) {
      alert('O valor de custo não pode ser negativo.')
      return
    }

    if (Number(editCurrentStock || 0) < 0) {
      alert('O estoque atual não pode ser negativo.')
      return
    }

    const { error } = await supabase
      .from('products')
      .update({
        name: editName.trim(),
        category: editCategory.trim() || null,
        code: editCode.trim() || null,
        cost_price: Number(editCostPrice || 0),
        sale_price: Number(editSalePrice || 0),
        current_stock: Number(editCurrentStock || 0),
        minimum_stock: Number(editMinimumStock || 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .eq('company_id', companyId)

    if (error) {
      alert(`Erro ao atualizar produto: ${error.message}`)
      return
    }

    cancelEditing()
    await loadData()
  }

  async function toggleProductActive(product: Product) {
    const { error } = await supabase
      .from('products')
      .update({
        active: !product.active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', product.id)
      .eq('company_id', companyId)

    if (error) {
      alert(`Erro ao alterar status do produto: ${error.message}`)
      return
    }

    await loadData()
  }

  return (
    <div>
      <h1 className="text-4xl font-bold">
        Produtos
      </h1>

      <p className="mt-2 text-zinc-400">
        Cadastro básico de produtos para preparar o módulo de estoque e a venda pela comanda.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-blue-900 bg-blue-950/30 p-6">
          <p className="text-sm text-blue-300">
            Produtos ativos
          </p>

          <strong className="mt-2 block text-3xl text-white">
            {activeProducts}
          </strong>
        </div>

        <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Produtos inativos
          </p>

          <strong className="mt-2 block text-3xl text-white">
            {inactiveProducts}
          </strong>
        </div>

        <div className="rounded-2xl border border-red-900 bg-red-950/30 p-6">
          <p className="text-sm text-red-300">
            Estoque baixo
          </p>

          <strong className="mt-2 block text-3xl text-white">
            {lowStockProducts}
          </strong>
        </div>

        <div className="rounded-2xl border border-yellow-900 bg-yellow-950/30 p-6">
          <p className="text-sm text-yellow-300">
            Valor em custo
          </p>

          <strong className="mt-2 block text-3xl text-white">
            {formatCurrency(totalStockValue)}
          </strong>
        </div>

        <div className="rounded-2xl border border-green-900 bg-green-950/30 p-6">
          <p className="text-sm text-green-300">
            Potencial de venda
          </p>

          <strong className="mt-2 block text-3xl text-white">
            {formatCurrency(totalSalePotential)}
          </strong>
        </div>
      </div>

      <form
        onSubmit={createProduct}
        className="mt-8 grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
      >
        <h2 className="text-2xl font-bold">
          Cadastrar produto
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome do produto"
            className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
          />

          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Categoria. Ex: Pomadas, shampoos, acessórios"
            className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
          />

          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Código interno ou SKU"
            className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
          />

          <input
            type="number"
            min="0"
            step="0.01"
            value={costPrice}
            onChange={(event) => setCostPrice(event.target.value)}
            placeholder="Valor de custo"
            className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
          />

          <input
            type="number"
            min="0"
            step="0.01"
            value={salePrice}
            onChange={(event) => setSalePrice(event.target.value)}
            placeholder="Valor de venda"
            className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
          />

          <input
            type="number"
            min="0"
            step="1"
            value={currentStock}
            onChange={(event) => setCurrentStock(event.target.value)}
            placeholder="Estoque atual"
            className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
          />

          <input
            type="number"
            min="0"
            step="1"
            value={minimumStock}
            onChange={(event) => setMinimumStock(event.target.value)}
            placeholder="Estoque mínimo"
            className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-white p-3 font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50 md:w-fit md:px-8"
        >
          {loading ? 'Salvando...' : 'Cadastrar produto'}
        </button>
      </form>

      <div className="mt-8">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar por produto, categoria ou código..."
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-white outline-none"
        />
      </div>

      <div className="mt-8 space-y-4">
        {filteredProducts.length === 0 && (
          <p className="rounded-xl bg-zinc-900 p-4 text-zinc-500">
            Nenhum produto encontrado.
          </p>
        )}

        {filteredProducts.map((product) => {
          const isEditing = editingProductId === product.id
          const stockStatus = getStockStatus(product)

          return (
            <div
              key={product.id}
              className={`rounded-2xl border p-5 ${
                product.active
                  ? 'border-zinc-800 bg-zinc-900'
                  : 'border-zinc-800 bg-zinc-950 opacity-70'
              }`}
            >
              {isEditing ? (
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      placeholder="Nome do produto"
                      className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                    />

                    <input
                      value={editCategory}
                      onChange={(event) => setEditCategory(event.target.value)}
                      placeholder="Categoria"
                      className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                    />

                    <input
                      value={editCode}
                      onChange={(event) => setEditCode(event.target.value)}
                      placeholder="Código interno ou SKU"
                      className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                    />

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editCostPrice}
                      onChange={(event) => setEditCostPrice(event.target.value)}
                      placeholder="Valor de custo"
                      className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                    />

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editSalePrice}
                      onChange={(event) => setEditSalePrice(event.target.value)}
                      placeholder="Valor de venda"
                      className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                    />

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editCurrentStock}
                      onChange={(event) => setEditCurrentStock(event.target.value)}
                      placeholder="Estoque atual"
                      className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                    />

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editMinimumStock}
                      onChange={(event) => setEditMinimumStock(event.target.value)}
                      placeholder="Estoque mínimo"
                      className="rounded-xl border border-zinc-700 bg-black p-3 text-white outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateProduct(product.id)}
                      className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white transition hover:bg-green-500"
                    >
                      Salvar
                    </button>

                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="rounded-xl bg-zinc-700 px-5 py-3 font-bold text-white transition hover:bg-zinc-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold">
                          {product.name}
                        </h2>

                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${stockStatus.className}`}>
                          {stockStatus.label}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1 text-sm text-zinc-500">
                        <p>
                          Categoria: {product.category || '-'}
                        </p>

                        <p>
                          Código: {product.code || '-'}
                        </p>

                        <p>
                          Criado em{' '}
                          {new Date(product.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-5 xl:min-w-[760px]">
                      <div className="rounded-xl bg-zinc-950 p-4">
                        <p className="text-xs text-zinc-500">
                          Custo
                        </p>

                        <strong className="mt-1 block text-green-400">
                          {formatCurrency(Number(product.cost_price || 0))}
                        </strong>
                      </div>

                      <div className="rounded-xl bg-zinc-950 p-4">
                        <p className="text-xs text-zinc-500">
                          Venda
                        </p>

                        <strong className="mt-1 block text-blue-400">
                          {formatCurrency(Number(product.sale_price || 0))}
                        </strong>
                      </div>

                      <div className="rounded-xl bg-zinc-950 p-4">
                        <p className="text-xs text-zinc-500">
                          Estoque
                        </p>

                        <strong className="mt-1 block text-white">
                          {formatNumber(product.current_stock)}
                        </strong>
                      </div>

                      <div className="rounded-xl bg-zinc-950 p-4">
                        <p className="text-xs text-zinc-500">
                          Mínimo
                        </p>

                        <strong className="mt-1 block text-white">
                          {formatNumber(product.minimum_stock)}
                        </strong>
                      </div>

                      <div className="rounded-xl bg-zinc-950 p-4">
                        <p className="text-xs text-zinc-500">
                          Lucro un.
                        </p>

                        <strong className="mt-1 block text-yellow-400">
                          {formatCurrency(
                            Number(product.sale_price || 0) -
                              Number(product.cost_price || 0)
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(product)}
                      className="rounded-xl bg-white px-5 py-3 font-bold text-black transition hover:bg-zinc-200"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleProductActive(product)}
                      className={`rounded-xl px-5 py-3 font-bold transition ${
                        product.active
                          ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                          : 'bg-green-600 text-white hover:bg-green-500'
                      }`}
                    >
                      {product.active ? 'Inativar' : 'Ativar'}
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
