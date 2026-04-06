
CREATE OR REPLACE FUNCTION public.create_lot_from_host_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'verified' AND (OLD.status IS NULL OR OLD.status != 'verified') THEN
    INSERT INTO public.lots (
      title,
      address,
      category,
      access_mode,
      schedule,
      lat,
      lng,
      photos,
      host_id,
      price_monthly,
      status,
      is_mytishchi
    ) VALUES (
      'Место — ' || NEW.address,
      NEW.address,
      NEW.category,
      NEW.access_mode,
      NEW.schedule,
      NEW.lat,
      NEW.lng,
      NEW.photos,
      NEW.user_id,
      0,
      'draft',
      true
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_host_application_verified
  AFTER UPDATE ON public.host_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.create_lot_from_host_application();
