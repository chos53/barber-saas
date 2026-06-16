// app/api/webhooks/asaas/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Inicializa o cliente do Supabase com a Service Role para contornar o RLS de forma segura no servidor
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { event, payment } = body

    if (!payment) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    const asaasSubscriptionId = payment.subscription // ID da assinatura no Asaas (sub_xxxx)
    const asaasCustomerId = payment.customer // ID do cliente no Asaas (cus_xxxx)

    console.log(`[Webhook Asaas] Evento recebido: ${event} para o customer ${asaasCustomerId}`)

    // 1. Evento de Pagamento Recebido (Sucesso na cobrança)
    if (event === 'PAYMENT_RECEIVED') {
      const dueDate = new Date(payment.dueDate)
      // Calcula a nova data de expiração (vencimento da fatura + 30 dias de ciclo)
      const nextExpiration = new Date(dueDate)
      nextExpiration.setDate(nextExpiration.getDate() + 30)

      const { error } = await supabaseAdmin
        .from('company_subscriptions')
        .update({
          status: 'active',
          subscription_ends_at: nextExpiration.toISOString(),
          blocked_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('asaas_subscription_id', asaasSubscriptionId)

      if (error) {
        console.error('[Webhook Asaas] Erro ao ativar assinatura via webhook:', error.message)
        return NextResponse.json({ error: 'Erro interno ao atualizar banco' }, { status: 500 })
      }

      console.log(`[Webhook Asaas] Assinatura ${asaasSubscriptionId} renovada e ativada com sucesso.`)
    }

    // 2. Evento de Pagamento Vencido / Atrasado (Inadimplência)
    if (event === 'PAYMENT_OVERDUE') {
      const { error } = await supabaseAdmin
        .from('company_subscriptions')
        .update({
          status: 'suspended',
          blocked_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('asaas_subscription_id', asaasSubscriptionId)

      if (error) {
        console.error('[Webhook Asaas] Erro ao suspender assinatura via webhook:', error.message)
        return NextResponse.json({ error: 'Erro interno ao suspender licença' }, { status: 500 })
      }

      console.log(`[Webhook Asaas] Assinatura ${asaasSubscriptionId} suspensa por falta de pagamento.`)
    }

    // Retorna sucesso para o Asaas parar de reenviar o mesmo evento
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err: any) {
    console.error('[Webhook Asaas] Falha crítica no processamento:', err.message)
    return NextResponse.json({ error: 'Erro crítico no webhook' }, { status: 500 })
  }
}