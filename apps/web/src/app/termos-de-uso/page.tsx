import Link from "next/link";

export default function TermosUsoPage() {
  return (
    <main className="bg-black min-h-screen text-zinc-300 py-16 px-4 font-sans">
      <div className="max-w-3xl mx-auto">
        
        {/* Botão de Voltar */}
        <Link 
          href="/" 
          className="text-amber-500 hover:text-amber-400 transition-colors text-sm font-medium inline-flex items-center gap-2 mb-8 group"
        >
          <span className="transform group-hover:-translate-x-1 transition-transform">&larr;</span> 
          Voltar para a Home
        </Link>
        
        {/* Conteúdo dos Termos */}
        <article className="space-y-6 text-zinc-400 leading-relaxed text-base">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2 font-serif">
            Termos de Serviço
          </h1>
          <p className="text-sm text-zinc-500 mb-8">
            Última atualização: 12 de Julho de 2026.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">
            1. Termos
          </h2>
          <p>
            Ao acessar ao site <strong className="text-white">SALONIX</strong>, concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis ​​e concorda que é responsável pelo cumprimento de todas as leis locais aplicáveis. Se você não concordar com algum desses termos, está proibido de usar ou acessar este site. Os materiais contidos neste site são protegidos pelas leis de direitos autorais e marcas comerciais aplicáveis.
          </p>

          <hr className="border-zinc-900 my-8" />

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">
            2. Uso de Licença
          </h2>
          <p>
            É concedida permission para baixar temporariamente uma cópia dos materiais (informações ou software) no site SALONIX, apenas para visualização transitória pessoal e não comercial. Esta é a concessão de uma licença, não uma transferência de título e, sob esta licença, você não pode:
          </p>

          <ul className="list-none space-y-2 pl-0 my-4 text-zinc-400">
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span>Modificar ou copiar os materiais;</span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span>Usar os materiais para qualquer finalidade comercial ou para exibição pública (comercial ou não comercial);</span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span>Tentar descompilar ou fazer engenharia reversa de qualquer software contido no site SALONIX;</span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span>Remover quaisquer direitos autorais ou outras notações de propriedade dos materiais; ou</span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span>Transferir os materiais para outra pessoa ou "espelhar" os materiais em qualquer outro servidor.</span>
            </li>
          </ul>

          <p>
            Esta licença será automaticamente rescindida se você violar alguma dessas restrições e poderá ser rescindida por SALONIX a qualquer momento. Ao encerrar a visualização desses materiais ou após o término desta licença, você deve apagar todos os materiais baixados em sua posse, seja em formato eletrônico ou impresso.
          </p>

          <hr className="border-zinc-900 my-8" />

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">
            3. Isenção de responsabilidade
          </h2>
          <p>
            Os materiais no site da SALONIX são fornecidos &quot;como estão&quot;. SALONIX não oferece garantias, expressas ou implícitas, e, por este meio, isenta e nega todas as outras garantias, incluindo, sem limitação, garantias implícitas ou condições de comercialização, adequação a um fim específico ou não violação de propriedade intelectual ou outra violação de direitos.
          </p>
          <p>
            Além disso, o SALONIX não garante ou faz qualquer representação relativa à precisão, aos resultados prováveis ​​ou à confiabilidade do uso dos materiais em seu site ou de outra forma relacionado a esses materiais ou em sites vinculados a este site.
          </p>

          <hr className="border-zinc-900 my-8" />

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">
            4. Limitações
          </h2>
          <p>
            Em nenhum caso o SALONIX ou seus fornecedores serão responsáveis ​​por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro ou devido a interrupção dos negócios) decorrentes do uso ou da incapacidade de usar os materiais em SALONIX, mesmo que SALONIX ou um representative autorizado da SALONIX tenha sido notificado oralmente ou por escrito da possibilidade de tais danos. Como algumas jurisdições não permitem limitações em garantias implícitas, ou limitações de responsabilidade por danos conseqüentes ou incidentais, essas limitações podem não se aplicar a você.
          </p>

          <hr className="border-zinc-900 my-8" />

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">
            5. Precisão dos materiais
          </h2>
          <p>
            Os materiais exibidos no site da SALONIX podem incluir erros técnicos, tipográficos ou fotográficos. SALONIX não garante que qualquer material em seu site seja preciso, completo ou atual. SALONIX pode fazer alterações nos materiais contidos em seu site a qualquer momento, sem aviso prévio. No entanto, SALONIX não se compromete a atualizar os materiais.
          </p>

          <hr className="border-zinc-900 my-8" />

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">
            6. Links
          </h2>
          <p>
            O SALONIX não analisou todos os sites vinculados ao seu site e não é responsável pelo conteúdo de nenhum site vinculado. A inclusão de qualquer link não implica endosso por SALONIX do site. O uso de qualquer site vinculado é por conta e risco do usuário.
          </p>

          <hr className="border-zinc-900 my-8" />

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">
            Modificações
          </h2>
          <p>
            O SALONIX pode revisar estes termos de serviço do site a qualquer momento, sem aviso prévio. Ao usar este site, você concorda em ficar vinculado à versão atual desses termos de serviço.
          </p>

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">
            Lei aplicável
          </h2>
          <p>
            Estes termos e condições são regidos e interpretados de acordo com as leis do SALONIX e você se submete irrevogavelmente à jurisdição exclusiva dos tribunais naquele estado ou localidade.
          </p>
        </article>

      </div>
    </main>
  );
}