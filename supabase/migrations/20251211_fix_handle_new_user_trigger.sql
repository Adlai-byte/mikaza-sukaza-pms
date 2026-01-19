-- ============================================
-- FIX: handle_new_user trigger missing password column
-- ============================================
-- The trigger was failing because public.users.password is NOT NULL
-- but the trigger didn't include it when inserting.
--
-- Solution: Include a placeholder password in the trigger.
-- The actual authentication is handled by Supabase Auth (auth.users).
-- The password in public.users is only used for legacy purposes.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type TEXT;
  v_password TEXT;
BEGIN
  -- Get user_type from metadata, default to 'customer'
  v_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'customer');

  -- Validate user_type
  IF v_user_type NOT IN ('admin', 'ops', 'provider', 'customer') THEN
    v_user_type := 'customer';
  END IF;

  -- Check if user already exists in public.users (by email)
  IF EXISTS (SELECT 1 FROM public.users WHERE email = NEW.email) THEN
    -- Update existing record to use the correct auth UUID
    UPDATE public.users
    SET user_id = NEW.id,
        updated_at = NOW()
    WHERE email = NEW.email;

    RAISE NOTICE 'Updated existing user % with auth UUID %', NEW.email, NEW.id;
  ELSE
    -- Generate a placeholder password hash (actual auth is via Supabase Auth)
    -- This is a bcrypt hash of a random string - not usable for login
    v_password := '$2a$10$placeholder.hash.not.used.for.auth';

    -- Insert new user with provided or default role
    INSERT INTO public.users (
      user_id,
      email,
      password,
      first_name,
      last_name,
      user_type,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      v_password,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      v_user_type,
      true,
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Created new user % with auth UUID % and role %', NEW.email, NEW.id, v_user_type;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth signup
    RAISE WARNING 'handle_new_user trigger error for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure proper permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.users TO supabase_auth_admin;

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically syncs new auth.users to public.users with proper password placeholder and user_type from metadata';
