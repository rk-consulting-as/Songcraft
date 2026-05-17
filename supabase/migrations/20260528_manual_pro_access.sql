-- Manual Pro access for beta users.
-- Kept separate from Stripe-owned subscriptions so webhook sync remains authoritative.

CREATE TABLE IF NOT EXISTS manual_plan_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_key text NOT NULL CHECK (plan_key IN ('pro')),
  expires_at timestamptz,
  granted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS manual_plan_overrides_user_idx
  ON manual_plan_overrides (user_id, plan_key, created_at DESC);

CREATE INDEX IF NOT EXISTS manual_plan_overrides_active_idx
  ON manual_plan_overrides (user_id, plan_key, expires_at)
  WHERE revoked_at IS NULL;

ALTER TABLE manual_plan_overrides ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='manual_plan_overrides' AND policyname='manual_plan_overrides_owner_select') THEN
    CREATE POLICY manual_plan_overrides_owner_select ON manual_plan_overrides
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='manual_plan_overrides' AND policyname='manual_plan_overrides_admin_select') THEN
    CREATE POLICY manual_plan_overrides_admin_select ON manual_plan_overrides
      FOR SELECT
      USING (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='manual_plan_overrides' AND policyname='manual_plan_overrides_admin_insert') THEN
    CREATE POLICY manual_plan_overrides_admin_insert ON manual_plan_overrides
      FOR INSERT
      WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='manual_plan_overrides' AND policyname='manual_plan_overrides_admin_update') THEN
    CREATE POLICY manual_plan_overrides_admin_update ON manual_plan_overrides
      FOR UPDATE
      USING (is_admin())
      WITH CHECK (is_admin());
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
