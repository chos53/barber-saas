// src/lib/asaas.ts

const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3'
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || ''

const headers = {
  'Content-Type': 'application/json',
  access_token: ASAAS_API_KEY,
}

export type AsaasCustomerInput = {
  name: string
  email: string
  cpfCnpj?: string
  phone?: string
  mobilePhone?: string
}

/**
 * Cria um novo cliente (Customer) no Asaas
 */
export async function createAsaasCustomer(data: AsaasCustomerInput) {
  if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY não configurada no .env')

  const response = await fetch(`${ASAAS_API_URL}/customers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Erro ao criar customer no Asaas:', error)
    throw new Error(error.errors?.[0]?.description || 'Erro desconhecido ao criar cliente no Asaas')
  }

  return response.json() // Retorna objeto com id 'cus_xxxxxx'
}

export type AsaasSubscriptionInput = {
  customer: string // ID do cliente no Asaas (cus_xxxxxx)
  billingType: 'CREDIT_CARD' | 'BOLETO' | 'PIX' | 'UNDEFINED'
  value: number
  nextDueDate: string // Formato YYYY-MM-DD
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY'
  description: string
}

/**
 * Cria uma assinatura recorrente no Asaas vinculada ao cliente
 */
export async function createAsaasSubscription(data: AsaasSubscriptionInput) {
  if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY não configurada no .env')

  const response = await fetch(`${ASAAS_API_URL}/subscriptions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Erro ao criar assinatura no Asaas:', error)
    throw new Error(error.errors?.[0]?.description || 'Erro desconhecido ao criar assinatura no Asaas')
  }

  return response.json() // Retorna objeto com id 'sub_xxxxxx'
}
/**
 * Lista todas as cobranças (payments) de um determinado cliente no Asaas
 */
export async function getAsaasCustomerPayments(customerId: string) {
  if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY não configurada no .env')

  const response = await fetch(`${ASAAS_API_URL}/payments?customer=${customerId}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Erro ao buscar cobranças no Asaas:', error)
    throw new Error(error.errors?.[0]?.description || 'Erro ao buscar cobranças no Asaas')
  }

  return response.json() // Retorna a lista de faturas do cliente
}