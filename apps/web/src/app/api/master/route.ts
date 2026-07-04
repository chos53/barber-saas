import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    // 1. Capturar o token JWT do cabeçalho de autorização
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Não autorizado. Token em falta." }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]

    // 2. Validar a sessão com o Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 })
    }

    // 3. Validação Server-Side (Nunca confiar apenas no Front-end)
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile || profile.role !== "master") {
      return NextResponse.json({ error: "Acesso negado. Requer nível Master." }, { status: 403 })
    }

    // Se passou em todas as checagens, o acesso é libertado
    return NextResponse.json({ message: "Sessão Master validada com sucesso no servidor." })

  } catch (error) {
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 })
  }
}