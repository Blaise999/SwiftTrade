-- =====================================================================
-- FIX: 'column reference id is ambiguous' in admin RLS policies.
-- The subquery used bare `id`; qualify as public.users.id.
-- Drops + recreates each affected policy. Idempotent.
-- =====================================================================
DROP POLICY IF EXISTS "Admins manage custom_pairs" ON public.custom_pairs;
CREATE POLICY "Admins manage custom_pairs" ON public.custom_pairs
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins manage price_overrides" ON public.price_overrides;
CREATE POLICY "Admins manage price_overrides" ON public.price_overrides
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins manage sessions" ON public.trading_sessions;
CREATE POLICY "Admins manage sessions" ON public.trading_sessions
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins manage candles" ON public.custom_candles;
CREATE POLICY "Admins manage candles" ON public.custom_candles
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins manage outcomes" ON public.trade_outcomes;
CREATE POLICY "Admins manage outcomes" ON public.trade_outcomes
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins view logs" ON public.admin_logs;
CREATE POLICY "Admins view logs" ON public.admin_logs
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins insert logs" ON public.admin_logs;
CREATE POLICY "Admins insert logs" ON public.admin_logs
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins manage patterns" ON public.market_patterns;
CREATE POLICY "Admins manage patterns" ON public.market_patterns
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND role = 'admin'));
