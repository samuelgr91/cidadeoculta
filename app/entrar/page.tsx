import { redirect } from 'next/navigation';
import { authenticatedUser, emailAuthEnabled, safeReturnTo, signInPath } from '@/lib/email-auth';
import { EmailLogin } from '@/components/cidade/email-login';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Entrar — Cidade Oculta', robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const destination = safeReturnTo((await searchParams).returnTo);
  if (!emailAuthEnabled()) redirect(signInPath(destination));
  if (await authenticatedUser()) redirect(destination);
  const en = destination.startsWith('/en/');
  return <main className="auth-page"><div className="auth-backdrop"/><div className="auth-shell"><a className="auth-brand" href={en ? '/en/ouro-preto' : '/pt-br/ouro-preto'}>Cidade Oculta</a><div className="auth-card"><p className="eyebrow">{en ? 'YOUR NEXT DISCOVERY' : 'SUA PRÓXIMA DESCOBERTA'}</p><h1>{en ? <>The city is waiting<br/><em>for you.</em></> : <>A cidade espera<br/><em>por você.</em></>}</h1><p>{en ? 'Sign in with a code sent to your email. Your City Pass and discoveries stay with your account.' : 'Entre com um código enviado ao seu e-mail. Seu City Pass e suas descobertas ficam na sua conta.'}</p><EmailLogin en={en} returnTo={destination}/></div><p className="auth-foot">{en ? 'Hidden stories in real places.' : 'Histórias escondidas em lugares reais.'}</p></div></main>;
}
