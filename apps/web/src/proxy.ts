import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 1. Inicializar o cliente do Supabase específico para o Middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  // 2. Recuperar o utilizador da sessão de forma segura (Server-side)
  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  // 3. Proteção das rotas do Dashboard (/dashboard/*)
  if (url.pathname.startsWith("/dashboard")) {
    if (!user) {
      // Se não estiver logado, redireciona para o login
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }
  }

  // 4. Proteção das rotas Master de administração (/master/*)
  if (url.pathname.startsWith("/master")) {
    if (!user) {
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }

    // Buscar a role do perfil direto no banco para validação rigorosa
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "master") {
      // Se não for master, barra o acesso e joga para o dashboard comum
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  }

  return response
}

// 5. Definir em quais rotas o Middleware deve rodar (Matcher)
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/master/:path*"
  ],
}