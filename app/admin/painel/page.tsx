import { authenticatedUser, signInPath } from '@/lib/email-auth';
import { config, isAdmin } from '@/lib/access';
import { db } from '@/lib/db';
import { adminDashboard } from '@/lib/admin-dashboard';
import { AdminNoticeButton } from '@/components/cidade/admin-notice-button';
import { cookies } from 'next/headers';
import { analyticsCookie, audienceReport, excludeVisitor, visitorKey } from '@/lib/analytics-core';
import { AnalyticsExclusion } from '@/components/cidade/analytics-exclusion';
import { LocationLeadsReport } from '@/components/cidade/location-leads-report';
import { AudienceReport } from '@/components/cidade/audience-report';
import { AdminEbookDeliveryButton } from '@/components/cidade/admin-ebook-delivery-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Painel — Cidade Oculta', robots: { index: false, follow: false } };

const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const statusLabel: Record<string, string> = { pending: 'Aguardando pagamento', paid_unclaimed: 'Pago · aguardando conta', paid: 'Pago · acesso ativo', refunded: 'Reembolsado', charged_back: 'Contestação' };

export default async function Page({searchParams}:{searchParams:Promise<{dia?:string}>}) {
  const user = await authenticatedUser();
  if (!user) return <main className="page"><h1>Painel Cidade Oculta</h1><p>Entre com uma conta editorial para continuar.</p><a className="button" href={signInPath('/admin/painel')} target="_top">Entrar ↗</a></main>;
  if (!await isAdmin()) return <main className="page"><h1>Acesso restrito</h1><p>Esta conta não faz parte da equipe editorial.</p><a href="/">Voltar ao site</a></main>;
  const settings = config();
  const visitorCookie=(await cookies()).get('co_visitor')?.value;
  if(visitorCookie)await excludeVisitor(db(),await visitorKey(visitorCookie));
  const selectedDay=(await searchParams).dia;
  const [data,audience]=await Promise.all([adminDashboard(db(),new Date(),settings.paymentProvider==='kiwify'&&settings.mode==='live'),audienceReport(db(),selectedDay)]);
  const excluded=(await cookies()).get(analyticsCookie)?.value==='1';
  return <>
    <header className="topbar"><a className="brand" href="/">Cidade Oculta <span>PAINEL</span></a><nav><a href="/admin">Editar histórias</a><a href="/pt-br/ouro-preto">Ver site</a></nav></header>
    <main className="admin-main dashboard">
      <div className="section-head"><div><p className="eyebrow">VISÃO GERAL · ÚLTIMOS 30 DIAS</p><h1>O pulso da cidade.</h1><p>Visitas, vendas e acesso ao City Pass em um só lugar.</p></div><a className="button secondary" href="/admin">Adicionar história ↗</a></div>
      <div className="dashboard-cards">
        <article className="panel"><span>Visitas · {audience.period.day}</span><strong>{audience.totals.visits}</strong><small>{audience.totals.visitors} visitantes · {audience.totals.views} páginas vistas</small></article>
        <article className="panel"><span>Titulares ativos</span><strong>{data.holders}</strong><small>{data.activePasses} passes ativos</small></article>
        <article className="panel"><span>Pedidos pagos</span><strong>{data.paidOrders + data.ebookPaidOrders}</strong><small>{data.paidOrders} City Pass · {data.ebookPaidOrders} e-books</small></article>
        <article className="panel"><span>Receita registrada</span><strong>{money(data.revenueCents + data.ebookRevenueCents)}</strong><small>Bruta, sem taxas; reembolsos excluídos</small></article>
      </div>
      <AnalyticsExclusion excluded={excluded}/>
      <AudienceReport data={audience}/>
      <LocationLeadsReport/>
      <section className="panel dashboard-section"><div className="dashboard-heading"><div><p className="eyebrow">CITY PASS</p><h2>Titulares ativos</h2></div><small>Até 200 passes recentes · compras únicas por cidade</small></div><div className="dashboard-table-wrap"><table><thead><tr><th>Conta</th><th>Cidade</th><th>Tipo</th><th>Valor</th><th>Ativo desde</th></tr></thead><tbody>{data.passes.map(pass => <tr key={pass.id}><td>{pass.email || (pass.user_id.startsWith('chatgpt:') ? 'Conta do piloto original' : 'Conta sem e-mail visível')}</td><td>{pass.city_id}</td><td>{pass.mode === 'demo' ? 'Demonstração' : 'Pago'}</td><td>{money(pass.amount)}</td><td>{pass.created_at.slice(0, 10)}</td></tr>)}</tbody></table>{!data.passes.length && <p className="muted">Nenhum passe ativo ainda.</p>}</div></section>
      <section className="panel dashboard-section"><div className="dashboard-heading"><div><p className="eyebrow">PEDIDOS</p><h2>Compras e liberação</h2></div><small>Até 200 pedidos recentes</small></div><div className="dashboard-table-wrap"><table><thead><tr><th>Data</th><th>Conta</th><th>Cidade</th><th>Status</th><th>Valor</th></tr></thead><tbody>{data.orders.map(order => <tr key={order.id}><td>{order.created_at.slice(0, 16).replace('T', ' ')}</td><td>{order.buyer_email || order.email || (order.user_id.startsWith('chatgpt:') ? 'Piloto original' : 'Aguardando conta / e-mail não disponível')}</td><td>{order.city_id}</td><td>{statusLabel[order.status] || order.status}{order.mode === 'demo' ? ' · demonstração' : ''}</td><td>{money(order.amount)}</td></tr>)}</tbody></table>{!data.orders.length && <p className="muted">Nenhum pedido ainda.</p>}</div></section>
      <section className="panel dashboard-section"><div className="dashboard-heading"><div><p className="eyebrow">E-BOOK</p><h2>Livro das Assombrações</h2></div><small>Compras, reembolsos e entrega do PDF</small></div><div className="dashboard-table-wrap"><table><thead><tr><th>Data</th><th>Comprador</th><th>Status</th><th>Entrega</th><th>Valor</th><th>Ação</th></tr></thead><tbody>{data.ebookPurchases.map(purchase => <tr key={purchase.provider_order_id}><td>{purchase.created_at.slice(0, 16).replace('T', ' ')}</td><td>{purchase.buyer_email}</td><td>{statusLabel[purchase.status] || purchase.status}</td><td>{purchase.delivered_at ? `PDF enviado · ${purchase.delivered_at.slice(0, 16).replace('T', ' ')}` : purchase.delivery_error ? `Falhou · ${purchase.delivery_error}` : 'Aguardando envio'}</td><td>{money(purchase.amount)}</td><td>{purchase.status === 'paid' && !purchase.delivered_at ? <AdminEbookDeliveryButton orderId={purchase.provider_order_id}/> : '—'}</td></tr>)}</tbody></table>{!data.ebookPurchases.length && <p className="muted">Nenhuma compra do e-book ainda.</p>}</div></section>
      {data.pendingNotices.length > 0 && <section className="panel dashboard-section"><div className="dashboard-heading"><div><p className="eyebrow">E-MAIL DE ACESSO</p><h2>Envios pendentes</h2></div><small>Pagamento confirmado; mensagem ainda não registrada como enviada</small></div><div className="dashboard-table-wrap"><table><thead><tr><th>Compra</th><th>E-mail</th><th>Cidade</th><th>Ação</th></tr></thead><tbody>{data.pendingNotices.map(purchase => <tr key={purchase.provider_order_id}><td>{purchase.created_at.slice(0, 16).replace('T', ' ')}</td><td>{purchase.buyer_email}</td><td>{purchase.city_id}</td><td><AdminNoticeButton orderId={purchase.provider_order_id}/></td></tr>)}</tbody></table></div></section>}
    </main>
  </>;
}
