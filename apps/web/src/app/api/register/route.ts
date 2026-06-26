import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { companyName, email, password } = await request.json()

    // Cliente Admin para TODAS as operações
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Criar usuário (o service_role ignora o rate limit de e-mail e RLS)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirma o e-mail
    })
    
    if (authError) throw new Error(`Auth Error: ${authError.message}`)

    // 2. Criar empresa - Gerando o slug automaticamente

    const slug = `${companyName.toLowerCase().replace(/ /g, '-')}-${Math.floor(Math.random() * 10000)}`

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: companyName,
        slug: slug // Adicionamos o slug gerado aqui!
      })
      .select()
      .single()
    
    if (companyError) {
      console.error('ERRO DETALHADO NO BANCO:', companyError);
      throw new Error(`Company Error: ${companyError.message}`);
    }

    // 3. Vincular perfil
    await supabaseAdmin.from('profiles').insert({
      id: authData.user!.id,
      company_id: company.id,
    })

    // 4. Criar settings
    await supabaseAdmin.from('company_settings').insert({
      company_id: company.id,
      company_name: companyName,
    })

    // 5. Iniciar Trial
    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + 14)
    await supabaseAdmin.from('company_subscriptions').insert({
      company_id: company.id,
      status: 'trial',
      trial_ends_at: trialEndDate.toISOString(),
    })

    return NextResponse.json({ success: true })
    
  } catch (err: any) {
    console.error('ERRO DETALHADO:', err.message)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}