-- 1. Trigger function: create chat + participants when booking request is created with a logged-in client
CREATE OR REPLACE FUNCTION public.create_chat_for_booking_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _chat_id uuid;
BEGIN
  -- Only create chat if both host and client user ids are present
  IF NEW.client_user_id IS NULL OR NEW.host_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Avoid duplicates if a chat already exists for this request
  SELECT id INTO _chat_id FROM public.chats WHERE related_request_id = NEW.id LIMIT 1;
  IF _chat_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.chats (chat_type, related_request_id, related_object_id, last_message_at)
  VALUES ('host_client', NEW.id, NEW.object_id, now())
  RETURNING id INTO _chat_id;

  INSERT INTO public.chat_participants (chat_id, user_id, role_in_chat)
  VALUES
    (_chat_id, NEW.host_user_id, 'host'),
    (_chat_id, NEW.client_user_id, 'client')
  ON CONFLICT DO NOTHING;

  -- System message
  INSERT INTO public.messages (chat_id, sender_user_id, message_type, message_text)
  VALUES (_chat_id, NULL, 'system', 'Чат создан по новой заявке.');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_chat_on_booking_request ON public.booking_requests;
CREATE TRIGGER trg_create_chat_on_booking_request
AFTER INSERT ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_chat_for_booking_request();

-- 2. Trigger function: update chats.last_message_at when a new message is sent
CREATE OR REPLACE FUNCTION public.update_chat_last_message_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chats SET last_message_at = NEW.created_at WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_chat_last_message_at ON public.messages;
CREATE TRIGGER trg_update_chat_last_message_at
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_chat_last_message_at();

-- 3. Allow participants to update their own chat's last_read_at indirectly
-- (chats UPDATE policy for participants)
DROP POLICY IF EXISTS "Participants can update their chat" ON public.chats;
CREATE POLICY "Participants can update their chat"
ON public.chats
FOR UPDATE
USING (public.is_chat_participant(id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- 4. Enable realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.chats REPLICA IDENTITY FULL;
ALTER TABLE public.chat_participants REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chats'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chats';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_participants'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants';
  END IF;
END $$;

-- 5. Helpful index for unread counting
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON public.messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON public.chat_participants(user_id);