import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { planId, planName, price, companyId } = body

    // 1. Aqui você pega a chave do Asaas do seu arquivo .env
    const ASAAS_API_KEY = process.env.ASAAS_API_KEY
    const ASAAS_URL = process.env.ASAAS_URL || "https://sandbox.asaas.com/api/v3" // Padrão Sandbox

    if (!ASAAS_API_KEY) {
      console.error("Erro: ASAAS_API_KEY não configurada no ambiente.")
      return NextResponse.json({ error: "Configuração de pagamento ausente." }, { status: 500 })
    }

    // 2. Criar a cobrança (Link de Pagamento) no Asaas
    // Nota: Em produção, você primeiro buscaria/criaria o Customer (cliente) baseado na barbearia
    const asaasResponse = await fetch(`${ASAAS_URL}/paymentLinks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY
      },
      body: JSON.stringify({
        name: `Plano ${planName} - Assinatura Barbearia`,
        value: Number(price),
        billingType: "UNDEFINED", // Permite ao cliente escolher Cartão, Boleto ou PIX no checkout
        chargeType: "RECURRENT",  // Define que é uma assinatura mensal recorrente
        period: "MONTHLY",
        dueDateLimitDays: 3,      // <-- Número inteiro puro sem aspas. Dá 3 dias úteis para o vencimento
        notificationEnabled: true,
        externalReference: companyId 
      })
    })

    const paymentLinkData = await asaasResponse.json()

    if (!asaasResponse.ok) {
      console.error("Erro retornado pelo Asaas:", paymentLinkData)
      return NextResponse.json({ error: "Erro ao gerar link no Asaas" }, { status: 400 })
    }

    // 3. Devolve a URL gerada para o Front-end redirecionar o usuário
    return NextResponse.json({ url: paymentLinkData.url })

  } catch (error) {
    console.error("Erro interno na rota de checkout:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}