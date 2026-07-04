import { NextResponse } from 'next/server'

export const ASAAS_WEBHOOK_AUTH_HEADER = 'asaas-access-token'

export function validateAsaasWebhookRequest(
  req: Request
): NextResponse | null {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN

  if (!expectedToken) {
    console.error(
      '[Webhook Asaas] ASAAS_WEBHOOK_TOKEN não configurado no servidor.'
    )
    return NextResponse.json(
      { error: 'Webhook não configurado.' },
      { status: 503 }
    )
  }

  const receivedToken = req.headers.get(ASAAS_WEBHOOK_AUTH_HEADER)

  if (!receivedToken || receivedToken !== expectedToken) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  return null
}
