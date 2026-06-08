'use client';
import { LegalPage } from '@/components/marketing/Templates';
export default function Page() {
  return (
    <LegalPage title="Regulatory" updated="June 2026" blocks={[
      { h: 'How we are licensed', p: 'Swifttrade operates through licensed entities and partners in the markets it serves. US securities activity is provided as an SEC-registered broker-dealer and FINRA member; virtual-asset activity in Hong Kong operates as an SFC-licensed VA platform; stablecoin activity operates under HKMA authorisation.' },
      { h: 'License numbers', p: 'License numbers and the official PDFs are listed on this page at launch and filed with the relevant regulators. While in beta and under SEC review, some products are limited by region and by your verification tier.' },
      { h: 'KYC and AML', p: 'All accounts are subject to identity verification and anti-money-laundering checks. We may request additional documents and may limit or pause activity to meet these obligations.' },
      { h: 'Protections', p: 'Eligible US securities are covered by SIPC where applicable. Reserves backing stablecoin activity are subject to attestation. Crypto assets are generally not covered by deposit-protection schemes.' },
    ]} />
  );
}
