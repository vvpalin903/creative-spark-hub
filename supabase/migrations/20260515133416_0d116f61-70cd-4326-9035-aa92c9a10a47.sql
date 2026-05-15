
-- Таблица для pre-signup верификации телефона
CREATE TABLE IF NOT EXISTS public.pending_phone_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token text NOT NULL UNIQUE,
  phone text NOT NULL,
  check_id text NOT NULL,
  call_phone text,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  verified_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppv_session_token ON public.pending_phone_verifications(session_token);
CREATE INDEX IF NOT EXISTS idx_ppv_phone ON public.pending_phone_verifications(phone);

ALTER TABLE public.pending_phone_verifications ENABLE ROW LEVEL SECURITY;

-- Никаких клиентских политик — доступ только через edge functions с service role
CREATE POLICY "Staff manage pending phone verifications"
ON public.pending_phone_verifications
FOR ALL
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE TRIGGER trg_ppv_updated_at
BEFORE UPDATE ON public.pending_phone_verifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Обновляем handle_new_user: если в метаданных есть валидный pre_verified_phone_token,
-- проставляем phone_verified = true и логируем
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
    VALUES (NEW.id, 'phone', 'verified', 'sms.ru pre-signup callcheck verified');
  END IF;

  RETURN NEW;
END;
$function$;
