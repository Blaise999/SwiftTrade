-- =====================================================================
-- Seed exotic/rare FX pairs into demo_fx_pairs so admins can control them
-- from the Demo FX panel (prices, ticks, scenarios). Idempotent.
-- =====================================================================
insert into public.demo_fx_pairs (symbol, base, quote, current_bid, current_ask, pip_size, is_active)
values
  ('USD/TRY','USD','TRY',38.4923,38.5077,0.0001,true),
  ('USD/ZAR','USD','ZAR',18.29634,18.30366,0.0001,true),
  ('EUR/HUF','EUR','HUF',394.921,395.079,0.0001,true),
  ('USD/MXN','USD','MXN',16.9966,17.0034,0.0001,true),
  ('USD/SGD','USD','SGD',1.34973,1.35027,0.0001,true),
  ('USD/HKD','USD','HKD',7.808438,7.811562,0.0001,true),
  ('USD/NOK','USD','NOK',10.4979,10.5021,0.0001,true),
  ('USD/SEK','USD','SEK',10.39792,10.40208,0.0001,true),
  ('USD/DKK','USD','DKK',6.89862,6.90138,0.0001,true),
  ('USD/PLN','USD','PLN',3.9992,4.0008,0.0001,true),
  ('USD/CZK','USD','CZK',22.9954,23.0046,0.0001,true),
  ('EUR/TRY','EUR','TRY',41.9916,42.0084,0.0001,true),
  ('EUR/ZAR','EUR','ZAR',19.79604,19.80396,0.0001,true),
  ('EUR/PLN','EUR','PLN',4.29914,4.30086,0.0001,true),
  ('EUR/NOK','EUR','NOK',11.39772,11.40228,0.0001,true),
  ('EUR/SEK','EUR','SEK',11.29774,11.30226,0.0001,true),
  ('GBP/ZAR','GBP','ZAR',23.19536,23.20464,0.0001,true),
  ('AUD/SGD','AUD','SGD',0.889822,0.890178,0.0001,true),
  ('USD/THB','USD','THB',36.4927,36.5073,0.0001,true),
  ('USD/INR','USD','INR',82.9834,83.0166,0.0001,true),
  ('USD/CNH','USD','CNH',7.238552,7.241448,0.0001,true)
on conflict (symbol) do update set
  base = excluded.base, quote = excluded.quote,
  current_bid = coalesce(public.demo_fx_pairs.current_bid, excluded.current_bid),
  current_ask = coalesce(public.demo_fx_pairs.current_ask, excluded.current_ask),
  pip_size = excluded.pip_size, is_active = true;
