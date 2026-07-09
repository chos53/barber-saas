'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieBanner() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Verifica se o usuário já aceitou os cookies anteriormente
    const cookieConsent = localStorage.getItem('salonix_cookie_consent');
    if (!cookieConsent) {
      setIsOpen(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('salonix_cookie_consent', 'accepted');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md bg-zinc-900/95 border border-amber-500/30 backdrop-blur-md p-6 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="space-y-4">
        <h4 className="text-white font-bold text-base flex items-center gap-2">
          🍪 Controle de Privacidade (LGPD)
        </h4>
        <p className="text-zinc-400 text-sm leading-relaxed">
          O Salonix utiliza cookies para garantir a melhor experiência na nossa plataforma, analisar o tráfego do site e personalizar anúncios. Ao clicar em "Aceitar", você concorda com a nossa{" "}
          <Link href="/privacidade" className="text-amber-500 hover:underline">
            Política de Privacidade
          </Link>.
        </p>
        <div className="flex gap-3 justify-end pt-2">
          <Link 
            href="/privacidade" 
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Configurar
          </Link>
          <button
            onClick={acceptCookies}
            className="bg-gradient-to-r from-amber-500 to-yellow-600 text-black px-5 py-2 rounded-xl text-xs font-bold hover:scale-[1.02] transition-transform shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          >
            Aceitar Todos
          </button>
        </div>
      </div>
    </div>
  );
}