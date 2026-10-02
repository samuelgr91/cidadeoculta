'use client';
import { useEffect, useState } from 'react';
import { BuyLink } from './tracking';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Check, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { price, type City, type Locale } from '@/lib/model';

type Props = { city: City; locale: Locale; mode: string; provider: 'kiwify' | 'mercado_pago'; signedIn: boolean; entitled: boolean; returnTo: string; signIn: string; orderId?: string };

export function Checkout({ city, locale, mode, provider, signedIn, entitled, returnTo, signIn, orderId }: Props) {
  const en = locale === 'en';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(entitled);
  const [status, setStatus] = useState('');
  async function request(path: string, data: unknown) {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json() as { error?: string; unlocked?: boolean; url?: string; order?: string; claimed?: number };
    if (!response.ok) throw new Error(result.error);
    return result;
  }
  async function start() {
    setBusy(true); setError('');
    try {
      const result = await request('/api/checkout', { cityId: city.id, locale });
      if (result.unlocked) setUnlocked(true);
      else if (result.url) window.location.assign(result.url);
      else setOrder(result.order || null);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  async function confirm() {
    setBusy(true); setError('');
    try { await request('/api/payments/demo', { orderId: order }); setOrder(null); setUnlocked(true); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  async function recover() {
    setBusy(true); setError('');
    try {
      await request('/api/payments/kiwify/claim', {});
      window.location.reload();
    } catch (cause) { setError((cause as Error).message); setBusy(false); }
  }
  useEffect(() => {
    if (!orderId) return;
    let stopped = false, attempts = 0;
    async function check() {
      try {
        const response = await fetch('/api/order/' + encodeURIComponent(orderId!));
        if (!response.ok) return;
        const result = await response.json() as { status: string };
        if (stopped) return;
        setStatus(result.status);
        if (result.status === 'paid') setUnlocked(true);
      } catch { /* The customer can retry from their library. */ }
    }
    void check();
    const timer = setInterval(() => { if (++attempts > 20) { clearInterval(timer); return; } void check(); }, 3000);
    return () => { stopped = true; clearInterval(timer); };
  }, [orderId]);
  return <div className="checkout-action">
    {unlocked ? <div className="stack"><div className="success-icon"><Check /></div><h2>{en ? 'The city is yours to discover.' : 'A cidade está aberta para você.'}</h2><p>{mode === 'demo' ? (en ? 'Demo access activated. No payment was made.' : 'Acesso de demonstração liberado. Nenhum pagamento foi realizado.') : (en ? 'Your City Pass is active.' : 'Seu City Pass está ativo.')}</p><a className="button wide" href={returnTo}>{en ? 'Continue exploring' : 'Continuar explorando'}<ArrowUpRight /></a></div> : <>
      <div className="price">{price(city.priceCents, locale)}</div>
      <p className="muted">{en ? 'One-time purchase. No subscription.' : 'Compra única. Sem assinatura.'}</p>
      {mode === 'demo' && <p className="notice">{en ? 'DEMO MODE — a simulated purchase. No card, Pix or real charge.' : 'MODO DEMONSTRAÇÃO — compra simulada. Sem cartão, Pix ou cobrança real.'}</p>}
      {mode === 'sandbox' && <p className="notice">{en ? 'Mercado Pago sandbox. Test payments only.' : 'Ambiente de teste Mercado Pago. Apenas pagamentos de teste.'}</p>}
      {mode === 'live' && provider === 'kiwify' ? <BuyLink cityId={city.id} locale={locale} className="button wide" href={`/${locale}/${city.slug}/comprar?returnTo=${encodeURIComponent(returnTo)}`}>{en ? 'Buy City Pass' : 'Comprar City Pass'}<ArrowUpRight size={18}/></BuyLink> : signedIn ? <button className="button wide" onClick={start} disabled={busy}>{busy ? (en ? 'Preparing…' : 'Preparando…') : mode === 'demo' ? (en ? 'Try the purchase flow' : 'Testar compra e liberação') : (en ? 'Continue to payment' : 'Continuar para pagamento')}<ArrowUpRight size={18} /></button> : <a href={signIn} target="_top" className="button wide">{en ? 'Sign in to save your pass' : 'Entrar para salvar seu passe'}<ArrowUpRight size={18} /></a>}
      <p className="small-note"><ShieldCheck size={14} /> {en ? 'Pay on Kiwify. Use your purchase email to access your stories.' : 'Pague na Kiwify. Acesse as histórias com o e-mail da compra.'}</p>
      {mode === 'live' && <p className="small-note">{en ? 'Review the ' : 'Consulte os '}<a href={`/${locale}/${city.slug}/termos`}>{en ? 'terms, including refunds' : 'termos e reembolso'}</a>{en ? ' and ' : ' e a '}<a href={`/${locale}/${city.slug}/privacidade`}>{en ? 'privacy notice' : 'privacidade'}</a>. {en ? 'Support: ' : 'Suporte: '}<a href="https://wa.me/5531996215276" target="_blank" rel="noreferrer">WhatsApp</a>.</p>}
      {mode === 'live' && provider === 'kiwify' && !signedIn && <p className="checkout-recover"><a href={signIn}>{en ? 'Already purchased? Access my stories →' : 'Já comprei · acessar minhas histórias →'}</a></p>}
      {mode === 'live' && provider === 'kiwify' && signedIn && <div className="checkout-recover"><p>{en ? 'Already paid? Your access appears once Kiwify confirms the purchase. Use the email from checkout.' : 'Já pagou? O acesso aparece quando a Kiwify confirma a compra. Use o mesmo e-mail do checkout.'}</p><button type="button" onClick={recover} disabled={busy}>{en ? 'Check my access' : 'Verificar meu acesso'} →</button></div>}
      {status && <p role="status">{en ? 'Payment status: ' : 'Status do pagamento: '}{status === 'pending' ? (en ? 'Awaiting confirmation.' : 'Aguardando confirmação.') : status === 'paid_unclaimed' ? (en ? 'Sign in with the purchase email.' : 'Entre com o e-mail da compra.') : status}</p>}
    </>}
    {error && <p className="error" role="alert">{error}</p>}
    <Dialog open={!!order} onOpenChange={open => { if (!open) setOrder(null); }}><DialogContent><DialogTitle>{en ? 'Simulate payment approval' : 'Simular aprovação do pagamento'}</DialogTitle><DialogDescription>{en ? 'This action activates a demo pass for your account. It does not create a real payment.' : 'Esta ação libera um passe de demonstração para sua conta. Não cria um pagamento real.'}</DialogDescription><p>{city.name} Pass · {price(city.priceCents, locale)}</p><button disabled={busy} className="button wide" onClick={confirm}>{busy ? (en ? 'Activating…' : 'Liberando…') : (en ? 'Approve test payment' : 'Aprovar pagamento de teste')}</button>{error && <p className="error">{error}</p>}</DialogContent></Dialog>
  </div>;
}
