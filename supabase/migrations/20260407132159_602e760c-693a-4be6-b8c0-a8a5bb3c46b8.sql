-- Update coordinates for existing lots without them
UPDATE lots SET lat = 55.81217, lng = 37.738279 WHERE id = 'bfe3192c-32b4-4ef1-a3a0-3cca027f5e3d';
UPDATE lots SET lat = 55.81217, lng = 37.738279 WHERE id = '004de939-8221-4525-bcce-2c0d5130f4d4';
UPDATE lots SET lat = 55.81217, lng = 37.738279 WHERE id = 'dc1ed00a-6f2e-49fb-b4db-6dcbd0516d05';

-- Fix the trigger for non-Mytishchi: it was always setting is_mytishchi=false
-- Now it correctly checks the address
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
      NEW.address ILIKE '%мытищ%',
      NEW.host_email
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Same fix for the UPDATE trigger
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
      NEW.address ILIKE '%мытищ%',
      NEW.host_email
    );
  END IF;
  RETURN NEW;
END;
$$;