
-- Host plan enum
DO $$ BEGIN
  CREATE TYPE public.host_plan AS ENUM ('standard', 'super_host');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Host plan request status enum
DO $$ BEGIN
  CREATE TYPE public.host_plan_request_status AS ENUM ('new','contacted','paid','activated','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend profiles with plan info
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS host_plan public.host_plan NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS host_plan_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS host_plan_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS telegram text;

-- Host plan requests table
CREATE TABLE IF NOT EXISTS public.host_plan_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL,
  requested_plan public.host_plan NOT NULL DEFAULT 'super_host',
  status public.host_plan_request_status NOT NULL DEFAULT 'new',
  contact_email text,
  contact_phone text,
  contact_telegram text,
  comment text,
  admin_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.host_plan_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts create own plan requests"
ON public.host_plan_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts view own plan requests"
ON public.host_plan_requests FOR SELECT
USING (auth.uid() = host_user_id OR public.has_admin_access(auth.uid()));

CREATE POLICY "Staff update plan requests"
ON public.host_plan_requests FOR UPDATE
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Staff manage plan requests"
ON public.host_plan_requests FOR ALL
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE TRIGGER trg_host_plan_requests_updated
BEFORE UPDATE ON public.host_plan_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify host when admin activates the plan
CREATE OR REPLACE FUNCTION public.notify_host_plan_activated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'activated' AND OLD.status IS DISTINCT FROM 'activated' THEN
    UPDATE public.profiles
      SET host_plan = NEW.requested_plan,
          host_plan_started_at = COALESCE(host_plan_started_at, now()),
          host_plan_expires_at = now() + interval '1 month'
      WHERE user_id = NEW.host_user_id;

    PERFORM public.create_notification(
      NEW.host_user_id,
      'host_plan_activated',
      'Статус Супер хост активирован',
      'Теперь вы можете публиковать больше одного объекта.',
      '/dashboard/host'
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_host_plan_activated ON public.host_plan_requests;
CREATE TRIGGER trg_notify_host_plan_activated
AFTER UPDATE ON public.host_plan_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_host_plan_activated();
