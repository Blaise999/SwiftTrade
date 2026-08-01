/**
 * The stock chart terminal is retired. Every stock entry point now leads to the
 * unified, ledger-backed invest experience. This redirect catches every existing
 * link to /dashboard/trade/stocks without having to edit each one.
 *
 * If a symbol is passed (?symbol=AAPL), we deep-link to that asset's buy screen.
 */
import { redirect } from 'next/navigation';

export default function StocksTerminalRedirect({
  searchParams,
}: {
  searchParams?: { symbol?: string };
}) {
  const sym = searchParams?.symbol?.trim().toUpperCase();
  redirect(sym ? `/dashboard/invest/asset/${sym}` : '/dashboard/invest');
}
