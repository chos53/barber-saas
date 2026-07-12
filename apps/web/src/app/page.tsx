'use client';
import CookieBanner from "@/components/CookieBanner";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from 'react';
import { ArrowRight, Calendar, DollarSign, BarChart3, Check, Star, Users, Sparkles } from "lucide-react";
import { supabase } from '@/lib/supabase';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const faqItems = [
  {
    q: "O Salonix serve para qualquer tamanho de salão ou barbearia?",
    a: "Sim! O sistema atende perfeitamente desde profissionais autônomos que trabalham sozinhos até grandes redes de salões com múltiplos colaboradores e unidades."
  },
  {
    q: "Os clientes precisam baixar algum aplicativo para agendar?",
    a: "Não. O seu link de agendamento é 100% online e abre direto no navegador do celular ou computador do cliente, tornando o processo rápido e sem fricção."
  },
  {
    q: "Como funciona o disparo de mensagens por WhatsApp?",
    a: "O sistema se integra via Evolution API para enviar lembretes automáticos de horários, confirmações e mensagens de retorno, reduzindo os esquecimentos em até 80%."
  },
  {
    q: "Posso testar o sistema gratuitamente antes de pagar?",
    a: "Com certeza! Todos os nossos planos possuem um período de teste gratuito para você configurar o seu espaço e ver a mágica acontecer na prática."
  },
  {
    q: "O módulo financeiro emite relatórios de comissão?",
    a: "Sim. O Salonix calcula automaticamente as comissões dos seus profissionais com base nos serviços realizados, separando os valores de forma simples e precisa."
  },
  {
    q: "O agendamento consome internet ou funciona offline?",
    a: "Por ser um sistema em nuvem moderno (SaaS), o Salonix exige conexão com a internet para manter sua agenda atualizada em tempo real em todos os dispositivos."
  },
  {
    q: "Existe alguma taxa de fidelidade ou multa de cancelamento?",
    a: "Nenhuma. Os planos são de assinatura mensal ou anual livre de contratos. Você pode fazer o upgrade, downgrade ou cancelar o serviço quando quiser."
  },
  {
    q: "O suporte técnico está incluso na mensalidade?",
    a: "Sim, o suporte está totalmente incluso. Nos planos Pro e Premium, você conta com atendimento prioritário e suporte direto via WhatsApp para resolver qualquer dúvida rapidamente."
  },
  {
    q: "Consigo controlar o estoque de produtos vendidos pelo sistema?",
    a: "Sim. O sistema possui um módulo completo de comandas e vendas externas que dá baixa automática no estoque dos produtos sempre que um item for vendido."
  },
  {
    q: "Meus dados e os dados dos meus clientes estão seguros?",
    a: "Totalmente seguros. Utilizamos a infraestrutura criptografada do Supabase e servidores de ponta com rotinas diárias de backup para garantir o sigilo absoluto das suas informações."
  }
];

