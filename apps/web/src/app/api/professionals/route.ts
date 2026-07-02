// 1. Busque a assinatura atual da empresa que está tentando cadastrar
const { data: sub } = await supabase
  .from('company_subscriptions')
  .select('status, trial_ends_at, saas_plans(*)')
  .eq('company_id', companyId)
  .single();

// 2. Calcule o status real baseado na data atual (Garante bloqueio se o trial expirou)
const hoje = new Date();
const trialExpirou = sub?.status === 'trial' && sub.trial_ends_at && new Date(sub.trial_ends_at) < hoje;
const statusEfetivo = trialExpirou ? 'expired' : sub?.status;

// 3. Se a assinatura estiver expirada, suspensa ou cancelada, bloqueia imediatamente
if (statusEfetivo === 'expired' || statusEfetivo === 'suspended' || statusEfetivo === 'cancelled') {
  return Response.json({ 
    error: "Sua assinatura não está ativa. Regularize seu plano no painel para gerenciar profissionais." 
  }, { status: 403 });
}

// 4. Defina os limites do plano contratado de forma dinâmica
// Se estiver em um trial válido (dentro do prazo), o limite é o bônus liberado (ex: 999), senão aplica o limite do plano real
const maxProfissionaisPermitidos = statusEfetivo === 'trial' 
  ? 999 
  : (sub?.saas_plans?.max_professionals || 3); // Fallback para 3 caso não encontre

// 5. Conte quantos profissionais ATIVOS a barbearia já possui cadastrados hoje
const { count: totalAtivos } = await supabase
  .from('professionals')
  .select('*', { count: 'exact', head: true })
  .eq('company_id', companyId)
  .eq('active', true);

// 6. A TRAVA DO DOWNGRADE:
// Se após o downgrade ele já tiver 5 ativos, e o limite do plano Starter for 3,
// o totalAtivos (5) é MAIOR ou IGUAL ao limite (3). Bloqueia o novo cadastro!
if (totalAtivos >= maxProfissionaisPermitidos) {
  return Response.json({ 
    error: `Seu plano atual permite apenas ${maxProfissionaisPermitidos} profissionais ativos, mas você possui ${totalAtivos}. Desative os excedentes para poder adicionar um novo.` 
  }, { status: 403 });
}

// 7. SE PASSAR DA TRAVA, CONTINUA O CADASTRO NORMALMENTE...
// const { data, error } = await supabase.from('professionals').insert(...)