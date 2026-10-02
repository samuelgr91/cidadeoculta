'use client';

import { useState } from 'react';

export function PassTransfer({ en, original, signedIn, legacyUrl, libraryUrl, signIn }: { en: boolean; original: boolean; signedIn: boolean; legacyUrl: string; libraryUrl: string; signIn: string }) {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(original ? '/api/pass-transfer/issue' : '/api/pass-transfer/redeem', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: original ? '{}' : JSON.stringify({ code: code.trim() }),
      });
      const result = await response.json() as { error?: string; code?: string };
      if (!response.ok) throw new Error(result.error || (en ? 'Please try again.' : 'Tente novamente.'));
      if (original) { setCode(result.code || ''); setMessage(en ? 'Copy this code. It expires in 15 minutes.' : 'Copie este código. Ele expira em 15 minutos.'); }
      else { setCode(''); setMessage(en ? 'City Pass linked to this account. Open your library.' : 'City Pass vinculado a esta conta. Abra sua biblioteca.'); }
    } catch (error) { setMessage(error instanceof Error ? error.message : (en ? 'Please try again.' : 'Tente novamente.')); }
    finally { setBusy(false); }
  }
  return <div className="pass-transfer-panel panel">
    <p className="eyebrow">CITY PASS · {en ? 'ACCOUNT TRANSFER' : 'TRANSFERÊNCIA DE CONTA'}</p>
    <h2>{original ? (en ? 'Get your transfer code' : 'Gere seu código de transferência') : (en ? 'Link your City Pass' : 'Vincule seu City Pass')}</h2>
    <p>{original
      ? (en ? 'Sign in to the original Site account that owns the pass. The code proves ownership without sharing your account details.' : 'Entre na conta original do Site que possui o passe. O código comprova a titularidade sem compartilhar os dados da sua conta.')
      : (en ? 'First, get a code from the original Site while signed in. Then sign in here with the same email address and paste the code below.' : 'Primeiro, gere um código no Site original após entrar na sua conta. Depois, entre aqui com o mesmo e-mail e cole o código abaixo.')}</p>
    {!original && <a className="button secondary" href={legacyUrl} target="_blank" rel="noopener noreferrer">{en ? 'Open original Site' : 'Abrir Site original'} ↗</a>}
    {!signedIn ? <p><a className="button" href={signIn} target="_top">{en ? 'Sign in to continue' : 'Entrar para continuar'} ↗</a></p> : <>
      {!original && <label className="transfer-label" htmlFor="transfer-code">{en ? 'Transfer code' : 'Código de transferência'}<textarea id="transfer-code" value={code} onChange={event => setCode(event.target.value)} autoComplete="off" spellCheck={false} rows={4} /></label>}
      {original && code && <label className="transfer-label" htmlFor="issued-code">{en ? 'Your code' : 'Seu código'}<textarea id="issued-code" value={code} readOnly rows={4} onFocus={event => event.currentTarget.select()} /></label>}
      <button className="button" type="button" onClick={submit} disabled={busy || (!original && !code.trim())}>{busy ? '…' : original ? (en ? 'Generate code' : 'Gerar código') : (en ? 'Link my pass' : 'Vincular meu passe')} ↗</button>
      {original && code && <button className="button secondary" type="button" onClick={async () => { await navigator.clipboard.writeText(code); setMessage(en ? 'Code copied.' : 'Código copiado.'); }}>{en ? 'Copy code' : 'Copiar código'}</button>}
    </>}
    {message && <p className="transfer-message" role="status">{message}</p>}
    <p className="transfer-note">{en ? 'Only an active pass can be transferred. A code works only with the same verified email and expires after 15 minutes. Each original account can be linked once.' : 'Só um passe ativo pode ser transferido. O código funciona apenas com o mesmo e-mail verificado e expira em 15 minutos. Cada conta original pode ser vinculada uma vez.'}</p>
    <a className="transfer-library" href={libraryUrl}>{en ? 'My cities' : 'Minhas cidades'} →</a>
  </div>;
}
