
-- Add email to host_applications
ALTER TABLE public.host_applications ADD COLUMN host_email text;

-- Add email to client_applications
ALTER TABLE public.client_applications ADD COLUMN client_email text;

-- Add host_email and hide_token to lots
ALTER TABLE public.lots ADD COLUMN host_email text;
ALTER TABLE public.lots ADD COLUMN hide_token uuid DEFAULT gen_random_uuid();

-- Update the trigger to copy host_email into the lot
CREATE OR REPLACE FUNCTION public.create_lot_from_host_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    INSERT INTO public.lots (
      title, address, category, access_mode, schedule,
      lat, lng, photos, host_id, price_monthly, status, is_mytishchi, host_email
    ) VALUES (
      'Место — ' || NEW.address,
      NEW.address,
      NEW.category,
      NEW.access_mode,
      NEW.schedule,
      NEW.lat, NEW.lng,
      NEW.photos,
      NEW.user_id,
      0,
      'draft',
      true,
      NEW.host_email
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Auto-verify non-Mytishchi host applications on insert
CREATE OR REPLACE FUNCTION public.auto_verify_non_mytishchi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If address does not contain Мытищи, auto-verify
  IF NEW.address NOT ILIKE '%мытищ%' THEN
    NEW.status := 'verified';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_verify_non_mytishchi
  BEFORE INSERT ON public.host_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_verify_non_mytishchi();

-- Make sure the existing trigger on host_applications for lot creation exists
-- (it was created before but not as an actual trigger, let's ensure it)
DROP TRIGGER IF EXISTS trg_create_lot_on_verify ON public.host_applications;
CREATE TRIGGER trg_create_lot_on_verify
  AFTER UPDATE ON public.host_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.create_lot_from_host_application();

-- Also fire on INSERT (for auto-verified non-Mytishchi)
-- We need an AFTER INSERT trigger too
CREATE OR REPLACE FUNCTION public.create_lot_from_host_application_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'verified' THEN
    INSERT INTO public.lots (
      title, address, category, access_mode, schedule,
      lat, lng, photos, host_id, price_monthly, status, is_mytishchi, host_email
    ) VALUES (
      'Место — ' || NEW.address,
      NEW.address,
      NEW.category,
      NEW.access_mode,
      NEW.schedule,
      NEW.lat, NEW.lng,
      NEW.photos,
      NEW.user_id,
      0,
      'draft',
      false,
      NEW.host_email
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_lot_on_insert_verified
  AFTER INSERT ON public.host_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.create_lot_from_host_application_insert();
