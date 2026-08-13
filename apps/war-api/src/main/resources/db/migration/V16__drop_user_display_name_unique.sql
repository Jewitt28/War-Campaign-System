-- Display names do not need to be globally unique; CPU system users share names across campaigns
ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_display_name_key;
