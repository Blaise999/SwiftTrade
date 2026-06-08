'use client';
import { LegalPage } from '@/components/marketing/Templates';
export default function Page() {
  return (
    <LegalPage title="Disclosures" updated="June 2026" blocks={[
      { h: 'Risk', p: 'Investing carries risk, including the possible loss of principal. FX and crypto are volatile and may not suit every investor. Past performance does not guarantee future results.' },
      { h: 'Figures on this site', p: 'Numbers shown in marketing, including trade counts, settle times and savings, are illustrative or based on internal data and may not reflect your individual experience. Prices on the site are delayed at least 15 seconds.' },
      { h: 'Not advice', p: 'Nothing on this site is investment, legal or tax advice. Consider your own circumstances and seek independent advice if you are unsure.' },
      { h: 'Tax', p: 'US users receive a 1099-B for reportable activity. You are responsible for your own tax filing in every jurisdiction that applies to you.' },
    ]} />
  );
}
