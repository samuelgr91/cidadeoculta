import { ArrowLeft, ArrowUpRight, Clock3, MapPin } from 'lucide-react';
import { Header, Footer, Badge, StoryCard } from './shared';
import { Gate, Sources, ReaderAudio, Complete } from './reader-actions';
import { Track } from './tracking';
import { storyPath, type Locale, type City, type PublicStory, type StoryBlock } from '@/lib/model';

const pilotVisuals: Record<string, string> = {
  'oratorio-vira-saia': '/media/landing/oratorio-evening.webp',
  'teto-sao-francisco': '/media/landing/sao-francisco-dusk.webp',
  'casa-dos-contos': '/media/landing/casa-dos-contos-evening.webp',
};

type Props = {
  city: City;
  story: PublicStory;
  stories: PublicStory[];
  blocks: StoryBlock[];
  allowed: boolean;
  locale: Locale;
  updatedAt: string;
};

export function StoryReader({ city, story, stories, blocks, allowed, locale, updatedAt }: Props) {
  const en = locale === 'en';
  const base = `/${locale}/${city.slug}`;
  const alternate = story.alternateSlug
    ? storyPath(en ? 'pt-br' : 'en', city.slug, story.alternateSlug)
    : null;
  const fullText = blocks
    .filter(block => ['text', 'heading', 'quote', 'callout'].includes(block.type))
    .map(block => 'text' in block ? block.text : '')
    .join('\n\n');
  const editorialVisual = story.mapImage || pilotVisuals[story.id];
  const heroImage = editorialVisual || story.image;
  const depth = story.depth === 'deep_file'
    ? (en ? 'Deep file' : 'Arquivo profundo')
    : story.depth === 'story'
      ? (en ? 'Story' : 'História')
      : (en ? 'Quick discovery' : 'Descoberta rápida');
  const related = stories.filter(item => item.id !== story.id).slice(0, 3);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: story.copy.title,
    inLanguage: en ? 'en' : 'pt-BR',
    dateModified: updatedAt,
    isAccessibleForFree: story.accessLevel !== 'premium',
    ...(story.accessLevel === 'premium'
      ? { hasPart: { '@type': 'WebPageElement', isAccessibleForFree: false, cssSelector: '.protected-story' } }
      : {}),
    about: { '@type': 'Place', name: story.location.name },
  };

  return <>
    <Header locale={locale} city={city} alternate={alternate} heroOverlay />
    <Track name="story_start" cityId={city.id} storyId={story.id} locale={locale} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
    <main className="story-reader">
      <header className="story-hero">
        {heroImage && <img className="story-hero-image" src={heroImage} alt={editorialVisual ? '' : story.location.name} />}
        <div className="story-hero-shade" />
        <div className="story-hero-inner">
          <a className="story-back" href={base + '/mapa'}><ArrowLeft size={15} />{en ? 'Back to the map' : 'Voltar ao mapa'}</a>
          <div className="story-hero-copy">
            <p className="story-kicker"><span>{city.name}</span><span className="story-kicker-line" /><span>{depth}</span></p>
            <Badge status={story.truthStatus} locale={locale} />
            <h1>{story.copy.title}</h1>
            <p className="story-hook">{story.copy.hook}</p>
            <div className="story-hero-meta">
              <span><MapPin size={16} />{story.location.name}</span>
              <span><Clock3 size={16} />{Math.ceil(story.estimatedSeconds / 60)} {en ? 'min read' : 'min de leitura'}</span>
            </div>
          </div>
        </div>
        {editorialVisual && <p className="story-visual-credit">{en ? 'AI visual reconstruction · does not depict the exact place' : 'Reconstrução visual por IA · não retrata o local exato'}</p>}
      </header>

      <div className="story-reading-grid">
        <article className="story-article">
          <div className="story-intro">
            <span className="story-section-index">01 / {en ? 'THE STORY' : 'A HISTÓRIA'}</span>
            <p>{story.copy.summary}</p>
          </div>

          {allowed
            ? <div className="protected-story story-body">
                <ReaderAudio story={story} locale={locale} text={fullText} blocks={blocks} />
                {blocks.map((block, index) => block.type === 'text'
                  ? <p key={index} style={{whiteSpace:'pre-line'}}>{block.text}</p>
                  : block.type === 'heading'
                    ? <h2 key={index}>{block.text}</h2>
                    : block.type === 'callout'
                      ? <aside className="notice" key={index}>{block.text}</aside>
                      : block.type === 'quote'
                        ? <blockquote key={index}>{block.text}<cite>{block.attribution}</cite></blockquote>
                        : block.type === 'image'
                          ? <figure key={index}><img src={block.url} alt={block.alt} loading="lazy" /><figcaption>{block.isAiGenerated ? (en ? 'AI illustration · ' : 'Ilustração por IA · ') : ''}{block.credit} · {block.license} · <a href={block.sourceUrl}>{en ? 'Source' : 'Origem'}</a></figcaption></figure>
                          : block.type === 'audio'
                            ? <details key={index}><summary>{en ? 'Audio transcript' : 'Transcrição do áudio'}</summary><p>{block.transcript}</p></details>
                            : null)}
                <div className="story-finish"><Complete story={story} locale={locale} /></div>
              </div>
            : <div className="protected-story"><Gate story={story} locale={locale} citySlug={city.slug} /></div>}

          <section className="story-editorial" aria-label={en ? 'Editorial context' : 'Contexto editorial'}>
            <span className="story-section-index">02 / {en ? 'EDITORIAL CONTEXT' : 'CONTEXTO EDITORIAL'}</span>
            <div className="story-editorial-heading"><Badge status={story.truthStatus} locale={locale} /><h2>{en ? 'What do we actually know?' : 'O que sabemos, de fato?'}</h2></div>
            <p>{story.copy.editorialNote}</p>
            <div className="story-editorial-actions">
              <Sources story={story} locale={locale} />
              <span>{en ? 'Updated' : 'Atualizada em'} {new Date(updatedAt).toLocaleDateString(en ? 'en-US' : 'pt-BR')}</span>
            </div>
          </section>
        </article>

        <aside className="story-aside">
          <div className="story-place-card">
            {story.image && <figure><img src={story.image} alt={en ? 'Present-day photograph of Ouro Preto' : 'Fotografia atual de Ouro Preto'} loading="lazy" /><figcaption>{story.imageCredit}</figcaption></figure>}
            <div className="story-place-body">
              <span className="story-section-index">{en ? 'THE REAL PLACE' : 'O LUGAR REAL'}</span>
              <h2>{story.location.name}</h2>
              <p>{story.location.address}</p>
              <a href={base + '/mapa?story=' + encodeURIComponent(story.id)}>{en ? 'Find it on the map' : 'Encontrar no mapa'} <ArrowUpRight size={17} /></a>
              <small>{en ? 'Approximate position. Explore remotely; building entry is not included.' : 'Posição aproximada. Explore remotamente; entrada no local não incluída.'}</small>
            </div>
          </div>
          {story.sources.length > 0 && <div className="story-source-card">
            <span className="story-section-index">{en ? 'SOURCES' : 'FONTES'}</span>
            {story.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span>{source.title}<small>{source.institution}</small></span><ArrowUpRight size={14} /></a>)}
          </div>}
        </aside>
      </div>

      {related.length > 0 && <section className="section story-related">
        <div className="section-head"><div><p className="eyebrow">{en ? 'KEEP EXPLORING' : 'CONTINUE EXPLORANDO'}</p><h2>{en ? 'The city has more to tell.' : 'A cidade ainda tem o que contar.'}</h2></div><a href={base + '/mapa'}>{en ? 'Open the map' : 'Abrir o mapa'} ↗</a></div>
        <div className="content-grid">{related.map(item => <StoryCard key={item.id} story={item} city={city} locale={locale} />)}</div>
      </section>}
    </main>
    <Footer locale={locale} city={city} />
  </>;
}
