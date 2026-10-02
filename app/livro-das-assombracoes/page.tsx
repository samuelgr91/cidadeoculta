import type { Metadata } from 'next';
import {
  ArrowRight,
  BookOpen,
  Check,
  Compass,
  Download,
  FileText,
  Landmark,
  Mail,
  MapPinned,
  MoonStar,
  ScrollText,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { BuyLink } from '@/components/cidade/tracking';
import { configuredEbookProduct } from '@/lib/ebook';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN || 'https://hiddenatlas.site'),
  title: 'Livro das Assombrações de Ouro Preto — Hidden Atlas',
  description: 'Sete histórias sombrias ligadas a lugares reais de Ouro Preto, com fontes, contexto histórico e um roteiro temático.',
  openGraph: {
    title: 'Livro das Assombrações de Ouro Preto',
    description: 'A cidade que você conhece termina onde estas histórias começam.',
    images: ['/media/ebook/livro-assombracoes-capa.webp'],
    locale: 'pt_BR',
    type: 'website',
  },
};

const stories = [
  ['01', 'As Vozes de Santa Efigênia', 'Lenda · tradição oral'],
  ['02', 'As Almas do Purgatório', 'Tradição oral'],
  ['03', 'A Cabeça que Sumiu da Praça', 'Versões disputadas'],
  ['04', 'Dossiê Vira-Saia', 'Documentado + tradição'],
  ['05', 'O Tesouro Guardado por Fantasmas', 'Lenda em dossiê'],
  ['06', 'A Cabaça que Buscava Cachaça', 'Tradição oral'],
  ['07', 'O Morro que o Governador Mandou Queimar', 'História documentada'],
] as const;

function Cta({ href, compact = false }: { href: string; compact?: boolean }) {
  return <BuyLink
    cityId="ebook-assombracoes"
    locale="pt-br"
    href={href}
    className={`ebook-cta${compact ? ' compact' : ''}`}
  >
    <span>{compact ? 'Comprar agora' : 'Comprar o e-book agora'}</span>
    <ArrowRight size={19} />
  </BuyLink>;
}

