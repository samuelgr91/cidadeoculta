import { ArrowRight, Compass, LockKeyhole, Mail } from 'lucide-react';
import { truthLabels, storyPath, type Locale, type City, type PublicStory } from '@/lib/model';

export function Header({ locale, city, alternate, heroOverlay = false }: { locale: Locale; city: City; alternate?: string | null; heroOverlay?: boolean }) {
  const en = locale === 'en';
  const base = `/${locale}/${city.slug}`;
  return <>
    <div className="prototype-strip">{en ? 'REAL PLACES · DOCUMENTS, TRADITIONS AND DIFFERENT ACCOUNTS' : 'LUGARES REAIS · DOCUMENTOS, TRADIÇÕES E DIFERENTES VERSÕES'}</div>
    <header className={heroOverlay ? 'topbar topbar-hero' : 'topbar'}>
      <a href={base} className="brand">
        <span className="brand-mark"><Compass /></span>
        <strong>Cidade Oculta</strong>
        <span className="brand-tagline">{en ? 'HIDDEN STORIES IN REAL PLACES' : 'HISTÓRIAS ESCONDIDAS EM LUGARES REAIS'}</span>
      </a>
      <nav>
        <a href={base + '/mapa'}>{en ? 'Explore' : 'Explorar'}</a>
        <a href={base + '/como-funciona'}>{en ? 'About' : 'Sobre'}</a>
        <a href={base + '/como-funciona#ajuda'}>{en ? 'Help' : 'Ajuda'}</a>
      </nav>
      <div className="nav-end">
        <span className="locale-current">{en ? 'EN' : 'PT'}</span>
        {alternate !== null && <a className="locale-link" href={alternate || `/${en ? 'pt-br' : 'en'}/${city.slug}`} aria-label={en ? 'Mudar para português' : 'Switch to English'}>{en ? 'PT' : 'EN'}</a>}
      </div>
    </header>
  </>;
}

export function Footer({ locale, city }: { locale: Locale; city: City }) {
  const en = locale === 'en';
  const base = `/${locale}/${city.slug}`;
  return <footer>
    <a className="brand footer-brand" href={base}><span className="brand-mark"><Compass /></span><strong>Cidade Oculta</strong></a>
    <p>{en ? 'Hidden stories in real places.' : 'Histórias escondidas em lugares reais.'}</p>
    <div className="row">
      <a href={base + '/privacidade'}>{en ? 'Privacy' : 'Privacidade'}</a>
      <a href={base + '/termos'}>{en ? 'Terms' : 'Termos'}</a>
      <a href={base + '/editorial'}>{en ? 'Editorial & credits' : 'Editorial e créditos'}</a>
      <a href="/admin">{en ? 'Editorial studio' : 'Estúdio editorial'} ↗</a>
    </div>
  </footer>;
}

export function Badge({ status, locale }: { status: PublicStory['truthStatus']; locale: Locale }) {
  return <span className={'truth ' + status}>{truthLabels[status][locale]}</span>;
}

export function StoryCard({ story: s, city, locale, imageOverride, visualLabel }: { story: PublicStory; city: City; locale: Locale; imageOverride?: string; visualLabel?: string }) {
  const en = locale === 'en';
  const access = s.accessLevel === 'open'
    ? <><span className="access-dot" />{en ? 'Open' : 'Livre'}</>
    : s.accessLevel === 'lead'
      ? <><Mail size={12} />{en ? 'With email' : 'Com e-mail'}</>
      : <><LockKeyhole size={12} />City Pass</>;
  return <a className="story-card" href={storyPath(locale, city.slug, s.copy.slug)}>
    {(imageOverride || s.image) && <img src={imageOverride || s.image} alt={imageOverride ? `${visualLabel || ''}: ${s.location.name}` : s.location.name} loading="lazy" />}
    <div className="story-card-shade" />
    <div className="story-access">{access}</div>
    <div className="story-card-body">
      <Badge status={s.truthStatus} locale={locale} />
      <h3>{s.copy.title}</h3>
      <p>{s.copy.hook}</p>
      <div className="card-bottom">
        <span>{s.location.name} · {Math.ceil(s.estimatedSeconds / 60)} min</span>
        <i><ArrowRight size={17} /></i>
      </div>
      {imageOverride && <small className="visual-credit">{visualLabel} · IA</small>}
    </div>
  </a>;
}
