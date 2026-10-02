import {
  ArrowRight,
  BookOpen,
  Compass,
  Gift,
  Languages,
  LockKeyhole,
  Map,
} from 'lucide-react';
import { Header, Footer, StoryCard } from './shared';
import { CityMap } from './map';
import { Track, BuyLink } from './tracking';
import { price, type City, type Locale, type PublicStory } from '@/lib/model';

const labels = {
  'pt-br': {
    pilot: 'Cidade piloto',
    title: <>Descubra o que<br />Ouro Preto esconde.</>,
    intro: 'Histórias reais, lendas e segredos espalhados pelas ruas da cidade — reunidos em um mapa interativo, com contexto e transparência editorial.',
    unlock: 'Liberar Ouro Preto',
    explore: 'Explorar grátis',
    stories: 'histórias no mapa',
    languages: 'PT / EN',
    sources: 'fontes visíveis',
    open: 'aberta agora',
    promise: <>MAIS QUE TURISMO.<br />HISTÓRIAS QUE PERMANECEM.</>,
    collection: 'O que a cidade não conta',
    collectionIntro: 'Conheça algumas das histórias que esperam por você no mapa.',
    seeAll: 'Ver todas as histórias',
    passCopy: 'A cidade por inteiro, como ela realmente é.',
    passItem1: 'Todas as histórias premium do mapa',
    passItem2: 'Narração nas histórias principais',
    passItem3: 'Fontes, versões e contexto editorial',
    unlockCity: 'Liberar a cidade',
    classification: 'Como classificamos cada história',
    editorialCopy: 'Nem tudo o que se conta sobre uma cidade é fato. Em vez de esconder isso, a classificação fica visível na história inteira.',
    learnMore: 'Saiba mais',
    faq: 'Antes de explorar',
    coming: 'Próxima descoberta',
    comingTitle: 'Por dentro, a conta não fecha',
    comingCopy: 'Uma nova história está passando pelo processo editorial.',
    research: 'Em pesquisa',
  },
  en: {
    pilot: 'Pilot city',
    title: <>Discover what<br />Ouro Preto hides.</>,
    intro: 'Real stories, legends and secrets across the city streets — brought together in an interactive map, with context and editorial transparency.',
    unlock: 'Unlock Ouro Preto',
    explore: 'Explore for free',
    stories: 'stories on the map',
    languages: 'PT / EN',
    sources: 'visible sources',
    open: 'open now',
    promise: <>BEYOND TOURISM.<br />STORIES THAT STAY WITH YOU.</>,
    collection: 'What the city does not tell you',
    collectionIntro: 'Discover some of the stories waiting for you on the map.',
    seeAll: 'See all stories',
    passCopy: 'The whole city, as it really is.',
    passItem1: 'Every premium story on the map',
    passItem2: 'Narration on featured stories',
    passItem3: 'Sources, versions and editorial context',
    unlockCity: 'Unlock the city',
    classification: 'How we classify each story',
    editorialCopy: 'Not everything told about a city is fact. Instead of hiding that, each classification stays visible throughout the story.',
    learnMore: 'Learn more',
    faq: 'Before you explore',
    coming: 'Upcoming discovery',
    comingTitle: 'Inside, the numbers do not add up',
    comingCopy: 'A new story is moving through the editorial process.',
    research: 'In research',
  },
} as const;

