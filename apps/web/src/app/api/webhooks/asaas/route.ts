import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    // 1. Validar o Token do Webhook vindo do Asaas
    const asaasToken = request.headers.get("asaas-access-token")
    const webhookSecret = process.env.ASAAS_WEBHOOK_SECRET

    if (!asaasToken || asaasToken !== webhookSecret) {
      return NextResponse.json({ error: "Token de assinatura do webhook inválido." }, { status: 401 })
    }

    // 2. Capturar o corpo da requisição de forma segura
    const body = await request.json()
    const { event, payment } = body

    // 3. Processar os eventos de pagamento com segurança
    if (event === "PAYMENT_RECEIVED") {
      const companyId = payment.externalReference // Garantir que envias o ID da empresa no externalReference do Asaas

      // Atualizar a assinatura da empresa no banco de dados
      const { error } = await supabase
        .from("companies")
        .update({ 
          plan_status: "active", 
          updated_at: new Date().toISOString() 
        })
        .eq("id", companyId)

      if (error) {
        return NextResponse.json({ error: "Erro ao atualizar o plano da empresa." }, { status: 500 })
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    return NextResponse.json({ error: "Falha ao processar o webhook." }, { status: 500 })
  }
}