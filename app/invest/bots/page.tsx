'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ContactRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bot = searchParams.get('bot') || '';

  useEffect(() => {
    // Open the support widget
    window.dispatchEvent(new Event('open-support-widget'));
    // Redirect to the bots page
    router.replace(bot ? `/invest/bots?bot=${bot}` : '/invest/bots');
  }, [router, bot]);

  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-cream/60 text-sm">Redirecting to support...</p>
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-void flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" />
        </div>
      }
    >
      <ContactRedirect />
    </Suspense>
  );
}