export function Landing({ locale, city, stories, mapStyle }: { locale: Locale; city: City; stories: PublicStory[]; mapStyle: string }) {
  const en = locale === 'en';
  const t = labels[locale];
  const base = `/${locale}/${city.slug}`;
  const landingImages: Record<string, string> = {
    'oratorio-vira-saia': '/media/landing/oratorio-evening.webp',
    'teto-sao-francisco': '/media/landing/sao-francisco-dusk.webp',
    'casa-dos-contos': '/media/landing/casa-dos-contos-evening.webp',
  };
  const featured = ['oratorio-vira-saia','op-003','teto-sao-francisco','op-006'].map(id=>stories.find(story=>story.id===id)).filter((story):story is PublicStory=>!!story);
  const cards = [...featured,...stories.filter(story=>!featured.includes(story))].slice(0,4);
  const editorial = en
    ? [
        ['Documented', 'Facts supported by historical records.'],
        ['Oral tradition', 'Accounts from local memory and tradition.'],
        ['Disputed versions', 'Different versions of the same event.'],
        ['Original fiction', 'Stories inspired by the city.'],
      ]
    : [
        ['Documentado', 'Fatos com fontes e registros históricos.'],
        ['Tradição oral', 'Relatos populares e memórias locais.'],
        ['Versões disputadas', 'Diferentes versões para o mesmo fato.'],
        ['Ficção original', 'Histórias inspiradas na cidade.'],
      ];

  return <>
    <Header locale={locale} city={city} heroOverlay />
    <Track name="landing_view" cityId={city.id} locale={locale} />
    <main>
      <section className="hero-cinematic">
        <img className="hero-backdrop" src="/media/landing/ouro-preto-night.webp" alt="" aria-hidden="true" />
        <div className="hero-vignette" />
        <div className="hero-copy">
          <p className="city-kicker"><span>{t.pilot}</span>{city.name} · MG</p>
          <h1>{t.title}</h1>
          <p className="intro">{t.intro}</p>
          <div className="hero-stats" aria-label={en ? 'Collection details' : 'Detalhes da coleção'}>
            <span><Map size={16} />{stories.length} {t.stories}</span>
            <span><Languages size={16} />{t.languages}</span>
            <span><BookOpen size={16} />{t.sources}</span>
            <span><Gift size={16} />{stories.filter(s => s.accessLevel === 'open').length} {t.open}</span>
          </div>
          <div className="hero-actions">
            <BuyLink cityId={city.id} locale={locale} className="button" href={base + '/comprar'}>{t.unlock} — {price(city.priceCents, locale)}<ArrowRight size={18} /></BuyLink>
            <a className="button ghost" href={base + '/mapa'}>{t.explore}<Compass size={17} /></a>
          </div>
          <p className="purchase-note">{en ? 'One payment. No subscription. Instant access.' : 'Compra única. Sem assinatura. Acesso imediato.'}</p>
          <p className="hero-promise">{t.promise}</p>
        </div>
        <div className="hero-map-wrap">
          <div className="map-window-label"><Map size={16} />{en ? 'Ouro Preto · Interactive view' : 'Ouro Preto · Vista interativa'}</div>
          <CityMap compact city={city} stories={stories} locale={locale} styleUrl={mapStyle} />
        </div>
      </section>

      <section className="section stories-section">
        <div className="section-head compact-head">
          <div>
            <h2>{t.collection}</h2>
            <p>{t.collectionIntro}</p>
          </div>
          <a className="quiet-link" href={base + '/mapa'}>{t.seeAll}<ArrowRight size={15} /></a>
        </div>
        <div className="content-grid">{cards.map(s => <StoryCard key={s.id} story={s} city={city} locale={locale} imageOverride={landingImages[s.id]||s.mapImage} visualLabel={en ? 'Editorial visual' : 'Visual editorial'} />)}
          {stories.length<4&&<article className="story-card coming-card">
            <img src="/media/landing/ouro-preto-night.webp" alt="" aria-hidden="true" />
            <div className="story-card-shade" />
            <div className="story-access"><LockKeyhole size={12} />{t.coming}</div>
            <div className="story-card-body">
              <span className="truth disputed">{t.research}</span>
              <h3>{t.comingTitle}</h3>
              <p>{t.comingCopy}</p>
              <div className="card-bottom"><span>{en ? 'EDITORIAL PIPELINE' : 'EM PRODUÇÃO EDITORIAL'}</span></div>
            </div>
          </article>}
        </div>
      </section>

      <section className="section closing-grid">
        <article className="pass-panel">
          <div className="pass-art" aria-hidden="true" />
          <div className="pass-main">
            <p className="eyebrow">City Pass</p>
            <h2>{city.name} Pass</h2>
            <p>{t.passCopy}</p>
          </div>
          <ul>
            <li>✓ {t.passItem1}</li>
            <li>✓ {t.passItem2}</li>
            <li>✓ {t.passItem3}</li>
          </ul>
          <div className="pass-cta">
            <div className="price">{price(city.priceCents, locale)}</div>
            <BuyLink cityId={city.id} locale={locale} className="button" href={base + '/comprar'}>{t.unlockCity}<ArrowRight size={17} /></BuyLink>
            <a className="quiet-link" href={base + '/biblioteca'}>{en ? 'Already purchased? Access here' : 'Já comprei · acessar'}</a>
          </div>
        </article>

        <article className="classification-panel" id="editorial">
          <div>
            <h3>{t.classification}</h3>
            <div className="classification-list">{editorial.map(([name, copy], index) => <div key={name}>
              <i className={`classification-dot t${index}`} />
              <strong>{name}</strong>
              <span>{copy}</span>
            </div>)}</div>
          </div>
          <div className="editorial-explainer">
            <p>{t.editorialCopy}</p>
            <a className="quiet-link" href={base + '/editorial'}>{t.learnMore}<ArrowRight size={14} /></a>
          </div>
        </article>
      </section>

      <section className="section faq">
        <p className="eyebrow">{t.faq}</p>
        {(en ? [
          ['Do I need to be in Ouro Preto?', 'No. Explore every story from anywhere, without GPS.'],
          ['Are all stories true?', 'Each one carries a visible editorial classification and its sources. Tradition is never presented as proven fact.'],
          ['What does the pass unlock?', 'The current premium collection for this city. See the current price and purchase conditions on the City Pass page.'],
        ] : [
          ['Preciso estar em Ouro Preto?', 'Não. Explore todas as histórias de qualquer lugar, sem GPS.'],
          ['Todas as histórias são reais?', 'Cada uma traz classificação editorial e fontes visíveis. Tradição oral nunca é apresentada como fato comprovado.'],
          ['O que o passe libera?', 'A coleção premium atual desta cidade. Confira o preço e as condições atuais na página do City Pass.'],
        ]).map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </section>
    </main>
    <Footer locale={locale} city={city} />
  </>;
}
