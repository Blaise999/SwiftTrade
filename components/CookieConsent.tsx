'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, X } from 'lucide-react';

const STORAGE_KEY = 'st-cookie-consent';
const CONSENT_VERSION = 1;

type Consent = {
  v: number;
  ts: string;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Consent;
    if (parsed.v !== CONSENT_VERSION) return null; // re-ask after policy changes
    return parsed;
  } catch {
    return null;
  }
}

function saveConsent(analytics: boolean, marketing: boolean) {
  const consent: Consent = {
    v: CONSENT_VERSION,
    ts: new Date().toISOString(),
    necessary: true,
    analytics,
    marketing,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    // let analytics loaders elsewhere in the app react to the choice
    window.dispatchEvent(new CustomEvent('st:cookie-consent', { detail: consent }));
  } catch {}
}

function Row({
  label,
  desc,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3" style={{ borderTop: '1px solid var(--line)' }}>
      <div>
        <p className="text-[13px] font-semibold" style={{ color: 'var(--t-hi)' }}>
          {label}
          {disabled && (
            <span className="ml-2 text-[10.5px] font-medium uppercase tracking-wide" style={{ color: 'var(--t-faint)' }}>
              Always on
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[12px] leading-relaxed" style={{ color: 'var(--t-sub)' }}>{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className="relative mt-0.5 h-[22px] w-[38px] shrink-0 rounded-full transition-colors disabled:cursor-not-allowed"
        style={{
          background: checked ? 'var(--gold)' : 'var(--wash-strong)',
          border: '1px solid var(--line-strong)',
          opacity: disabled ? 0.65 : 1,
        }}
      >
        <span
          className="absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow transition-all"
          style={{ left: checked ? '18px' : '2px' }}
        />
      </button>
    </div>
  );
}

export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [manage, setManage] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    // small delay so it doesn't fight the page's entry animations
    const t = setTimeout(() => {
      if (!readConsent()) setOpen(true);
    }, 900);
    return () => clearTimeout(t);
  }, []);

  if (!open) return null;

  const close = () => setOpen(false);
  const acceptAll = () => { saveConsent(true, true); close(); };
  const necessaryOnly = () => { saveConsent(false, false); close(); };
  const savePrefs = () => { saveConsent(analytics, marketing); close(); };

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed bottom-4 left-4 right-4 z-[80] mx-auto max-w-[420px] rounded-xl p-5 sm:left-5 sm:right-auto sm:mx-0"
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--line-strong)',
        boxShadow: 'inset 0 1px 0 var(--specular), 0 18px 48px -18px rgba(0,0,0,0.45)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg"
          style={{ background: 'var(--wash-strong)', border: '1px solid var(--line)' }}
        >
          <Cookie className="h-[18px] w-[18px]" style={{ color: 'var(--gold)' }} />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-bold" style={{ color: 'var(--t-hi)' }}>We use cookies</p>
          <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--t-sub)' }}>
            Some keep you signed in and the site secure. Others help us understand how Swifttrade
            is used so we can improve it. You can change this any time in{' '}
            <Link href="/legal" className="underline underline-offset-2" style={{ color: 'var(--t-body)' }}>
              Cookie settings
            </Link>.
          </p>
        </div>
        <button
          type="button"
          onClick={necessaryOnly}
          aria-label="Dismiss and use necessary cookies only"
          className="ml-auto shrink-0 rounded-md p-1 transition-colors"
          style={{ color: 'var(--t-faint)' }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {manage && (
        <div className="mt-4">
          <Row
            label="Strictly necessary"
            desc="Sign-in, security and fraud prevention. The site can't work without these."
            checked
            disabled
          />
          <Row
            label="Analytics"
            desc="Anonymous usage data that shows us what's working and what isn't."
            checked={analytics}
            onChange={setAnalytics}
          />
          <Row
            label="Marketing"
            desc="Used to measure campaigns and show fewer irrelevant ads elsewhere."
            checked={marketing}
            onChange={setMarketing}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={acceptAll}
          className="btn-shine rounded-lg px-4 py-2 text-[13px] font-bold"
        >
          Accept all
        </button>
        {manage ? (
          <button
            type="button"
            onClick={savePrefs}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--t-hi)' }}
          >
            Save choices
          </button>
        ) : (
          <button
            type="button"
            onClick={necessaryOnly}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--t-hi)' }}
          >
            Necessary only
          </button>
        )}
        {!manage && (
          <button
            type="button"
            onClick={() => setManage(true)}
            className="px-2 py-2 text-[12.5px] font-medium underline underline-offset-2"
            style={{ color: 'var(--t-sub)' }}
          >
            Manage preferences
          </button>
        )}
      </div>
    </div>
  );
}
