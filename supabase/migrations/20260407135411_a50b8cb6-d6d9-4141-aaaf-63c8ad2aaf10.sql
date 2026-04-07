
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
      'published',
      NEW.address ILIKE '%мытищ%',
      NEW.host_email
    );
  END IF;
  RETURN NEW;
END;
$$;

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
      'published',
      NEW.address ILIKE '%мытищ%',
      NEW.host_email
    );
  END IF;
  RETURN NEW;
END;
$$;
