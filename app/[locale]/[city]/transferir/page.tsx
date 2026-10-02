import { notFound } from 'next/navigation';
import { catalog } from '@/lib/catalog';
import { authenticatedUser, emailAuthEnabled, signInPath } from '@/lib/email-auth';
import { Header, Footer } from '@/components/cidade/shared';
import { PassTransfer } from '@/components/cidade/pass-transfer';
import type { Locale } from '@/lib/model';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Transferir City Pass — Cidade Oculta', robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ locale: Locale; city: string }> }) {
  const { locale, city } = await params;
  const c = await catalog(city, locale);
  if (!c) notFound();
  const base = `/${locale}/${city}`;
  return <><Header city={c.city} locale={locale} /><main className="page transfer-page"><div className="transfer-intro"><p className="eyebrow">{locale === 'en' ? 'KEEP YOUR DISCOVERIES' : 'SUAS DESCOBERTAS CONTINUAM'}</p><h1>{locale === 'en' ? <>Your city,<br /><em>your pass.</em></> : <>Sua cidade,<br /><em>seu passe.</em></>}</h1><p>{locale === 'en' ? 'Move your City Pass from the original pilot to your new email account.' : 'Leve seu City Pass do piloto original para sua nova conta por e-mail.'}</p></div><PassTransfer en={locale === 'en'} original={!emailAuthEnabled()} signedIn={!!await authenticatedUser()} legacyUrl={`https://cidade-oculta.gepetocomputaria.chatgpt.site${base}/transferir`} libraryUrl={`${base}/biblioteca`} signIn={signInPath(`${base}/transferir`)} /></main><Footer city={c.city} locale={locale} /></>;
}
