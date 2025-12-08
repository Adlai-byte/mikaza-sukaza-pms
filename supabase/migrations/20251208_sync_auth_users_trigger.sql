-- ============================================
-- AUTO-SYNC AUTH.USERS TO PUBLIC.USERS
-- ============================================
-- This trigger automatically creates/updates a record in public.users
-- when a new user signs up or is invited via Supabase Auth.
-- This ensures the user_id in public.users always matches auth.users.id

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user already exists in public.users (by email)
  IF EXISTS (SELECT 1 FROM public.users WHERE email = NEW.email) THEN
    -- Update existing record to use the correct auth UUID
    UPDATE public.users
    SET user_id = NEW.id,
        updated_at = NOW()
    WHERE email = NEW.email;

    RAISE NOTICE 'Updated existing user % with auth UUID %', NEW.email, NEW.id;
  ELSE
    -- Insert new user with default role 'customer'
    INSERT INTO public.users (
      user_id,
      email,
      first_name,
      last_name,
      user_type,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      'customer', -- Default role, admin can change later
      true,
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Created new user % with auth UUID %', NEW.email, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also handle user email updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update email in public.users if it changed
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.users
    SET email = NEW.email,
        updated_at = NOW()
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Create trigger for updates
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.users TO supabase_auth_admin;

-- Add comments
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically syncs new auth.users to public.users, ensuring UUID consistency';
COMMENT ON FUNCTION public.handle_user_update() IS 'Syncs email changes from auth.users to public.users';
