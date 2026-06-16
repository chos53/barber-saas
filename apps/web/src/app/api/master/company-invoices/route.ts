// src/app/api/master/company-invoices/route.ts

import { NextResponse } from 'next/server'
import { getAsaasCustomerPayments } from '@/lib/asaas'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function GET(req: Request) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'ID da empresa ausente.' }, { status: 400 })
    }

    // Busca o asaas_customer_id direto da tabela companies
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('asaas_customer_id, name')
      .eq('id', companyId)
      .single()

    if (companyError || !company?.asaas_customer_id) {
      return NextResponse.json({ error: 'Esta empresa não possui um ID de cliente Asaas vinculado.' }, { status: 404 })
    }

    // Busca as cobranças reais direto na API do Asaas
    const paymentsData = await getAsaasCustomerPayments(company.asaas_customer_id)

    return NextResponse.json({
      companyName: company.name,
      invoices: paymentsData.data || [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}