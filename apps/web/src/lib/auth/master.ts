import { createClient, type User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export function getMasterEmails(): string[] {
  const configured =
    process.env.MASTER_EMAILS || 'caheolsa@yahoo.com.br'

  return configured
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isMasterEmail(email: string | null | undefined): boolean {
  if (!email) return false

  return getMasterEmails().includes(email.trim().toLowerCase())
}

type MasterAuthSuccess = {
  ok: true
  user: User
}

type MasterAuthFailure = {
  ok: false
  response: NextResponse
}

async function resolveAuthenticatedUser(req?: Request): Promise<User | null> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) return user
  } catch {
    // Cliente browser pode persistir sessão em localStorage; tenta Bearer token.
  }

  if (!req) return null

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null

  if (!token) return null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) return null

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) return null

  return user
}

export async function requireMasterUser(
  req?: Request
): Promise<MasterAuthSuccess | MasterAuthFailure> {
  try {
    const user = await resolveAuthenticatedUser(req)

    if (!user) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Não autenticado.' },
          { status: 401 }
        ),
      }
    }

    if (!isMasterEmail(user.email)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Acesso negado.' },
          { status: 403 }
        ),
      }
    }

    return { ok: true, user }
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Falha ao validar sessão.' },
        { status: 500 }
      ),
    }
  }
}
