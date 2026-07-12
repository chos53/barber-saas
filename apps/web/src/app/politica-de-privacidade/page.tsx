import Link from "next/link";

export default function PoliticaPrivacidadePage() {
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
        
        {/* Conteúdo da Política */}
        <article className="space-y-6 text-zinc-400 leading-relaxed text-base">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2 font-serif">
            Política de Privacidade
          </h1>
          <p className="text-sm text-zinc-500 mb-8">
            Esta política é efetiva a partir de 12 de Julho de 2026.
          </p>

          <p>
            A sua privacidade é importante para nós. É política do <strong className="text-white">SALONIX</strong> respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site SALONIX, e outros sites que possuímos e operamos.
          </p>

          <p>
            Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.
          </p>

          <p>
            Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis ​​para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.
          </p>

          <p>
            Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei.
          </p>

          <p>
            O nosso site pode ter links para sites externos que não são operados por nós. Esteja ciente de que não temos controle sobre o conteúdo e práticas desses sites e não podemos aceitar responsabilidade por suas respectivas políticas de privacidade.
          </p>

          <p>
            Você é livre para recusar a nossa solicitação de informações pessoais, entendendo que talvez não possamos fornecer alguns dos serviços desejados.
          </p>

          <p>
            O uso continuado de nosso site será considerado como aceitação de nossas práticas em torno de privacidade e informações pessoais. Se você tiver alguma dúvida sobre como lidamos com dados do usuário e informações pessoais, entre em contacto connosco.
          </p>

          <hr className="border-zinc-900 my-8" />

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">
            Política de Cookies e Publicidade
          </h2>

          <p>
            O serviço Google AdSense que usamos para veicular publicidade usa um cookie DoubleClick para veicular anúncios mais relevantes em toda a Web e limitar o número de vezes que um determinado anúncio é exibido para você. Para mais informações sobre o Google AdSense, consulte as FAQs oficiais sobre privacidade do Google AdSense.
          </p>

          <p>
            Utilizamos anúncios para compensar os custos de funcionamento deste site e fornecer financiamento para futuros desenvolvimentos. Os cookies de publicidade comportamental usados ​​por este site foram projetados para garantir que você fornece os anúncios mais relevantes sempre que possível, rastreando anonimamente seus interesses e apresentando coisas semelhantes que possam ser do seu interesse.
          </p>

          <p>
            Vários parceiros anunciam em nosso nome e os cookies de rastreamento de afiliados simplesmente nos permitem ver se nossos clientes acessaram o site através de um dos sites de nossos parceiros, para que possamos creditá-los adequadamente e, quando aplicável, permitir que nossos parceiros afiliados ofereçam qualquer promoção que pode fornecê-lo para fazer uma compra.
          </p>

          <hr className="border-zinc-900 my-8" />

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">
            Compromisso do Usuário
          </h2>
          
          <p>
            O usuário se compromete a fazer uso adequado dos conteúdos e da informação que o SALONIX oferece no site e com caráter enunciativo, mas não limitativo:
          </p>

          <ul className="list-none space-y-3 pl-0 mt-4">
            <li className="flex gap-3">
              <span className="text-amber-500 font-bold">A)</span>
              <span>Não se envolver em atividades que sejam ilegais ou contrárias à boa fé e à ordem pública;</span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-500 font-bold">B)</span>
              <span>Não difundir propaganda ou conteúdo de natureza racista, xenofóbica, jogos de sorte ou azar, qualquer tipo de pornografia ilegal, de apologia ao terrorismo ou contra os direitos humanos;</span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-500 font-bold">C)</span>
              <span>Não causar danos aos sistemas físicos (hardwares) e lógicos (softwares) do SALONIX, de seus fornecedores ou terceiros, para introduzir ou disseminar vírus informáticos ou quaisquer outros sistemas de hardware ou software que sejam capazes de causar danos anteriormente mencionados.</span>
            </li>
          </ul>

          <hr className="border-zinc-900 my-8" />

          <h2 className="text-xl font-semibold text-white mt-8 mb-4">
            Mais informações
          </h2>
          
          <p>
            Esperamos que esteja esclarecido e, como mencionado anteriormente, se houver algo que você não tem certeza se precisa ou não, geralmente é mais seguro deixar os cookies ativados, caso interaja com um dei recursos que você usa em nosso site.
          </p>
        </article>

      </div>
    </main>
  );
}