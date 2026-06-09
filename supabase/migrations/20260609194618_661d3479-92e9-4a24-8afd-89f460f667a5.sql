CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _title text; _type text; _link text;
BEGIN
  IF NEW.request_status = OLD.request_status OR NEW.client_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  CASE NEW.request_status
    WHEN 'accepted' THEN _title := 'Ваша заявка подтверждена'; _type := 'request_accepted'; _link := '/dashboard/client';
    WHEN 'rejected' THEN _title := 'Ваша заявка отклонена'; _type := 'request_rejected'; _link := '/dashboard/client/history';
    WHEN 'expired' THEN _title := 'Заявка истекла — хост не ответил'; _type := 'request_expired'; _link := '/dashboard/client/history';
    WHEN 'cancelled' THEN _title := 'Заявка отменена'; _type := 'request_cancelled'; _link := '/dashboard/client/history';
    WHEN 'completed' THEN _title := 'Размещение завершено'; _type := 'request_completed'; _link := '/dashboard/client/history';
    ELSE RETURN NEW;
  END CASE;

  PERFORM public.create_notification(
    NEW.client_user_id, _type, _title, NULL, _link
  );
  RETURN NEW;
END; $function$;