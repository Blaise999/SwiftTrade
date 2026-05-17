'use client';

/**
 * APP PROVIDERS
 *
 * PERFORMANCE FIX:
 * The Web3 stack (wagmi + RainbowKit + MetaMask SDK) is ~hundreds of KB
 * and was previously bundled into every page (landing, dashboard,
 * everything). That is the main reason first load + Fast Refresh were
 * extremely slow.
 *
 * It is now a `next/dynamic` (ssr:false) chunk that loads AFTER first
 * paint. `children` always render immediately, so there's no hydration
 * mismatch and no blocked content.
 */

import { ReactNode, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AuthProvider } from '@/lib/supabase/auth-provider';
import { TranslatorProvider } from '@/lib/i18n';

const Web3Provider = dynamic(
  () => import('@/lib/wagmi/provider').then(m => m.Web3Provider),
  { ssr: false, loading: () => null }
);

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <TranslatorProvider>
      <AuthProvider>
        <DeferredWeb3>{children}</DeferredWeb3>
      </AuthProvider>
    </TranslatorProvider>
  );
}

/**
 * Renders children right away. Mounts the Web3 context around them only
 * after first paint (idle tick), so wallet libraries never block the
 * initial render of any page.
 */
function DeferredWeb3({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(id);
  }, []);

  if (!ready) return <>{children}</>;
  return <Web3Provider>{children}</Web3Provider>;
}
