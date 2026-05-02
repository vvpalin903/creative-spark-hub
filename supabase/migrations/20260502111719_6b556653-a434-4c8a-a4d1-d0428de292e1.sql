
-- Helper: admin OR back_office
CREATE OR REPLACE FUNCTION public.has_admin_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','back_office')
  )
$$;

-- ============ booking_requests ============
DROP POLICY IF EXISTS "Admins update all requests" ON public.booking_requests;
CREATE POLICY "Staff update all requests" ON public.booking_requests
  FOR UPDATE USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Admins view all requests" ON public.booking_requests;
CREATE POLICY "Staff view all requests" ON public.booking_requests
  FOR SELECT USING (public.has_admin_access(auth.uid()));

-- ============ chat_email_notifications ============
DROP POLICY IF EXISTS "Admins manage notification log" ON public.chat_email_notifications;
CREATE POLICY "Staff manage notification log" ON public.chat_email_notifications
  FOR ALL USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Users view own notification log" ON public.chat_email_notifications;
CREATE POLICY "Users view own notification log" ON public.chat_email_notifications
  FOR SELECT USING ((auth.uid() = recipient_user_id) OR public.has_admin_access(auth.uid()));

-- ============ chat_participants ============
DROP POLICY IF EXISTS "Admins manage participants" ON public.chat_participants;
CREATE POLICY "Staff manage participants" ON public.chat_participants
  FOR ALL USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Participants view own membership" ON public.chat_participants;
CREATE POLICY "Participants view own membership" ON public.chat_participants
  FOR SELECT USING ((auth.uid() = user_id) OR is_chat_participant(chat_id, auth.uid()) OR public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Users add themselves or admin adds anyone" ON public.chat_participants;
CREATE POLICY "Users add themselves or staff adds anyone" ON public.chat_participants
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid()) OR public.has_admin_access(auth.uid()));

-- ============ chats ============
DROP POLICY IF EXISTS "Admins manage chats" ON public.chats;
CREATE POLICY "Staff manage chats" ON public.chats
  FOR ALL USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Authenticated participant can create chat" ON public.chats;
CREATE POLICY "Authenticated participant can create chat" ON public.chats
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_admin_access(auth.uid())
    OR EXISTS (SELECT 1 FROM public.booking_requests br WHERE br.id = chats.related_request_id AND (br.client_user_id = auth.uid() OR br.host_user_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM public.host_objects ho WHERE ho.id = chats.related_object_id AND ho.host_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Participants can update their chat" ON public.chats;
CREATE POLICY "Participants can update their chat" ON public.chats
  FOR UPDATE USING (is_chat_participant(id, auth.uid()) OR public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Participants view chat" ON public.chats;
CREATE POLICY "Participants view chat" ON public.chats
  FOR SELECT USING (is_chat_participant(id, auth.uid()) OR public.has_admin_access(auth.uid()));

-- ============ host_objects ============
DROP POLICY IF EXISTS "Admins can view all objects" ON public.host_objects;
CREATE POLICY "Staff can view all objects" ON public.host_objects
  FOR SELECT USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Admins manage all objects" ON public.host_objects;
CREATE POLICY "Staff manage all objects" ON public.host_objects
  FOR ALL USING (public.has_admin_access(auth.uid()));

-- ============ messages ============
DROP POLICY IF EXISTS "Admins manage messages" ON public.messages;
CREATE POLICY "Staff manage messages" ON public.messages
  FOR ALL USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Participants view chat messages" ON public.messages;
CREATE POLICY "Participants view chat messages" ON public.messages
  FOR SELECT USING (is_chat_participant(chat_id, auth.uid()) OR public.has_admin_access(auth.uid()));

-- ============ notifications ============
DROP POLICY IF EXISTS "Admins/system insert notifications" ON public.notifications;
CREATE POLICY "Staff/system insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (public.has_admin_access(auth.uid()) OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING ((auth.uid() = user_id) OR public.has_admin_access(auth.uid()));

-- ============ placements ============
DROP POLICY IF EXISTS "Admins manage all placements" ON public.placements;
CREATE POLICY "Staff manage all placements" ON public.placements
  FOR ALL USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Participants view own placements" ON public.placements;
CREATE POLICY "Participants view own placements" ON public.placements
  FOR SELECT USING ((auth.uid() = client_user_id) OR (auth.uid() = host_user_id) OR public.has_admin_access(auth.uid()));

-- ============ profiles ============
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING ((auth.uid() = user_id) OR public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING ((auth.uid() = user_id) OR public.has_admin_access(auth.uid()));

-- ============ reviews ============
DROP POLICY IF EXISTS "Admins manage all reviews" ON public.reviews;
CREATE POLICY "Staff manage all reviews" ON public.reviews
  FOR ALL TO authenticated USING (public.has_admin_access(auth.uid()));

-- ============ site_documents ============
DROP POLICY IF EXISTS "Admins can manage site documents" ON public.site_documents;
CREATE POLICY "Staff can manage site documents" ON public.site_documents
  FOR ALL TO authenticated USING (public.has_admin_access(auth.uid()));

-- ============ storage_slots ============
DROP POLICY IF EXISTS "Admins manage all slots" ON public.storage_slots;
CREATE POLICY "Staff manage all slots" ON public.storage_slots
  FOR ALL USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Slots visible if object visible" ON public.storage_slots;
CREATE POLICY "Slots visible if object visible" ON public.storage_slots
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM host_objects o
    WHERE o.id = storage_slots.object_id
      AND (o.object_status = 'published'::object_status OR o.host_user_id = auth.uid() OR public.has_admin_access(auth.uid()))
  ));

-- ============ user_roles — special: back_office cannot grant/revoke admin ============
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins manage any role" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Back office manage non-admin roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'back_office'::app_role) AND role <> 'admin'::app_role)
  WITH CHECK (public.has_role(auth.uid(), 'back_office'::app_role) AND role <> 'admin'::app_role);

-- ============ verification_documents ============
DROP POLICY IF EXISTS "Admins can update verification documents" ON public.verification_documents;
CREATE POLICY "Staff can update verification documents" ON public.verification_documents
  FOR UPDATE TO authenticated USING (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own documents" ON public.verification_documents;
CREATE POLICY "Users can view their own documents" ON public.verification_documents
  FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR public.has_admin_access(auth.uid()));

-- ============ verification_logs ============
DROP POLICY IF EXISTS "Admins insert logs" ON public.verification_logs;
CREATE POLICY "Staff insert logs" ON public.verification_logs
  FOR INSERT WITH CHECK (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "Users view own logs" ON public.verification_logs;
CREATE POLICY "Users view own logs" ON public.verification_logs
  FOR SELECT USING ((auth.uid() = user_id) OR public.has_admin_access(auth.uid()));
