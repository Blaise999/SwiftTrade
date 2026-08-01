/**
 * Public /stocks now leads to the same unified invest experience, so there is
 * one stock surface across the whole app. (If you want a public, logged-out
 * marketing/browse page for stocks, keep a separate route like /markets/stocks
 * and point this redirect there instead.)
 */
import { redirect } from 'next/navigation';

export default function StocksRedirect() {
  redirect('/dashboard/invest');
}
