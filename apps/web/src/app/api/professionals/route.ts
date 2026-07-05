import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    // Extrai o companyId enviado no corpo da requisição do front-end
    const body = await req.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json({ error: 'Empresa não informada.' }, { status: 400 })
    }

    // 1. Busque a assinatura atual da empresa que está tentando cadastrar
    const { data: sub } = await supabase
      .from('company_subscriptions')
      .select('status, trial_ends_at, saas_plans(*)')
      .eq('company_id', companyId)
      .maybeSingle() // Alterado para evitar estouro caso não encontre de primeira

    // 2. Calcule o status real baseado na data atual (Garante bloqueio se o trial expirou)
    const hoje = new Date()
    const trialExpirou = sub?.status === 'trial' && sub.trial_ends_at && new Date(sub.trial_ends_at) < hoje
    const statusEfetivo = trialExpirou ? 'expired' : sub?.status

    // 3. Se a assinatura estiver expirada, suspensa ou cancelada, bloqueia imediatamente
    if (statusEfetivo === 'expired' || statusEfetivo === 'suspended' || statusEfetivo === 'cancelled') {
      return NextResponse.json({ 
        error: "Sua assinatura não está ativa. Regularize seu plano no painel para gerenciar profissionais." 
      }, { status: 403 })
    }

    // 4. Defina os limites do plano contratado de forma dinâmica
    const maxProfissionaisPermitidos = statusEfetivo === 'trial' 
      ? 999 
      : (sub?.saas_plans?.max_professionals || 3)

    // 5. Conte quantos profissionais ATIVOS a barbearia já possui cadastrados hoje
    const { count: totalAtivos } = await supabase
      .from('professionals')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('active', true)

    // 6. A TRAVA DO DOWNGRADE:
    if (totalAtivos && totalAtivos >= maxProfissionaisPermitidos) {
      return NextResponse.json({ 
        error: `Seu plano atual permite apenas ${maxProfissionaisPermitidos} profissionais ativos, mas você possui ${totalAtivos}. Desative os excedentes para poder adicionar um novo.` 
      }, { status: 403 })
    }

    // 7. SE PASSAR DA TRAVA, RETORNA STATUS OK PARA CONTINUAR NO FRONT
    return NextResponse.json({ allowed: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro interno no servidor.' }, { status: 500 })
  }
}