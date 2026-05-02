-- 1. Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins/system insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR auth.uid() IS NOT NULL);

CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 2. Notification preferences + soft delete on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{"email_new_request":true,"email_request_status":true,"email_new_message":true,"email_verification":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 3. Helper: insert notification (SECURITY DEFINER — для триггеров)
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid, _type text, _title text, _body text DEFAULT NULL, _link text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (_user_id, _type, _title, _body, _link)
  RETURNING id INTO _id;
  RETURN _id;
END; $$;

-- 4. Триггер: уведомление хосту при новой заявке
CREATE OR REPLACE FUNCTION public.notify_new_booking_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.host_user_id IS NOT NULL THEN
    PERFORM public.create_notification(
      NEW.host_user_id, 'new_request',
      'Новая заявка на размещение',
      'От: ' || NEW.client_name,
      '/dashboard/host'
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_new_request
AFTER INSERT ON public.booking_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_new_booking_request();

-- 5. Триггер: уведомление клиенту при смене статуса заявки
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _title text; _type text;
BEGIN
  IF NEW.request_status = OLD.request_status OR NEW.client_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  CASE NEW.request_status
    WHEN 'accepted' THEN _title := 'Ваша заявка подтверждена'; _type := 'request_accepted';
    WHEN 'rejected' THEN _title := 'Ваша заявка отклонена'; _type := 'request_rejected';
    WHEN 'expired' THEN _title := 'Заявка истекла — хост не ответил'; _type := 'request_expired';
    WHEN 'cancelled' THEN _title := 'Заявка отменена'; _type := 'request_cancelled';
    WHEN 'completed' THEN _title := 'Размещение завершено'; _type := 'request_completed';
    ELSE RETURN NEW;
  END CASE;

  PERFORM public.create_notification(
    NEW.client_user_id, _type, _title, NULL, '/dashboard/client'
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_status_change
AFTER UPDATE ON public.booking_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status_change();

-- 6. Триггер: уведомление при новом сообщении в чате
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r record;
BEGIN
  IF NEW.message_type = 'system' OR NEW.sender_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR _r IN
    SELECT user_id FROM public.chat_participants
    WHERE chat_id = NEW.chat_id AND user_id <> NEW.sender_user_id
  LOOP
    PERFORM public.create_notification(
      _r.user_id, 'new_message',
      'Новое сообщение',
      LEFT(NEW.message_text, 80),
      CASE WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _r.user_id AND role = 'host')
           THEN '/dashboard/host/messages' ELSE '/dashboard/client/messages' END
    );
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();