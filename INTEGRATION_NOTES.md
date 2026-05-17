[
  {
    "table_name": "active_fx_trades",
    "redacted_query": "select id, user_id, symbol, pair, direction, direction_int, investment, multiplier, entry_price, current_price, liquidation_price, stop_loss, take_profit, floating_pnl, status, opened_at, user_balance, calculated_pnl from public.active_fx_trades;"
  },
  {
    "table_name": "active_trades_with_pnl",
    "redacted_query": "select id, user_id, asset_id, symbol, asset_type, trade_type, direction, amount, quantity, leverage, entry_price, exit_price, stop_loss, take_profit, payout_percent, duration_seconds, expires_at, status, profit_loss, payout_amount, fee, commission, swap, session_id, signal_id, is_copy_trade, '[REDACTED]' as idempotency_key, opened_at, closed_at, created_at, market_type, current_price, '[REDACTED]' as session_key, pair, type, pnl, side, lot_size, margin_used, fees, source, pnl_percentage, updated_at, metadata, is_simulated, '[REDACTED]' as notes, direction_int, investment, multiplier, volume, liquidation_price, spread_cost, floating_pnl, final_pnl, user_balance, calculated_pnl from public.active_trades_with_pnl;"
  },
  {
    "table_name": "admin_audit_log",
    "redacted_query": "select id, admin_id, target_user_id, action, meta, created_at from public.admin_audit_log;"
  },
  {
    "table_name": "admin_logs",
    "redacted_query": "select id, admin_id, action, action_category, target_type, target_id, old_values, new_values, '[REDACTED]' as ip_address, user_agent, request_id, created_at from public.admin_logs;"
  },
  {
    "table_name": "admin_notifications",
    "redacted_query": "select id, type, title, '[REDACTED]' as message, payload, created_at, read_at from public.admin_notifications;"
  },
  {
    "table_name": "admin_sessions",
    "redacted_query": "select id, admin_id, '[REDACTED]' as token_hash, '[REDACTED]' as ip_address, user_agent, device_info, expires_at, last_activity_at, revoked_at, revoke_reason, created_at, user_id from public.admin_sessions;"
  },
  {
    "table_name": "airdrop_claims",
    "redacted_query": "select id, user_id, season, claimed_at, '[REDACTED]' as airdrop_key, '[REDACTED]' as wallet_address, claim_status, amount, '[REDACTED]' as tx_hash, merkle_proof, signature from public.airdrop_claims;"
  },
  {
    "table_name": "assets",
    "redacted_query": "select id, symbol, '[REDACTED]' as name, asset_type, min_trade_amount, max_trade_amount, payout_percent, spread, leverage_max, is_active, is_featured, trading_hours, icon_url, display_order, created_at, updated_at from public.assets;"
  },
  {
    "table_name": "bot_activation_keys",
    "redacted_query": "select id, '[REDACTED]' as activation_key, bot_type, status, user_id, '[REDACTED]' as user_email, generated_by, activated_at, revoked_at, '[REDACTED]' as notes, created_at, updated_at from public.bot_activation_keys;"
  },
  {
    "table_name": "bot_activity_log",
    "redacted_query": "select id, bot_id, action, details, created_at from public.bot_activity_log;"
  },
  {
    "table_name": "bot_orders",
    "redacted_query": "select id, bot_id, user_id, pair, side, role, quantity, price, total, fee, status, grid_level, safety_level, created_at from public.bot_orders;"
  },
  {
    "table_name": "crypto_positions",
    "redacted_query": "select id, user_id, symbol, quantity, average_price, total_cost_basis, shield_enabled, shield_snap_price, shield_snap_value, shield_activated_at, shield_expires_at, realized_pnl, created_at, updated_at from public.crypto_positions;"
  },
  {
    "table_name": "dca_bot_config",
    "redacted_query": "select id, bot_id, order_amount, frequency, take_profit_pct, stop_loss_pct, trailing_tp_enabled, trailing_tp_deviation, safety_orders_enabled, max_safety_orders, safety_order_size, safety_order_step_pct, safety_order_step_scale, safety_order_volume_scale, current_avg_price, total_base_bought, total_quote_spent, active_safety_count, peak_profit_pct, deal_count, last_buy_at, created_at from public.dca_bot_config;"
  },
  {
    "table_name": "demo_fx_candles",
    "redacted_query": "select id, pair_id, session_id, timeframe, bucket_start, open, high, low, close, tick_count, created_at from public.demo_fx_candles;"
  },
  {
    "table_name": "demo_fx_pairs",
    "redacted_query": "select id, symbol, '[REDACTED]' as name, base_currency, quote_currency, pip_size, spread, default_bid, default_ask, current_bid, current_ask, mode, active_scenario_id, is_active, is_demo, leverage, min_lot, max_lot, display_order, price_updated_at, created_at, updated_at, seq, active_session_id from public.demo_fx_pairs;"
  },
  {
    "table_name": "demo_fx_price_log",
    "redacted_query": "select id, pair_id, bid, ask, source, scenario_id, logged_at from public.demo_fx_price_log;"
  },
  {
    "table_name": "demo_fx_scenario_runs",
    "redacted_query": "select id, scenario_id, pair_id, status, started_at, ended_at, created_at from public.demo_fx_scenario_runs;"
  },
  {
    "table_name": "demo_fx_scenario_steps",
    "redacted_query": "select id, scenario_id, step_index, offset_ms, target_bid, target_ask, easing, label, created_at from public.demo_fx_scenario_steps;"
  },
  {
    "table_name": "demo_fx_scenarios",
    "redacted_query": "select id, pair_id, '[REDACTED]' as name, '[REDACTED]' as description, status, scheduled_at, started_at, paused_at, completed_at, stopped_at, current_step_index, elapsed_ms, loop_playback, created_by, created_at, updated_at from public.demo_fx_scenarios;"
  },
  {
    "table_name": "demo_fx_sessions",
    "redacted_query": "select id, pair_id, session_type, duration_ms, tick_interval_ms, volatility, start_bid, start_ask, target_bid, target_ask, status, started_at, paused_at, completed_at, elapsed_ms, tick_seq, lesson_title, '[REDACTED]' as lesson_description, student_instructions, created_by, created_at, updated_at from public.demo_fx_sessions;"
  },
  {
    "table_name": "demo_fx_ticks",
    "redacted_query": "select id, pair_id, session_id, bid, ask, mid, source, seq, ts from public.demo_fx_ticks;"
  },
  {
    "table_name": "demo_fx_trades",
    "redacted_query": "select id, user_id, pair_id, symbol, direction, direction_label, investment, multiplier, volume, entry_bid, entry_ask, entry_price, stop_loss, take_profit, liquidation_price, current_price, floating_pnl, status, close_reason, exit_price, final_pnl, closed_at, spread_cost, opened_at, updated_at, session_id from public.demo_fx_trades;"
  },
  {
    "table_name": "deposit_wallets",
    "redacted_query": "select id, currency, network, '[REDACTED]' as address, memo, is_active, created_at, updated_at from public.deposit_wallets;"
  },
  {
    "table_name": "deposits",
    "redacted_query": "select id, user_id, amount, currency, amount_received, method, status, payment_reference, payment_proof_url, '[REDACTED]' as wallet_address, '[REDACTED]' as transaction_hash, sender_info, processed_at, processed_by, rejection_reason, '[REDACTED]' as notes, bonus_amount, bonus_code, expires_at, created_at, updated_at, '[REDACTED]' as method_name, transaction_ref, proof_url, '[REDACTED]' as admin_note, payment_asset, '[REDACTED]' as address_shown, network, '[REDACTED]' as tx_hash, '[REDACTED]' as note from public.deposits;"
  },
  {
    "table_name": "email_otps",
    "redacted_query": "select id, '[REDACTED]' as email, '[REDACTED]' as otp_hash, type, attempts, max_attempts, expires_at, used_at, '[REDACTED]' as ip_address, user_agent, created_at from public.email_otps;"
  },
  {
    "table_name": "grid_bot_config",
    "redacted_query": "select id, bot_id, upper_price, lower_price, grid_count, grid_type, total_investment, per_grid_amount, strategy, stop_upper_price, stop_lower_price, grid_profit, float_pnl, total_base_held, avg_buy_price, completed_cycles, created_at from public.grid_bot_config;"
  },
  {
    "table_name": "grid_levels",
    "redacted_query": "select id, bot_id, level_index, price, buy_filled, sell_filled, buy_order_id, sell_order_id, created_at from public.grid_levels;"
  },
  {
    "table_name": "idempotency_keys",
    "redacted_query": "select id, '[REDACTED]' as key, user_id, operation_type, response_status, '[REDACTED]' as response_body, created_at, expires_at from public.idempotency_keys;"
  },
  {
    "table_name": "kyc_documents",
    "redacted_query": "select id, user_id, '[REDACTED]' as document_type, '[REDACTED]' as file_url, '[REDACTED]' as file_name, '[REDACTED]' as file_size, mime_type, status, rejection_reason, reviewed_by, reviewed_at, created_at from public.kyc_documents;"
  },
  {
    "table_name": "ledger_entries",
    "redacted_query": "select id, user_id, ref_type, ref_id, delta, balance_before, balance_after, meta, created_at from public.ledger_entries;"
  },
  {
    "table_name": "login_attempts",
    "redacted_query": "select id, '[REDACTED]' as email, '[REDACTED]' as ip_address, success, failure_reason, user_agent, created_at from public.login_attempts;"
  },
  {
    "table_name": "market_budget",
    "redacted_query": "select provider, bucket, window_start, used, budget_limit, updated_at from public.market_budget;"
  },
  {
    "table_name": "market_cache",
    "redacted_query": "select '[REDACTED]' as key, payload, updated_at from public.market_cache;"
  },
  {
    "table_name": "notifications",
    "redacted_query": "select id, user_id, type, title, '[REDACTED]' as message, data, created_at, read_at from public.notifications;"
  },
  {
    "table_name": "platform_wallets",
    "redacted_query": "select id, currency, network, '[REDACTED]' as address, label, '[REDACTED]' as wallet_type, is_active, min_amount, confirmations, created_at, updated_at from public.platform_wallets;"
  },
  {
    "table_name": "referral_codes",
    "redacted_query": "select user_id, code, created_at from public.referral_codes;"
  },
  {
    "table_name": "referral_stats",
    "redacted_query": "select user_id, total, qualified_at, updated_at from public.referral_stats;"
  },
  {
    "table_name": "referrals",
    "redacted_query": "select id, referrer_id, referred_user_id, created_at, reward_paid, reward_amount, reward_trigger, reward_paid_at, updated_at from public.referrals;"
  },
  {
    "table_name": "shield_events",
    "redacted_query": "select id, user_id, position_id, symbol, event_type, snap_price, snap_value, market_price, market_value, quantity, cost_basis, shield_impact, duration_seconds, trigger_reason, metadata, created_at from public.shield_events;"
  },
  {
    "table_name": "stock_balance_events",
    "redacted_query": "select id, trade_id, user_id, event, delta, balance_before, balance_after, created_at from public.stock_balance_events;"
  },
  {
    "table_name": "support_messages",
    "redacted_query": "select id, ticket_id, sender_id, sender_type, '[REDACTED]' as message, '[REDACTED]' as message_type, attachments, read_at, delivered_at, created_at, thread_id from public.support_messages;"
  },
  {
    "table_name": "support_threads",
    "redacted_query": "select id, user_id, status, created_at, '[REDACTED]' as last_message_at from public.support_threads;"
  },
  {
    "table_name": "support_tickets",
    "redacted_query": "select id, user_id, subject, category, priority, status, assigned_to, resolved_at, '[REDACTED]' as resolution_notes, satisfaction_rating, '[REDACTED]' as last_message_at, created_at, updated_at from public.support_tickets;"
  },
  {
    "table_name": "tier_purchases",
    "redacted_query": "select id, user_id, tier_level, tier_code, price_amount, bonus_amount, currency, payment_asset, payment_network, '[REDACTED]' as address_shown, '[REDACTED]' as tx_hash, status, approved_at, approved_by, rejected_reason, created_at, updated_at from public.tier_purchases;"
  },
  {
    "table_name": "trade_ledger",
    "redacted_query": "select id, user_id, trade_id, transaction_type, amount, balance_before, balance_after, '[REDACTED]' as description, metadata, created_at from public.trade_ledger;"
  },
  {
    "table_name": "trade_signals",
    "redacted_query": "select id, session_id, signal_time, direction, is_executed, executed_at, created_at from public.trade_signals;"
  },
  {
    "table_name": "trades",
    "redacted_query": "select id, user_id, asset_id, symbol, asset_type, trade_type, direction, amount, quantity, leverage, entry_price, exit_price, stop_loss, take_profit, payout_percent, duration_seconds, expires_at, status, profit_loss, payout_amount, fee, commission, swap, session_id, signal_id, is_copy_trade, '[REDACTED]' as idempotency_key, opened_at, closed_at, created_at, market_type, current_price, '[REDACTED]' as session_key, pair, type, pnl, side, lot_size, margin_used, fees, source, pnl_percentage, updated_at, metadata, is_simulated, '[REDACTED]' as notes, direction_int, investment, multiplier, volume, liquidation_price, spread_cost, floating_pnl, final_pnl, asset, close_reason, order_id from public.trades;"
  },
  {
    "table_name": "trading_bots",
    "redacted_query": "select id, user_id, bot_type, '[REDACTED]' as name, pair, status, invested_amount, current_value, total_pnl, total_trades, '[REDACTED]' as error_message, started_at, stopped_at, created_at, updated_at from public.trading_bots;"
  },
  {
    "table_name": "trading_sessions",
    "redacted_query": "select id, asset_id, asset_symbol, '[REDACTED]' as asset_name, start_time, end_time, trade_duration_seconds, status, is_active, min_trade_amount, max_trade_amount, payout_percent, total_trades, total_volume, total_payout, created_by, created_at, updated_at from public.trading_sessions;"
  },
  {
    "table_name": "transactions",
    "redacted_query": "select id, user_id, type, amount, currency, balance_before, balance_after, status, reference_type, reference_id, '[REDACTED]' as description, metadata, admin_id, '[REDACTED]' as ip_address, created_at from public.transactions;"
  },
  {
    "table_name": "user_balance_summary",
    "redacted_query": "select user_id, balance_available, locked_in_trades, unrealized_pnl, equity from public.user_balance_summary;"
  },
  {
    "table_name": "user_bot_access",
    "redacted_query": "select id, user_id, bot_type, '[REDACTED]' as activation_key_id, is_active, activated_at from public.user_bot_access;"
  },
  {
    "table_name": "user_deposit_wallets",
    "redacted_query": "select id, user_id, currency, network, '[REDACTED]' as address, label, is_active, created_at, updated_at from public.user_deposit_wallets;"
  },
  {
    "table_name": "user_trading_data",
    "redacted_query": "select user_id, spot_crypto_state, spot_stocks_state, updated_at from public.user_trading_data;"
  },
  {
    "table_name": "users",
    "redacted_query": "select id, '[REDACTED]' as email, '[REDACTED]' as first_name, '[REDACTED]' as last_name, '[REDACTED]' as phone, country, '[REDACTED]' as avatar_url, role, is_active, is_verified, '[REDACTED]' as email_verified_at, balance_available, balance_bonus, balance_locked, total_deposited, total_withdrawn, total_profit_loss, '[REDACTED]' as kyc_status, '[REDACTED]' as kyc_level, '[REDACTED]' as kyc_submitted_at, '[REDACTED]' as kyc_reviewed_at, '[REDACTED]' as kyc_reviewer_id, '[REDACTED]' as kyc_rejection_reason, two_factor_enabled, '[REDACTED]' as two_factor_secret, failed_login_attempts, locked_until, last_login_at, last_login_ip, preferred_currency, timezone, notifications_enabled, created_at, updated_at, '[REDACTED]' as kyc_data, '[REDACTED]' as kyc_reviewed_by, '[REDACTED]' as email_verified, tier_level, tier_active, tier_code, tier_activated_at, referred_by, referral_code, referral_count, referral_milestone_10_sent, balance, '[REDACTED]' as deposit_address, deposit_network, registration_status, '[REDACTED]' as tier_purchase_wallet, tier_purchase_network from public.users;"
  },
  {
    "table_name": "withdrawals",
    "redacted_query": "select id, user_id, amount, currency, fee, amount_received, method, status, '[REDACTED]' as wallet_address, bank_details, processed_at, processed_by, '[REDACTED]' as transaction_hash, rejection_reason, '[REDACTED]' as notes, '[REDACTED]' as otp_verified, '[REDACTED]' as ip_address, created_at, updated_at from public.withdrawals;"
  }
]