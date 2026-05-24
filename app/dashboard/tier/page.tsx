import { redirect } from 'next/navigation';

// Tier system removed — redirect any old links/bookmarks to the dashboard.
export default function TierRedirect() {
  redirect('/dashboard');
}
