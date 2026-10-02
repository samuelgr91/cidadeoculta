import { db, ensureSeed } from '@/lib/db';
import { requireAdmin, fail, HttpError } from '@/lib/access';
import { emailAuthEnabled } from '@/lib/email-auth';
import { makeBundle } from '@/lib/migration-bundle';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    if (emailAuthEnabled()) throw new HttpError(404, 'Exportação disponível apenas na origem D1.');
    await requireAdmin();
    await ensureSeed();
    const bundle = await makeBundle(db());
    return new Response(JSON.stringify(bundle), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `${new URL(request.url).searchParams.get('inline') === '1' ? 'inline' : 'attachment'}; filename="cidade-oculta-d1-${new Date().toISOString().slice(0, 10)}.json"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) { return fail(error); }
}
