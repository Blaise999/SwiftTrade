import { redirect } from 'next/navigation';

/**
 * The standalone stocks trading terminal has been consolidated into the
 * single modern investing experience at /dashboard/invest (Robinhood /
 * Trading-212 style: ETFs, S&P 500, fractional buy, watchlist).
 *
 * One stock interface — not two. This redirect keeps old links working.
 */
export default function StocksRedirect() {
  redirect('/dashboard/invest');
}
