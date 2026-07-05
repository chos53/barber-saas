import { NextResponse } from "next/server"
import { createAsaasSubAccount } from "@/services/asaas.service"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const cookieStore = await cookies()
  
  // 1. Validar se o usuário que está chamando a rota está realmente logado no Salonix
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

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: "Nao autorizado. Faca login novamente." },
      { status: 401 }
    )
  }

  try {
    // 2. Receber os dados cadastrais da barbearia enviados pelo formulário do painel
    const body = await request.json()
    const { companyId, name, email, cpfCnpj, phone, mobilePhone } = body

    // Validação simples de campos obrigatórios
    if (!companyId || !name || !email || !cpfCnpj || !mobilePhone) {
      return NextResponse.json(
        { error: "Dados incompletos para a criacao da conta no Asaas." },
        { status: 400 }
      )
    }

    // 3. Chamar o serviço que criamos para gerenciar a criação na API do Asaas
    const result = await createAsaasSubAccount({
      companyId,
      name,
      email,
      cpfCnpj,
      phone: phone || mobilePhone, // Se não tiver telefone fixo, usa o celular
      mobilePhone,
    })

    return NextResponse.json({
      success: true,
      message: `Subconta criada com sucesso no ambiente de ${result.environment}!`,
      walletId: result.walletId,
    })

  } catch (error: any) {
    console.error("Erro na rota de conexao Asaas:", error)
    return NextResponse.json(
      { error: error.message || "Erro interno ao processar a subconta." },
      { status: 500 }
    )
  }
}