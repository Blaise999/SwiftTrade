'use client';
import { LegalPage } from '@/components/marketing/Templates';
export default function Page() {
  return (
    <LegalPage title="Privacy Policy" updated="June 2026" blocks={[
      { h: 'What we collect', p: 'Only what we need to run your account and meet our legal duties: identity details for verification, device and usage data for security, and your transaction records.' },
      { h: 'What we do not do', p: 'We do not sell your personal data. We share it only with the partners and regulators required to provide the service, under contract and applicable law.' },
      { h: 'Your controls', p: 'You can request access to, correction of, or deletion of your data at any time, subject to records we are legally required to retain. Email privacy@swifttrade.com to make a request.' },
      { h: 'Security', p: 'Data is encrypted in transit and at rest. We run a bug-bounty program and publish incident notes when something goes wrong.' },
    ]} />
  );
}
