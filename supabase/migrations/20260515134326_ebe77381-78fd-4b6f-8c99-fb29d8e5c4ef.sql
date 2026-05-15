CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role public.app_role;
  _token text;
  _verified_phone text;
  _is_phone_verified boolean := false;
BEGIN
  _token := NEW.raw_user_meta_data->>'pre_verified_phone_token';

  IF _token IS NOT NULL THEN
    SELECT phone INTO _verified_phone
    FROM public.pending_phone_verifications
    WHERE session_token = _token
      AND status = 'verified'
      AND verified_at IS NOT NULL
      AND verified_at > (now() - interval '30 minutes')
    LIMIT 1;

    IF _verified_phone IS NOT NULL THEN
      _is_phone_verified := true;
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, name, email, phone, phone_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(_verified_phone, NEW.raw_user_meta_data->>'phone'),
    _is_phone_verified
  )
  ON CONFLICT (user_id) DO NOTHING;

  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'client');
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;

  IF _is_phone_verified THEN
    INSERT INTO public.verification_logs (user_id, verification_type, verification_status, comment)
    VALUES (NEW.id, 'phone', 'approved', 'sms.ru pre-signup callcheck verified');
  END IF;

  RETURN NEW;
END;
$function$;