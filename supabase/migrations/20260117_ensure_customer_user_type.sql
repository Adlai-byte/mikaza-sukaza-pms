-- ============================================
-- ENSURE CUSTOMER USER TYPE IS ALLOWED
-- ============================================
-- This migration ensures that 'customer' and 'provider' user types are valid
-- The error "null value in column 'user_type'" may actually be a constraint
-- violation when trying to insert 'customer' if only ('admin', 'ops') are allowed

-- Step 1: Drop the existing constraint (if any version exists)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_user_type_check;

-- Step 2: Add the complete constraint with all valid user types
-- This includes: admin, ops, provider, customer
ALTER TABLE public.users ADD CONSTRAINT users_user_type_check
  CHECK (user_type IN ('admin', 'ops', 'provider', 'customer'));

-- Step 3: Verify the constraint exists
DO $$
DECLARE
  constraint_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint
  WHERE conrelid = 'public.users'::regclass
    AND conname = 'users_user_type_check';

  IF constraint_def IS NULL THEN
    RAISE EXCEPTION 'Failed to create users_user_type_check constraint';
  END IF;

  RAISE NOTICE '✅ User type constraint verified: %', constraint_def;
  RAISE NOTICE '✅ Valid user types: admin, ops, provider, customer';
END $$;

-- Step 4: Add comment for documentation
COMMENT ON CONSTRAINT users_user_type_check ON public.users IS
  'Allowed user types: admin (full access), ops (operations), provider (service provider), customer (property owner/guest)';
