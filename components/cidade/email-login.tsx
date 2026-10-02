'use client';
import { useState, type FormEvent } from 'react';

export function EmailLogin({ en, returnTo }: { en: boolean; returnTo: string }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const response = await fetch(sent ? '/api/auth/verify' : '/api/auth/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sent ? { email, code } : { email }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || (en ? 'Please try again.' : 'Tente novamente.'));
      if (sent) window.location.assign(returnTo);
      else setSent(true);
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  return <form className="auth-form" onSubmit={submit}>
    <label htmlFor="auth-email">{en ? 'EMAIL' : 'E-MAIL'}</label><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} disabled={sent || busy} placeholder="voce@exemplo.com"/>
    {sent && <><label htmlFor="auth-code">{en ? '8-DIGIT CODE' : 'CÓDIGO DE 8 DÍGITOS'}</label><input id="auth-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} placeholder="00000000"/><p className="auth-hint">{en ? 'The code expires in 10 minutes.' : 'O código expira em 10 minutos.'}</p></>}
    <button className="button wide" type="submit" disabled={busy}>{busy ? (en ? 'Please wait…' : 'Aguarde…') : sent ? (en ? 'Enter the city →' : 'Entrar na cidade →') : (en ? 'Send access code →' : 'Enviar código de acesso →')}</button>
    {sent && <button className="auth-change" type="button" onClick={() => { setSent(false); setCode(''); setMessage(''); }}>{en ? 'Use another email' : 'Usar outro e-mail'}</button>}
    {message && <p className="error" role="alert">{message}</p>}
  </form>;
}