export default function EbookSalesPage() {
  const product = configuredEbookProduct();
  const checkoutUrl = product.checkoutUrl;
  const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.priceCents / 100);

  return <main className="ebook-sales">
    <header className="ebook-header">
      <a href="/pt-br/ouro-preto" className="ebook-brand" aria-label="Cidade Oculta">
        <Compass size={21} />
        <strong>Cidade Oculta</strong>
      </a>
      <nav aria-label="Navegação do livro">
        <a href="#sobre">Sobre</a>
        <a href="#capitulos">Capítulos</a>
        <a href="#detalhes">Detalhes</a>
      </nav>
      <Cta href={checkoutUrl} compact />
    </header>

    <div className="ebook-breadcrumb">
      <a href="/pt-br/ouro-preto">Cidade Oculta</a><span>/</span><span>Livros digitais</span><span>/</span><strong>Ouro Preto</strong>
    </div>

    <section className="ebook-product" aria-labelledby="ebook-title">
      <div className="ebook-gallery">
        <div className="ebook-cover-stage">
          <div className="ebook-moon" />
          <img src="/media/ebook/livro-assombracoes-capa.webp" alt="Capa do Livro das Assombrações de Ouro Preto" fetchPriority="high" />
          <div className="ebook-cover-shadow" />
        </div>
        <a className="ebook-preview-link" href="#por-dentro">
          <img src="/media/ebook/livro-assombracoes-aberto.webp" alt="Prévia das páginas internas do livro" />
          <span><BookOpen size={15} /> Ver o livro por dentro</span>
        </a>
      </div>

      <div className="ebook-product-copy">
        <p className="ebook-kicker"><MoonStar size={14} /> EDIÇÃO DIGITAL · OURO PRETO</p>
        <h1 id="ebook-title">Livro das Assombrações de Ouro Preto</h1>
        <p className="ebook-subtitle">Lendas, mistérios e histórias sombrias em lugares reais</p>
        <p className="ebook-byline">Uma edição <strong>Hidden Atlas</strong></p>

        <div className="ebook-facts" aria-label="Informações principais do livro">
          <span><strong>40</strong> páginas</span>
          <span><strong>7</strong> histórias</span>
          <span><strong>6</strong> lugares</span>
          <span><strong>PDF</strong> digital</span>
        </div>

        <p className="ebook-lead">Descubra o lado de Ouro Preto que não aparece nos cartões-postais: aparições, tesouros, punições e histórias preservadas entre igrejas, casarões e morros da cidade.</p>

        <div className="ebook-editor-note">
          <ShieldCheck size={20} />
          <p><strong>História e mistério sem confusão.</strong> Cada capítulo indica o que é documentado, tradição oral, lenda ou versão disputada.</p>
        </div>

        <div className="ebook-format">
          <p>Formato disponível</p>
          <div>
            <span className="selected"><FileText /><strong>E-book PDF</strong><small>Entrega por e-mail</small></span>
            <span><Smartphone /><strong>Leia onde quiser</strong><small>Celular, tablet ou computador</small></span>
          </div>
        </div>
      </div>

      <aside className="ebook-buybox" aria-label="Comprar o e-book">
        <p className="ebook-buybox-label">E-BOOK DIGITAL</p>
        <strong className="ebook-price">{price}</strong>
        <p className="ebook-once">Compra única · sem assinatura</p>
        <p className="ebook-ready"><i /> Disponível para entrega</p>
        <Cta href={checkoutUrl} />
        <p className="ebook-buybox-note">Você será direcionado ao checkout seguro da Kiwify.</p>
        <div className="ebook-delivery-list">
          <p><Mail /><span><strong>Receba no e-mail</strong><small>O PDF é enviado após a aprovação.</small></span></p>
          <p><Download /><span><strong>Arquivo completo</strong><small>Guarde e leia quando quiser.</small></span></p>
          <p><ShieldCheck /><span><strong>Pagamento protegido</strong><small>Pix e demais opções na Kiwify.</small></span></p>
        </div>
        <p className="ebook-email-warning">Use no checkout um e-mail que você acessa.</p>
      </aside>
    </section>

    <section className="ebook-assurance" aria-label="Resumo do produto">
      <p><BookOpen /><span><strong>7 histórias completas</strong><small>Leitura envolvente e objetiva</small></span></p>
      <p><MapPinned /><span><strong>Lugares reais</strong><small>Um outro mapa de Ouro Preto</small></span></p>
      <p><ScrollText /><span><strong>Fontes e contexto</strong><small>O que é fato fica visível</small></span></p>
      <p><Mail /><span><strong>Entrega por e-mail</strong><small>Logo após a confirmação</small></span></p>
    </section>

    <section className="ebook-about" id="sobre">
      <article>
        <p className="ebook-kicker">SOBRE ESTE LIVRO</p>
        <h2>A cidade que você conhece termina onde estas histórias começam.</h2>
        <p>Você já viu as igrejas, as ladeiras e os casarões. Este livro conduz você pelo que ficou nas sombras: relatos transmitidos por gerações, acontecimentos documentados e mistérios ligados a endereços que ainda podem ser encontrados.</p>
        <p>É uma leitura curta e visual para conhecer Ouro Preto de outro jeito — estando na cidade ou lendo de casa.</p>
      </article>
      <div className="ebook-feature-list">
        <p><Landmark /><span><strong>Lugares que existem</strong><small>Igreja de Santa Efigênia, Praça Tiradentes, Oratório do Vira-Saia, Morro da Queimada e outros pontos.</small></span></p>
        <p><FileText /><span><strong>Evidência à vista</strong><small>O livro mostra onde acaba o registro histórico e onde começa a memória popular.</small></span></p>
        <p><MapPinned /><span><strong>Roteiro das sombras</strong><small>Um percurso temático para reconhecer os locais ligados às narrativas.</small></span></p>
      </div>
    </section>

    <section className="ebook-inside" id="por-dentro">
      <div className="ebook-inside-art">
        <img src="/media/ebook/livro-assombracoes-aberto.webp" alt="Livro aberto mostrando o projeto visual da edição" loading="lazy" />
      </div>
      <div>
        <p className="ebook-kicker">VEJA POR DENTRO</p>
        <h2>Uma edição feita para mergulhar na história.</h2>
        <p>Texto, imagens, mapas e classificação editorial trabalham juntos para transformar cada capítulo em uma descoberta.</p>
        <ul>
          <li><Check /> capítulos completos organizados por tema</li>
          <li><Check /> contexto histórico em linguagem simples</li>
          <li><Check /> localização associada a cada narrativa</li>
          <li><Check /> referências municipais e documentais</li>
        </ul>
        <Cta href={checkoutUrl} />
      </div>
    </section>

    <section className="ebook-chapters" id="capitulos">
      <div className="ebook-section-title">
        <p className="ebook-kicker">SUMÁRIO</p>
        <h2>As histórias desta edição</h2>
      </div>
      <div className="ebook-chapter-list">
        {stories.map(([number, title, tag]) => <article key={number}>
          <span>{number}</span>
          <h3>{title}</h3>
          <small>{tag}</small>
        </article>)}
      </div>
    </section>

    <section className="ebook-details" id="detalhes">
      <div>
        <p className="ebook-kicker">DETALHES DO PRODUTO</p>
        <h2>Informações da edição</h2>
        <dl>
          <div><dt>Formato</dt><dd>Livro digital em PDF</dd></div>
          <div><dt>Edição</dt><dd>1ª edição · 2026</dd></div>
          <div><dt>Extensão</dt><dd>40 páginas</dd></div>
          <div><dt>Idioma</dt><dd>Português do Brasil</dd></div>
          <div><dt>Tema</dt><dd>História, lendas e patrimônio</dd></div>
          <div><dt>Entrega</dt><dd>Por e-mail após a aprovação</dd></div>
        </dl>
      </div>
      <div className="ebook-truth-card">
        <p className="ebook-kicker">PADRÃO EDITORIAL</p>
        <h2>O medo faz parte da história. A honestidade também.</h2>
        <p><i className="documented" /><strong>Documentado</strong><span>Fontes e registros históricos.</span></p>
        <p><i className="oral" /><strong>Tradição oral</strong><span>Relatos transmitidos por gerações.</span></p>
        <p><i className="legend" /><strong>Lenda</strong><span>Memória cultural sem alegação de prova.</span></p>
        <p><i className="disputed" /><strong>Versões disputadas</strong><span>Mais de uma interpretação para o fato.</span></p>
      </div>
    </section>

    <section className="ebook-final-offer" id="comprar">
      <img src="/media/ebook/livro-assombracoes-capa.webp" alt="Capa do e-book" loading="lazy" />
      <div>
        <p className="ebook-kicker">COMECE A LEITURA</p>
        <h2>Ouro Preto nunca mais vai parecer a mesma.</h2>
        <p>Receba agora a edição digital completa com as sete histórias, o atlas de lugares, o roteiro das sombras e as referências.</p>
      </div>
      <div>
        <small>VALOR DO E-BOOK</small>
        <strong>{price}</strong>
        <Cta href={checkoutUrl} />
      </div>
    </section>

    <section className="ebook-faq">
      <div className="ebook-section-title centered">
        <p className="ebook-kicker">DÚVIDAS RÁPIDAS</p>
        <h2>Antes de comprar</h2>
      </div>
      <div className="ebook-faq-list">
        <details><summary>É um livro físico?</summary><p>Não. Esta oferta é da edição digital em PDF, para leitura no celular, tablet ou computador.</p></details>
        <details><summary>Como recebo o e-book?</summary><p>Após a Kiwify aprovar o pagamento, o PDF completo é enviado como anexo para o e-mail informado no checkout.</p></details>
        <details><summary>Preciso estar em Ouro Preto para aproveitar?</summary><p>Não. O livro funciona como leitura independente. Se você visitar a cidade, poderá reconhecer os lugares associados.</p></details>
        <details><summary>As histórias são apresentadas como fatos?</summary><p>O livro diferencia fatos documentados, tradição oral, lendas e versões disputadas. As imagens são reconstituições artísticas.</p></details>
      </div>
    </section>

    <aside className="ebook-mobile-buy">
      <div><small>E-BOOK DIGITAL</small><strong>{price}</strong></div>
      <Cta href={checkoutUrl} compact />
    </aside>

    <footer className="ebook-footer">
      <div><Compass /><strong>Cidade Oculta</strong></div>
      <p>Histórias escondidas em lugares reais.</p>
      <nav><a href="/pt-br/ouro-preto/termos">Termos</a><a href="/pt-br/ouro-preto/privacidade">Privacidade</a><a href="https://wa.me/5531996215276" target="_blank" rel="noreferrer">Suporte</a></nav>
    </footer>
  </main>;
}
