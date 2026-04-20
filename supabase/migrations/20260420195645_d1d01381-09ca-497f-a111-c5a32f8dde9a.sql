
-- Объекты: запрещаем анонимам создавать «висящие» объекты от чужого имени
DROP POLICY IF EXISTS "Anonymous can insert objects" ON public.host_objects;

-- Заявки на бронирование: ужесточаем insert
DROP POLICY IF EXISTS "Anyone can create requests" ON public.booking_requests;
CREATE POLICY "Visitors and clients can create requests"
ON public.booking_requests
FOR INSERT
WITH CHECK (
  -- объект должен существовать и быть опубликован
  EXISTS (
    SELECT 1 FROM public.host_objects o
    WHERE o.id = object_id AND o.object_status = 'published'
  )
  AND (
    -- либо аноним без client_user_id
    (auth.uid() IS NULL AND client_user_id IS NULL)
    -- либо авторизованный сам себя
    OR (auth.uid() IS NOT NULL AND client_user_id = auth.uid())
  )
);

-- Чаты: только админ или пользователь, ставший участником
DROP POLICY IF EXISTS "Authenticated can create chat" ON public.chats;
CREATE POLICY "Authenticated participant can create chat"
ON public.chats
FOR INSERT
TO authenticated
WITH CHECK (
  -- создатель должен быть либо админом, либо участником связанной заявки/объекта
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.id = related_request_id
      AND (br.client_user_id = auth.uid() OR br.host_user_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.host_objects ho
    WHERE ho.id = related_object_id AND ho.host_user_id = auth.uid()
  )
);

-- Участники чата: добавлять только себя; админ — кого угодно
DROP POLICY IF EXISTS "Authenticated can add participants" ON public.chat_participants;
CREATE POLICY "Users add themselves or admin adds anyone"
ON public.chat_participants
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

-- verification_logs: уточняем self-insert (только для типов phone/email — самоверификация)
DROP POLICY IF EXISTS "System can insert logs" ON public.verification_logs;
CREATE POLICY "Users insert own self-verification logs"
ON public.verification_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND verification_type IN ('phone', 'email')
);
