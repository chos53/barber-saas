import type { Metadata } from "next";
import "@/app/globals.css"; // ajuste o caminho do seu css global se for diferente (ex: ../globals.css)
import CookieBanner from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "Salonix - Gestão Premium para Salões e Barbearias",
  description: "Eleve o nível do seu negócio com agendamento inteligente e controle financeiro.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
        
      
      </body>
    </html>
  );
}