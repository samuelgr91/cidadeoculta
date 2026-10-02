// Next.js on Node hosts such as Vercel and Netlify has no Cloudflare binding.
// Server configuration uses process.env, while lib/db.ts selects the Turso adapter.
export const env: { DB?: undefined } = {};