export default function LandingPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  
  const [plans, setPlans] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    hero_title: 'Gestão premium para Salões e Barbearias',
    hero_subtitle: 'Eleve o nível do seu negócio. Agendamento inteligente, controle financeiro absoluto e cálculo automático de comissões em uma plataforma desenhada para a excelência.',
    cta_text: 'Começar Teste Grátis',
    cta_link: '/register',
    hero_image_url: '',
    benefits: [],
    testimonials: [],
    social_links: [] // Nova lista dinâmica vinda da tabela 'landing_settings'
  });

  useEffect(() => {
    async function fetchData() {
      const { data: plansData } = await supabase
        .from('saas_plans')
        .select('*')
        .eq('active', true)
        .order('price', { ascending: true });
      
      if (plansData) setPlans(plansData);

      const { data: settingsData } = await supabase
        .from('landing_settings')
        .select('*')
        .eq('id', 'default')
        .single();
      
      if (settingsData) {
        setSettings({
          hero_title: settingsData.hero_title || 'Gestão premium para Salões e Barbearias',
          hero_subtitle: settingsData.hero_subtitle || 'Eleve o nível do seu negócio.',
          cta_text: settingsData.cta_text || 'Começar Teste Grátis',
          cta_link: settingsData.cta_link || '/register',
          hero_image_url: settingsData.hero_image_url || '',
          benefits: settingsData.benefits || [],
          testimonials: settingsData.testimonials || [],
          social_links: settingsData.social_links || [] // Mapeia os links criados no master
        });
      }
    }

    fetchData();
  }, []);

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
            <a href="#beneficios" className="hover:text-amber-500 transition-colors">Benefícios</a>
            <a href="#funcionalidades" className="hover:text-amber-500 transition-colors">Funcionalidades</a>
            <a href="#depoimentos" className="hover:text-amber-500 transition-colors">Depoimentos</a>
            <a href="#planos" className="hover:text-amber-500 transition-colors">Planos</a>
            <a href="#faq" className="hover:text-amber-500 transition-colors">FAQ</a>
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

          <div className="relative mt-20 max-w-5xl mx-auto rounded-xl border border-amber-500/30 bg-zinc-900/50 p-2 md:p-4 shadow-[0_0_50px_rgba(242,202,80,0.05)] backdrop-blur-sm">
            <div className="aspect-video bg-zinc-950 rounded-lg border border-amber-500/20 flex items-center justify-center overflow-hidden relative">
              {settings.hero_image_url ? (
                <Image src={settings.hero_image_url} alt="Dashboard Principal Salonix" fill className="object-cover" priority />
              ) : (
                <div className="text-zinc-600 flex flex-col items-center gap-3">
                  <BarChart3 className="h-12 w-12 text-zinc-700 animate-pulse" />
                  <p className="text-sm font-medium">Faça o upload do print principal do sistema no painel master</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SEÇÃO DE BENEFÍCIOS */}
        <section id="beneficios" className="py-24 bg-zinc-950 border-t border-zinc-900">
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
                    <div className="flex-1 space-y-6">
                      <div className="bg-amber-500/10 border border-amber-500/20 w-12 h-12 rounded-xl flex items-center justify-center">
                        {i === 0 ? <Calendar className="h-6 w-6 text-amber-500" /> : i === 1 ? <DollarSign className="h-6 w-6 text-amber-500" /> : <Users className="h-6 w-6 text-amber-500" />}
                      </div>
                      <h3 className="text-3xl font-extrabold text-white tracking-tight">{benefit.title}</h3>
                      <p className="text-zinc-400 text-lg leading-relaxed">{benefit.description}</p>
                    </div>

                    <div className="flex-1 w-full aspect-square bg-zinc-900 rounded-3xl border border-amber-500/30 overflow-hidden relative shadow-[0_0_30px_rgba(242,202,80,0.05)] group hover:border-amber-500/60 transition-colors">
                      {benefit.image_url ? (
                        <Image src={benefit.image_url} alt={benefit.title} fill className="object-cover p-3 rounded-3xl group-hover:scale-[1.02] transition-transform duration-500" />
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

        {/* SEÇÃO DEPOIMENTOS */}
        <section id="depoimentos" className="py-24 bg-zinc-900/30 border-y border-zinc-900">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">Provado e aprovado por especialistas</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {displayTestimonials.map((depoimento: any, i: number) => (
                <div key={i} className="bg-zinc-950 border border-amber-500/30 p-8 rounded-2xl flex flex-col justify-between relative shadow-[0_0_30px_rgba(242,202,80,0.02)] transition-colors hover:border-amber-500/50">
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
              {plans.map((plan, index) => {
                const isPopular = index === 1; 
                return (
                  <div key={plan.id} className={`w-full md:w-[350px] flex flex-col p-8 rounded-3xl relative ${isPopular ? 'bg-zinc-900 border border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.2)] transform md:-translate-y-4' : 'bg-zinc-900/40 border border-zinc-800'}`}>
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
              })}
            </div>
          </div>
        </section>

        {/* ================= SEÇÃO DE FAQ ================= */}
        <section id="faq" className="bg-zinc-950 py-24 border-t border-zinc-900">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight font-serif">
                Perguntas Frequentes
              </h2>
              <p className="text-zinc-400 mt-3 text-sm md:text-base">
                Tire suas dúvidas sobre o funcionamento, recursos e planos do Salonix.
              </p>
            </div>

            <div className="space-y-4">
              {faqItems.map((item, idx) => (
                <div key={idx} className="bg-black border border-zinc-900 rounded-xl overflow-hidden transition-all duration-200">
                  <button
                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                    className="w-full flex justify-between items-center p-5 text-left text-white font-medium hover:bg-zinc-900/40 transition-colors"
                  >
                    <span className="pr-4 text-sm md:text-base">{item.q}</span>
                    <span className={`text-amber-500 text-xl transform transition-transform duration-200 ${openFaqIndex === idx ? 'rotate-45' : ''}`}>
                      ＋
                    </span>
                  </button>
                  <div className={`transition-all duration-300 ease-in-out overflow-hidden ${openFaqIndex === idx ? 'max-h-40 border-t border-zinc-900/60' : 'max-h-0'}`}>
                    <p className="p-5 text-zinc-400 text-sm leading-relaxed">{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ================= RODAPÉ (FOOTER) ================= */}
      <footer className="bg-black py-12 border-t border-zinc-900 text-zinc-400 text-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Coluna 1: Logo, Direitos e Redes Sociais Dinâmicas */}
            <div className="flex flex-col gap-2">
              <span className="text-xl font-bold text-white tracking-wider font-serif">
                SALONIX
              </span>
              <p className="text-xs text-zinc-500">
                &copy; {new Date().getFullYear()} Salonix. Todos os direitos reservados.
              </p>
              
              {/* Bloco de Redes Sociais - Otimizado para ícones maiores */}
              {settings.social_links && settings.social_links.length > 0 && (

                <div className="flex gap-4 mt-6">

                  {settings.social_links.map((social: any, idx: number) => (

                    <a 
                      key={idx}
                      href={social.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:border-amber-500 hover:scale-110 transition-all duration-300 group overflow-hidden"
                    >
                      {social.image_url ? (
                        <div className="relative w-full h-full p-1">
                          <Image
                            src={social.image_url}
                            alt="Rede Social"
                            fill
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <span className="text-[9px] text-zinc-600">Link</span>
                      )}
                
                    </a>

                  ))}

                </div>

              )}
        
        
            </div>

            {/* Coluna 2: Navegação Interna */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                Navegação
              </span>
              <ul className="space-y-2 text-sm flex flex-col">
                <a href="#beneficios" className="hover:text-amber-500 transition-colors w-fit">Benefícios</a>
                <a href="#funcionalidades" className="hover:text-amber-500 transition-colors w-fit">Funcionalidades</a>
                <a href="#planos" className="hover:text-amber-500 transition-colors w-fit">Planos</a>
                <a href="#depoimentos" className="hover:text-amber-500 transition-colors w-fit">Depoimentos</a>
                <a href="#faq" className="hover:text-amber-500 transition-colors w-fit">FAQ</a>
              </ul>
            </div>

            {/* Coluna 3: Documentos Legais */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                Legal
              </span>
              <ul className="space-y-2 text-sm flex flex-col">
                <Link href="/politica-de-privacidade" className="hover:text-amber-500 transition-colors w-fit">
                  Política de Privacidade
                </Link>
                <Link href="/termos-de-uso" className="hover:text-amber-500 transition-colors w-fit">
                  Termos de Uso
                </Link>
              </ul>
            </div>
          </div>
        </div>
      </footer>
 
      <CookieBanner />
    </div>
  );
}