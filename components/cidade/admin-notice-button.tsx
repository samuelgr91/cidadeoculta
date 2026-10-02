'use client';
import { useState } from 'react';

export function AdminNoticeButton({ orderId }: { orderId: string }) {
  const [state, setState] = useState('');
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true); setState('');
    try {
      const response = await fetch('/api/admin/kiwify-notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId }) });
      const result = await response.json() as { status?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'Falha no envio.');
      setState(result.status === 'sent' ? 'Enviado' : 'Já enviado');
    } catch (error) { setState((error as Error).message); }
    finally { setBusy(false); }
  }
  return <span className="admin-notice-action"><button type="button" disabled={busy || state === 'Enviado'} onClick={send}>{busy ? 'Enviando…' : 'Reenviar acesso'}</button>{state && <small role="status">{state}</small>}</span>;
}
