-- Create profiles table linked to auth.users
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE, -- Reference to our existing users table
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  user_type TEXT NOT NULL DEFAULT 'ops',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Allow profile creation during signup" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_user RECORD;
BEGIN
  -- Try to find existing user by email in users table
  SELECT * INTO existing_user 
  FROM public.users 
  WHERE email = NEW.email 
  LIMIT 1;
  
  -- Create profile with role from existing user or default to 'ops'
  INSERT INTO public.profiles (
    id, 
    user_id, 
    email, 
    first_name, 
    last_name, 
    user_type,
    is_active
  )
  VALUES (
    NEW.id,
    COALESCE(existing_user.user_id, gen_random_uuid()),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', existing_user.first_name),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', existing_user.last_name),
    COALESCE(existing_user.user_type, 'ops'),
    COALESCE(existing_user.is_active, true)
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add trigger for updating timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();