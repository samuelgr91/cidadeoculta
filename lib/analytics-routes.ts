export function publicAnalyticsPath(input: string): string | null {
  // Keep the browser tracker and ingestion API on the same allowlist. Query
  // strings and fragments are always discarded before storage.
  const path = input.split(/[?#]/)[0];
  if (path === '/livro-das-assombracoes' || path === '/livro-das-assombracoes/') return '/livro-das-assombracoes';
  if (/^\/(?:en\/)?l\/[a-z0-9-]{1,100}\/?$/.test(path)) return path.replace(/\/$/, '');
  if (!/^\/(pt-br|en)\/[a-z0-9-]+(?:\/(?:mapa|pass|comprar|biblioteca|como-funciona|editorial|privacidade|termos|(?:historias|stories)\/[a-z0-9-]+))?\/?$/.test(path)) return null;
  return path.replace(/\/$/, '');
}
