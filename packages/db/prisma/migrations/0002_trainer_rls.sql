-- ─── Module 2: Trainer-scoped member RLS ─────────────────────────────────────
-- Replace the simple gym_id isolation on members with a policy that
-- additionally restricts trainers to only their assigned members.

DROP POLICY IF EXISTS members_isolation ON members;

CREATE POLICY members_isolation ON members
  USING (
    gym_id::text = current_setting('app.current_gym_id', true)
    AND (
      -- Non-trainers see all members in their gym
      current_setting('app.current_user_role', true) <> 'trainer'
      OR
      -- Trainers only see members assigned to them
      assigned_trainer_id::text = current_setting('app.current_user_id', true)
    )
  );

-- Manager branch-scoping is enforced at the application layer (service level),
-- not via RLS, because branch_id is on the staff_user record (not a session var).
-- The service reads req.branchId from the JWT and filters every query.

COMMENT ON POLICY members_isolation ON members
  IS 'Gym-level isolation + trainer sees only assigned members (Module 2)';
