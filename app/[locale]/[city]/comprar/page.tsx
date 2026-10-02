import { notFound, redirect } from 'next/navigation';
import { catalog } from '@/lib/catalog';
import { access, config } from '@/lib/access';
import { configuredKiwifyProducts } from '@/lib/kiwify';
import { kiwifyCheckoutUrl } from '@/lib/kiwify-core';
import { safeReturnTo } from '@/lib/email-auth';
import type { Locale } from '@/lib/model';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

// This navigation never creates an order or grants access. Only the signed
// payment webhook records a guest purchase and the verified email claims it.
export default async function Page({ params, searchParams }: {
  params: Promise<{ locale: Locale; city: string }>;
  searchParams: Promise<{ returnTo?: string; method?:string }>;
}) {
  const { locale, city } = await params;
  if (!['pt-br', 'en'].includes(locale)) notFound();
  const collection = await catalog(city, locale);
  if (!collection) notFound();
  const base = `/${locale}/${city}`;
  const query=await searchParams;
  const requested = safeReturnTo(query.returnTo);
  const destination = requested.startsWith(base + '/') && !requested.startsWith(base + '/comprar')
    ? requested : base + '/mapa';
  const customer = await access(collection.city.id);
  if (customer.entitled) redirect(destination);
  const settings = config();
  if (settings.mode !== 'live' || settings.paymentProvider !== 'kiwify') {
    redirect(`${base}/pass?returnTo=${encodeURIComponent(destination)}`);
  }
  let checkout: string | undefined;
  try {
    const product = configuredKiwifyProducts()[collection.city.id];
    if (product) checkout = kiwifyCheckoutUrl(product, customer.user?.email);
  } catch { /* Show a recoverable page if payment configuration is unavailable. */ }
  if (checkout){const url=new URL(checkout);if(query.method==='pix'){url.searchParams.set('hideCard','true');url.searchParams.set('hideBoleto','true');}redirect(url.toString());}
  const en = locale === 'en';
  return <main className="page"><h1>{en ? 'Please try again shortly.' : 'Tente novamente em instantes.'}</h1>
    <p>{en ? 'Checkout is temporarily unavailable. No payment has been made.' : 'O pagamento está temporariamente indisponível. Nenhuma cobrança foi feita.'}</p>
    <a className="button" href={`${base}/pass`}>{en ? 'Back to City Pass' : 'Voltar ao City Pass'}</a>
  </main>;
}
