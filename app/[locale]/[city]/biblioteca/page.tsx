import { notFound } from 'next/navigation';
import { catalog } from '@/lib/catalog';
import { access } from '@/lib/access';
import { signInPath, emailAuthEnabled } from '@/lib/email-auth';
import { chatGPTSignOutPath } from '@/app/chatgpt-auth';
import { SignOut } from '@/components/cidade/sign-out';
import { db } from '@/lib/db';
import { Header, Footer } from '@/components/cidade/shared';
import type { Locale } from '@/lib/model';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minhas cidades — Cidade Oculta', robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ locale: Locale; city: string }> }) {
  const p = await params, c = await catalog(p.city, p.locale);
  if (!c) notFound();
  const a = await access(c.city.id);
  const count = a.userId ? await db().prepare('SELECT COUNT(*) n FROM progress p JOIN stories s ON s.id=p.story_id WHERE p.user_id=? AND s.city_id=?').bind(a.userId, c.city.id).first<{ n: number }>() : null;
  const en = p.locale === 'en', base = `/${p.locale}/${p.city}`;
  return <><Header city={c.city} locale={p.locale}/><main className="page"><p className="eyebrow">{en ? 'YOUR DISCOVERIES' : 'SUAS DESCOBERTAS'}</p><h1 style={{ fontSize: 80 }}>{en ? 'My cities.' : 'Minhas cidades.'}</h1><div className="panel"><h2>{c.city.name}</h2><p>{a.entitled ? (en ? 'City Pass active' : 'City Pass ativo') : (en ? 'Free exploration' : 'Exploração gratuita')}</p><p>{count?.n || 0} / {c.stories.length} {en ? 'stories discovered' : 'histórias descobertas'}</p><a className="button" href={`${base}/mapa`}>{en ? 'Continue exploring' : 'Continuar explorando'} ↗</a><p><a href={`${base}/transferir`}>{en ? 'Move a pass from the original pilot' : 'Transferir passe do piloto original'} →</a></p>{!a.user && <p><a href={signInPath(`${base}/biblioteca`)} target="_top">{en ? 'Sign in to recover your passes' : 'Entre para recuperar seus passes'} ↗</a></p>}{a.user && <p>{emailAuthEnabled() ? <SignOut en={en} destination={base}/> : <a href={chatGPTSignOutPath(base)} target="_top">{en ? 'Sign out' : 'Sair da conta'}</a>}</p>}</div></main><Footer city={c.city} locale={p.locale}/></>;
}
