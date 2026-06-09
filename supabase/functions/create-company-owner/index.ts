import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido.' }), {
        status: 405,
        headers: corsHeaders,
      })
    }

    const body = await req.json()

    const companyId = body.company_id || body.companyId
    const email = body.email || body.ownerEmail

    if (!companyId || !email) {
      return new Response(
        JSON.stringify({ error: 'company_id e email são obrigatórios.' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Variáveis de ambiente não configuradas.' }),
        { status: 500, headers: corsHeaders }
      )
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: userResult, error: userError } =
      await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      })

    if (userError) {
      return new Response(JSON.stringify({ error: userError.message }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const userId = userResult.user?.id

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Usuário não foi criado.' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const { error: profileError } = await admin.from('profiles').upsert({
      id: userId,
      company_id: companyId,
      role: 'owner',
      email,
    })

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const { data: resetData, error: resetError } =
      await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
      })

    if (resetError) {
      return new Response(JSON.stringify({ error: resetError.message }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        action_link: resetData.properties?.action_link,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro inesperado.',
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})