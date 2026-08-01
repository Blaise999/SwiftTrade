'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type BridgeStatus =
  | 'awaiting_admin'
  | 'awaiting_payment'
  | 'awaiting_verification'
  | 'completed'
  | 'rejected';

const STAGE_COPY: Record<BridgeStatus, string> = {
  awaiting_admin: 'Reviewing request…',
  awaiting_payment: 'Confirming payment…',
  awaiting_verification: 'Verifying funds…',
  completed: 'Completed — funds credited',
  rejected: 'Request rejected',
};

/**
 * useBridgeStatus — poll one SwiftBridge request until it settles, so the UI can
 * show a live "processing" progression and then refresh net worth on completion.
 *
 * onCompleted fires once, when status hits 'completed' — wire it to your
 * NetWorth hook's refresh() so the dashboard total updates the moment funds land.
 */
export function useBridgeStatus(
  requestId: string | null,
  userId: string | null,
  opts?: { pollMs?: number; onCompleted?: (credited: number) => void },
) {
  const pollMs = opts?.pollMs ?? 3000;
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [credited, setCredited] = useState<number>(0);
  const firedDone = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    if (!requestId || !userId) return;
    try {
      const r = await fetch(`/api/bridge/status?id=${encodeURIComponent(requestId)}`, {
        headers: { 'x-user-id': userId },
        cache: 'no-store',
      });
      const j = await r.json();
      const req = j?.request ?? j;
      const s = req?.status as BridgeStatus | undefined;
      if (s) setStatus(s);
      if (s === 'completed') {
        const amt = Number(req?.credited_amount_usd) || 0;
        setCredited(amt);
        if (!firedDone.current) {
          firedDone.current = true;
          opts?.onCompleted?.(amt);
        }
        if (timer.current) clearInterval(timer.current);
      }
      if (s === 'rejected' && timer.current) clearInterval(timer.current);
    } catch {
      /* keep polling */
    }
  }, [requestId, userId, opts]);

  useEffect(() => {
    firedDone.current = false;
    if (!requestId || !userId) return;
    poll();
    timer.current = setInterval(poll, pollMs);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [requestId, userId, pollMs, poll]);

  return {
    status,
    credited,
    label: status ? STAGE_COPY[status] : '',
    isDone: status === 'completed',
    isRejected: status === 'rejected',
  };
}
