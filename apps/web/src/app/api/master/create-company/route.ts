// src/app/api/master/create-company/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAsaasCustomer, createAsaasSubscription } from '@/lib/asaas'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json()
    const { companyName, ownerEmail, planId, trialDays, masterUserId } = body

    if (!companyName || !ownerEmail || !planId) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
    }

    // 1. Obter detalhes do plano SaaS
    const { data: plan, error: planError } = await supabaseAdmin
      .from('saas_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plano SaaS não encontrado.' }, { status: 404 })
    }

    // 2. Gerar slug limpo para a empresa
    const companySlug = companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    // 3. Cadastrar a Empresa associando o masterUserId para que ela passe pelo RLS do painel
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: companyName,
        slug: `${companySlug}-${Date.now()}`,
        owner_id: masterUserId || null, // Define o criador Master como dono temporário
      })
      .select('id')
      .single()

      if (companyError || !company?.id) {
        return NextResponse.json({ 
          error: `Erro ao criar empresa: ${companyError?.message || 'ID da empresa não foi retornado.'}` 
        }, { status: 500 })
      }

    // 4. Cadastrar Configurações Operacionais Básicas
    const { error: settingsError } = await supabaseAdmin
      .from('company_settings')
      .insert({
        company_id: company.id,
        company_name: companyName,
        opening_time: '08:00',
        closing_time: '20:00',
        interval_minutes: 30,
      })

    if (settingsError) {
      return NextResponse.json({ error: `Erro ao criar configurações: ${settingsError.message}` }, { status: 500 })
    }

    // 5. Provisionar Cliente no Gateway do Asaas
    let asaasCustomerId = null
    try {
      const asaasCustomer = await createAsaasCustomer({
        name: companyName,
        email: ownerEmail,
        cpfCnpj: '00000000000191', // CNPJ de testes padrão válido para o Sandbox do Asaas passar
      })
      asaasCustomerId = asaasCustomer.id

      // Atualiza o ID do cliente na tabela de empresas
      await supabaseAdmin
        .from('companies')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', company.id)
    } catch (asaasErr: any) {
      return NextResponse.json({ error: `Falha no Asaas (Customer): ${asaasErr.message}` }, { status: 500 })
    }

    // 6. Provisionar Assinatura Recorrente no Asaas
    let asaasSubscriptionId = null
    const now = new Date()
    const nextDueDate = new Date(now)
    const daysToAdd = Number(trialDays || 14)
    
    nextDueDate.setDate(nextDueDate.getDate() + (daysToAdd > 0 ? daysToAdd : 1))

    try {
      const asaasSub = await createAsaasSubscription({
        customer: asaasCustomerId,
        billingType: 'UNDEFINED',
        value: plan.price,
        nextDueDate: nextDueDate.toISOString().split('T')[0],
        cycle: 'MONTHLY',
        description: `Plano ${plan.name} - Assinatura Barber SaaS`,
      })
      asaasSubscriptionId = asaasSub.id
    } catch (asaasErr: any) {
      return NextResponse.json({ error: `Falha no Asaas (Subscription): ${asaasErr.message}` }, { status: 500 })
    }

    // 7. Cadastrar Assinatura no Banco de Dados Vinculada ao Asaas
    const trialEndDate = new Date(now)
    trialEndDate.setDate(trialEndDate.getDate() + daysToAdd)

    const { error: subscriptionError } = await supabaseAdmin
      .from('company_subscriptions')
      .insert({
        company_id: company.id,
        plan_id: planId,
        status: daysToAdd > 0 ? 'trial' : 'active',
        trial_ends_at: daysToAdd > 0 ? trialEndDate.toISOString() : null,
        subscription_starts_at: now.toISOString(),
        subscription_ends_at: trialEndDate.toISOString(),
        asaas_subscription_id: asaasSubscriptionId,
      })

    if (subscriptionError) {
      return NextResponse.json({ error: `Erro ao registrar assinatura local: ${subscriptionError.message}` }, { status: 500 })
    }

    // 8. Invocar a Edge Function para geração do link de convite seguro
    const { data: ownerData } = await supabaseAdmin.functions.invoke('create-company-owner', {
      body: {
        companyId: company.id,
        companyName,
        ownerEmail,
      },
    })

    return NextResponse.json({
      success: true,
      action_link: ownerData?.action_link || null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}