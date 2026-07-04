import { NextResponse } from 'next/server'
import { requireMasterUser } from '@/lib/auth/master'
import { getAsaasCustomerPayments } from '@/lib/asaas'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const auth = await requireMasterUser(req)
    if (!auth.ok) return auth.response

    const supabaseAdmin = createSupabaseAdminClient()
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'ID da empresa ausente.' }, { status: 400 })
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('asaas_customer_id, name')
      .eq('id', companyId)
      .single()

    if (companyError || !company?.asaas_customer_id) {
      return NextResponse.json(
        { error: 'Esta empresa não possui um ID de cliente Asaas vinculado.' },
        { status: 404 }
      )
    }

    const paymentsData = await getAsaasCustomerPayments(company.asaas_customer_id)

    return NextResponse.json({
      companyName: company.name,
      invoices: paymentsData.data || [],
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
