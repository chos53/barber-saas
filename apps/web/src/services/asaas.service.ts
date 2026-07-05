import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

interface CreateSubAccountInput {
  companyId: string
  name: string
  email: string
  cpfCnpj: string
  phone: string
  mobilePhone: string
}

export async function createAsaasSubAccount(input: CreateSubAccountInput) {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  // 1. Buscar o ambiente atual configurado para a barbearia
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("asaas_environment")
    .eq("id", input.companyId)
    .single()

  if (companyError || !company) {
    throw new Error("Empresa nao encontrada para configuracao do Asaas.")
  }

  const isSandbox = company.asaas_environment === "sandbox"

  // 2. Definir a URL base e a API Key Master dinamicamente conforme o ambiente da barbearia
  const baseUrl = isSandbox 
    ? "https://sandbox.asaas.com/api/v1" 
    : "https://api.asaas.com/v1"

  const apiKey = isSandbox
    ? process.env.ASAAS_SANDBOX_API_KEY! // Sua chave master da conta Sandbox
    : process.env.ASAAS_PRODUCTION_API_KEY! // Sua chave master da conta Real

  // 3. Montar o payload exigido pelo Asaas para criar a conta filha (subconta)
  const payload = {
    name: input.name,
    email: input.email,
    cpfCnpj: input.cpfCnpj,
    phone: input.phone,
    mobilePhone: input.mobilePhone,
    type: "MERCHANT", // Tipo lojista/comerciante padrão
  }

  try {
    const response = await fetch(`${baseUrl}/accounts`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "access_token": apiKey,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Erro retornado pelo Asaas:", errorData)
      throw new Error("Falha ao criar subconta no Asaas.")
    }

    const data = await response.json()
    
    // O Asaas retorna o ID da subconta no campo 'id' e a chave de API da própria subconta no campo 'apiKey'
    const walletId = data.id 

    // 4. Salvar o ID da carteira criada no campo correspondente no banco de dados
    const updateField = isSandbox ? "asaas_sandbox_wallet_id" : "asaas_wallet_id"

    const { error: updateError } = await supabase
      .from("companies")
      .update({ [updateField]: walletId })
      .eq("id", input.companyId)

    if (updateError) {
      throw new Error("Subconta criada no Asaas, mas falhou ao salvar no banco do Salonix.")
    }

    return {
      success: true,
      walletId,
      environment: company.asaas_environment
    }

  } catch (error) {
    console.error("Erro critico na integracao com Asaas:", error)
    throw error
  }
}