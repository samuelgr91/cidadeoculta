import { authenticatedUser, signInPath, emailAuthEnabled } from '@/lib/email-auth';
import { isAdmin } from '@/lib/access';
import { Admin } from '@/components/cidade/admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Estúdio editorial — Cidade Oculta', robots: { index: false, follow: false } };

export default async function Page() {
  const user = await authenticatedUser();
  if (!user) return <main className="page"><p className="eyebrow">CIDADE OCULTA / ESTÚDIO</p><h1 style={{ fontSize: 70 }}>O próximo capítulo começa aqui.</h1><p>Acesso reservado à equipe editorial.</p><a className="button" href={signInPath('/admin')} target="_top">Entrar no estúdio ↗</a></main>;
  if (!await isAdmin()) return <main className="page"><h2>Acesso restrito</h2><p>Esta conta não faz parte da equipe editorial.</p><a href="/">Voltar ao site</a></main>;
  return <><div className="admin-dashboard-link"><a href="/admin/painel">Ver visitas e titulares do City Pass →</a></div><Admin exportAvailable={!emailAuthEnabled()} /></>;
}
