-- Add property_name to properties
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS property_name text;

-- Ensure one-to-one related tables can use upsert on property_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'property_location_property_id_key'
  ) THEN
    ALTER TABLE public.property_location ADD CONSTRAINT property_location_property_id_key UNIQUE (property_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'property_communication_property_id_key'
  ) THEN
    ALTER TABLE public.property_communication ADD CONSTRAINT property_communication_property_id_key UNIQUE (property_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'property_access_property_id_key'
  ) THEN
    ALTER TABLE public.property_access ADD CONSTRAINT property_access_property_id_key UNIQUE (property_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'property_extras_property_id_key'
  ) THEN
    ALTER TABLE public.property_extras ADD CONSTRAINT property_extras_property_id_key UNIQUE (property_id);
  END IF;
END $$;