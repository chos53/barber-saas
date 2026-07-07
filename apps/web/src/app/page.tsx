import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, DollarSign, BarChart3, Check, Star, Users, Sparkles } from "lucide-react";
import { supabase } from '@/lib/supabase';
export const revalidate = 10;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default async function LandingPage() {
  const { data: plans } = await supabase
    .from('saas_plans')
    .select('*')
    .eq('active', true)
    .order('price', { ascending: true });

  const { data: settingsData } = await supabase
    .from('landing_settings')
    .select('*')
    .eq('id', 'default')
    .single();

  const settings = settingsData || {
    hero_title: 'Gestão premium para Salões e Barbearias',
    hero_subtitle: 'Eleve o nível do seu negócio. Agendamento inteligente, controle financeiro absoluto e cálculo automático de comissões em uma plataforma desenhada para a excelência.',
    cta_text: 'Começar Teste Grátis',
    cta_link: '/register',
    hero_image_url: '',
    benefits: [],
    testimonials: []
  };

  const displayBenefits = settings.benefits && settings.benefits.length > 0 ? settings.benefits : [
    { title: "Agenda Inteligente", description: "Agendamentos online 24h. Envie lembretes automáticos pelo WhatsApp e reduza as faltas em até 80%.", image_url: "" },
    { title: "Comissões Automáticas", description: "Feche o caixa e pague sua equipe em segundos. Regras personalizadas por profissional e por serviço.", image_url: "" },
    { title: "Gestão de Clientes", description: "Histórico completo, serviços mais realizados e aniversários. Fidelize seus clientes com um atendimento VIP.", image_url: "" }
  ];

  const displayTestimonials = settings.testimonials && settings.testimonials.length > 0 ? settings.testimonials : [
    { name: "Carlos Eduardo", role: "Dono de Barbearia", text: "Antes do Salonix, fechamento de mês era um pesadelo de planilhas. Hoje, em dois cliques eu sei o lucro exato e a comissão de cada barbeiro.", image_url: "" },
    { name: "Juliana Mendes", role: "Proprietária de Salão", text: "A facilidade das clientes agendarem sozinhas pelo link do Instagram mudou nosso fluxo. A agenda está sempre cheia e organizada.", image_url: "" },
    { name: "Roberto Alves", role: "Barbeiro Autônomo", text: "O design do aplicativo é incrível, super moderno. Meus clientes acham o máximo receber o lembrete profissional no WhatsApp.", image_url: "" }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-50 selection:bg-amber-500/30">
      <header className="fixed top-0 w-full bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 z-50">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 rounded-lg overflow-hidden flex items-center justify-center bg-black">
              <Image src="/logo-salonix.png" alt="Salonix Logo" width={48} height={48} className="object-cover" />
            </div>
            <span className="font-serif text-2xl font-bold tracking-wider text-white">SALONIX</span>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-zinc-400">
            <Link href="#funcionalidades" className="hover:text-amber-500 transition-colors">Funcionalidades</Link>
            <Link href="#depoimentos" className="hover:text-amber-500 transition-colors">Depoimentos</Link>
            <Link href="#planos" className="hover:text-amber-500 transition-colors">Planos</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">Entrar</Link>
            <Link href={settings.cta_link} className="bg-gradient-to-r from-amber-500 to-yellow-600 text-black px-5 py-2.5 rounded-md text-sm font-bold hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              {settings.cta_text}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-20">
        {/* HERO SECTION */}
        <section className="relative container mx-auto px-4 py-24 md:py-32 text-center overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="relative z-10 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-amber-500 text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              <span>O sistema definitivo para a área da beleza</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">{settings.hero_title}</h1>
            <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">{settings.hero_subtitle}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href={settings.cta_link} className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-black px-8 py-4 rounded-full text-lg font-bold hover:scale-105 transition-transform shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                {settings.cta_text} <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
          
          {/* CONTAINER DA IMAGEM DO DASHBOARD PRINCIPAL (HERO) */}
          <div className="relative mt-20 max-w-5xl mx-auto rounded-xl border border-zinc-800 bg-zinc-900/50 p-2 md:p-4 shadow-2xl backdrop-blur-sm">
            <div className="aspect-video bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-center overflow-hidden relative">
              {settings.hero_image_url ? (
                <Image 
                  src={settings.hero_image_url} 
                  alt="Dashboard Principal Salonix" 
                  fill 
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="text-zinc-600 flex flex-col items-center gap-3">
                  <BarChart3 className="h-12 w-12 text-zinc-700 animate-pulse" />
                  <p className="text-sm font-medium">Faça o upload do print principal do sistema no painel master</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SEÇÃO DE BENEFÍCIOS ADAPTADA (ESTRUTURA EM DUAS COLUNAS CONFORME O GUIA) */}
        <section id="funcionalidades" className="py-24 bg-zinc-950 border-t border-zinc-900">
          <div className="container mx-auto px-4">
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Por que nossa solução é melhor?</h2>
              <p className="text-zinc-400 max-w-2xl mx-auto text-lg">Funcionalidades pensadas cirurgicamente para acabar com as maiores dores do seu salão ou barbearia.</p>
            </div>
            
            <div className="space-y-32 max-w-5xl mx-auto">
              {displayBenefits.map((benefit: any, i: number) => {
                const isEven = i % 2 === 0;
                return (
                  <div key={i} className={`flex flex-col md:flex-row gap-12 md:gap-20 items-center justify-between ${isEven ? '' : 'md:flex-row-reverse'}`}>
                    
                    {/* Bloco de Texto (Título e Descrição) */}
                    <div className="flex-1 space-y-6">
                      <div className="bg-amber-500/10 border border-amber-500/20 w-12 h-12 rounded-xl flex items-center justify-center">
                        {i === 0 ? <Calendar className="h-6 w-6 text-amber-500" /> : i === 1 ? <DollarSign className="h-6 w-6 text-amber-500" /> : <Users className="h-6 w-6 text-amber-500" />}
                      </div>
                      <h3 className="text-3xl font-extrabold text-white tracking-tight">{benefit.title}</h3>
                      <p className="text-zinc-400 text-lg leading-relaxed">{benefit.description}</p>
                    </div>

                    {/* Bloco da Imagem Quadrada Real do Sistema */}
                    <div className="flex-1 w-full aspect-square bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)] group hover:border-amber-500/30 transition-colors">
                      {benefit.image_url ? (
                        <Image 
                          src={benefit.image_url} 
                          alt={benefit.title} 
                          fill 
                          className="object-cover p-3 rounded-3xl group-hover:scale-[1.02] transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700 gap-2 bg-zinc-950/40">
                          <BarChart3 className="h-10 w-10" />
                          <p className="text-xs font-medium uppercase tracking-wider">Preview {benefit.title}</p>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SEÇÃO DEPOIMENTOS ATUALIZADA COM IMAGENS REALISTAS */}
        <section id="depoimentos" className="py-24 bg-zinc-900/30 border-y border-zinc-900">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">Provado e aprovado por especialistas</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {displayTestimonials.map((depoimento: any, i: number) => (
                <div key={i} className="bg-zinc-950 border border-zinc-800 p-8 rounded-2xl flex flex-col justify-between relative">
                  <div>
                    <div className="flex gap-1 mb-4">{[1,2,3,4,5].map(star => <Star key={star} className="h-4 w-4 fill-amber-500 text-amber-500" />)}</div>
                    <p className="text-zinc-300 mb-6 italic leading-relaxed">"{depoimento.text}"</p>
                  </div>
                  <div className="flex items-center gap-3 pt-4 border-t border-zinc-900">
                    {depoimento.image_url ? (
                      <div className="relative h-10 w-10 rounded-full overflow-hidden border border-zinc-700">
                        <Image src={depoimento.image_url} alt={depoimento.name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 text-sm font-bold flex-shrink-0">
                        {depoimento.name ? depoimento.name.charAt(0) : "C"}
                      </div>
                    )}
                    <div>
                      <h4 className="text-white font-semibold text-sm">{depoimento.name}</h4>
                      <p className="text-xs text-zinc-500">{depoimento.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PLANOS */}
        <section id="planos" className="py-24 bg-zinc-950">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Invista no crescimento do seu negócio</h2>
              <p className="text-zinc-400 max-w-2xl mx-auto text-lg">Comece grátis, sem cartão de crédito. Mude de plano quando precisar.</p>
            </div>

            <div className="flex flex-wrap justify-center gap-8 max-w-6xl mx-auto">
              {plans && plans.length > 0 ? (
                plans.map((plan, index) => {
                  const isPopular = index === 1; 
                  return (
                    <div key={plan.id} className={`w-full md:w-[350px] flex flex-col p-8 rounded-3xl relative ${isPopular ? 'bg-zinc-900 border-2 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.15)] transform md:-translate-y-4' : 'bg-zinc-900/40 border border-zinc-800'}`}>
                      {isPopular && (
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2"><span className="bg-amber-500 text-black text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-full">Mais Escolhido</span></div>
                      )}
                      <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                      <div className="mb-6 mt-4">
                        <span className="text-4xl font-extrabold text-white">{formatCurrency(plan.price)}</span><span className="text-zinc-400">/mês</span>
                      </div>
                      <Link href={settings.cta_link} className={`w-full py-3 px-4 font-bold text-center rounded-xl transition-all mb-8 ${isPopular ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black hover:opacity-90' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}>
                        Testar {plan.name} Grátis
                      </Link>

                      <ul className="space-y-4 flex-1">
                        <li className="flex items-center gap-3 text-zinc-300">
                          <Check className="h-5 w-5 text-amber-500 flex-shrink-0" />
                          <span className="text-sm">Até {plan.max_users} usuários do sistema</span>
                        </li>
                        <li className="flex items-center gap-3 text-zinc-300">
                          <Check className="h-5 w-5 text-amber-500 flex-shrink-0" />
                          <span className="text-sm">Até {plan.max_professionals} profissionais na agenda</span>
                        </li>
                        <li className="flex items-center gap-3 text-zinc-300">
                          <Check className="h-5 w-5 text-amber-500 flex-shrink-0" />
                          <span className="text-sm">{plan.max_monthly_appointments === 0 ? 'Agendamentos ilimitados' : `Até ${plan.max_monthly_appointments} agendamentos/mês`}</span>
                        </li>
                        
                        {plan.features && plan.features.split(',').map((servico: string, i: number) => (
                          servico.trim() !== '' && (
                            <li key={i} className="flex items-center gap-3 text-zinc-300">
                              <Check className="h-5 w-5 text-amber-500 flex-shrink-0" />
                              <span className="text-sm">{servico.trim()}</span>
                            </li>
                          )
                        ))}
                      </ul>
                    </div>
                  );
                })
              ) : (
                <p className="text-zinc-500">Nenhum plano ativo no momento.</p>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-black py-12 border-t border-zinc-900 text-zinc-500 text-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 font-serif font-bold text-xl text-white"><span className="text-amber-500">S</span>ALONIX</div>
          </div>
          <div className="mt-8 pt-8 border-t border-zinc-900 text-center"><p>© {new Date().getFullYear()} Salonix App. Todos os direitos reservados.</p></div>
        </div>
      </footer>
    </div>
  );
}