'use client';
import { useState } from 'react';
export function SignOut({ en, destination }: { en: boolean; destination: string }) {
  const [busy, setBusy] = useState(false);
  return <button className="auth-change" disabled={busy} onClick={async () => {
    setBusy(true);
    try { const response = await fetch('/api/auth/logout', { method: 'POST' }); if (response.ok) window.location.assign(destination); }
    finally { setBusy(false); }
  }}>{busy ? (en ? 'Signing out…' : 'Saindo…') : (en ? 'Sign out' : 'Sair da conta')}</button>;
}
