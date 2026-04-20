
-- ============================================================================
-- ЭТАП 1а: Новая модель данных
-- ============================================================================

-- 1. ENUM типы
-- ----------------------------------------------------------------------------

-- Расширяем app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'host';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- Статус верификации пользователя
DO $$ BEGIN
  CREATE TYPE public.user_verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Статусы объектов
DO $$ BEGIN
  CREATE TYPE public.object_status AS ENUM ('draft', 'pending_review', 'needs_changes', 'verified', 'published', 'hidden', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.object_verification_status AS ENUM ('not_submitted', 'pending', 'approved', 'rejected', 'needs_changes');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Режим доступа (расширенный)
DO $$ BEGIN
  CREATE TYPE public.access_mode_ext AS ENUM (
    'free_by_arrangement',
    'pre_approval',
    'host_present_only',
    'self_access',
    'rare_seasonal',
    'weekends_only',
    'weekdays_only',
    'specific_hours'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Расписание (стандартизированное)
DO $$ BEGIN
  CREATE TYPE public.schedule_mode AS ENUM (
    'daily',
    'weekdays',
    'weekends',
    'by_arrangement',
    'mornings_only',
    'daytime_only',
    'evenings_only'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Категория
DO $$ BEGIN
  CREATE TYPE public.storage_category AS ENUM ('tires', 'bikes', 'boxes', 'furniture', 'sport', 'seasonal', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Статус слота
DO $$ BEGIN
  CREATE TYPE public.slot_status AS ENUM ('available', 'reserved', 'occupied', 'unavailable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Статусы заявок
DO $$ BEGIN
  CREATE TYPE public.booking_request_status AS ENUM ('new', 'viewed', 'accepted', 'rejected', 'cancelled', 'completed', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Статусы размещений
DO $$ BEGIN
  CREATE TYPE public.placement_status AS ENUM ('upcoming', 'active', 'completed', 'cancelled', 'disputed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Чаты
DO $$ BEGIN
  CREATE TYPE public.chat_type AS ENUM ('host_client', 'admin_host', 'admin_client', 'support');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.chat_role AS ENUM ('host', 'client', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.message_type AS ENUM ('text', 'system', 'file');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Журнал верификации
DO $$ BEGIN
  CREATE TYPE public.verification_log_type AS ENUM ('phone', 'email', 'identity_doc', 'ownership_doc', 'object_review');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.verification_log_status AS ENUM ('submitted', 'approved', 'rejected', 'needs_changes');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 2. ТАБЛИЦЫ
-- ============================================================================

-- Профили
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  email TEXT,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  verification_status public.user_verification_status NOT NULL DEFAULT 'unverified',
  city TEXT,
  district TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Объекты хранения
CREATE TABLE IF NOT EXISTS public.host_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT,
  district TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  access_mode public.access_mode_ext NOT NULL DEFAULT 'pre_approval',
  schedule_mode public.schedule_mode NOT NULL DEFAULT 'by_arrangement',
  schedule_notes TEXT,
  rules TEXT,
  photos TEXT[] DEFAULT '{}',
  area_sqm NUMERIC,
  verification_status public.object_verification_status NOT NULL DEFAULT 'not_submitted',
  object_status public.object_status NOT NULL DEFAULT 'draft',
  reviewer_notes TEXT,
  hide_token UUID DEFAULT gen_random_uuid(),
  contact_email TEXT,
  contact_phone TEXT,
  contact_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_host_objects_host ON public.host_objects(host_user_id);
CREATE INDEX IF NOT EXISTS idx_host_objects_status ON public.host_objects(object_status);
CREATE INDEX IF NOT EXISTS idx_host_objects_city ON public.host_objects(city);

-- Слоты хранения
CREATE TABLE IF NOT EXISTS public.storage_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id UUID NOT NULL REFERENCES public.host_objects(id) ON DELETE CASCADE,
  category public.storage_category NOT NULL DEFAULT 'other',
  slot_count INTEGER NOT NULL DEFAULT 1,
  slot_status public.slot_status NOT NULL DEFAULT 'available',
  price_monthly INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_slots_object ON public.storage_slots(object_id);
CREATE INDEX IF NOT EXISTS idx_storage_slots_category ON public.storage_slots(category);

-- Заявки на бронирование
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  host_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  object_id UUID REFERENCES public.host_objects(id) ON DELETE SET NULL,
  slot_id UUID REFERENCES public.storage_slots(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  request_status public.booking_request_status NOT NULL DEFAULT 'new',
  start_date DATE,
  end_date DATE,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_requests_client ON public.booking_requests(client_user_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_host ON public.booking_requests(host_user_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_object ON public.booking_requests(object_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON public.booking_requests(request_status);

-- Размещения
CREATE TABLE IF NOT EXISTS public.placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id UUID NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  client_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  host_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  object_id UUID REFERENCES public.host_objects(id) ON DELETE SET NULL,
  slot_id UUID REFERENCES public.storage_slots(id) ON DELETE SET NULL,
  placement_status public.placement_status NOT NULL DEFAULT 'upcoming',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_placements_client ON public.placements(client_user_id);
CREATE INDEX IF NOT EXISTS idx_placements_host ON public.placements(host_user_id);
CREATE INDEX IF NOT EXISTS idx_placements_status ON public.placements(placement_status);

-- Чаты
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_type public.chat_type NOT NULL,
  related_request_id UUID REFERENCES public.booking_requests(id) ON DELETE SET NULL,
  related_object_id UUID REFERENCES public.host_objects(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chats_request ON public.chats(related_request_id);

-- Участники чатов
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_chat public.chat_role NOT NULL,
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_participants_chat ON public.chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON public.chat_participants(user_id);

-- Сообщения
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message_text TEXT NOT NULL,
  message_type public.message_type NOT NULL DEFAULT 'text',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);

-- Журнал верификации
CREATE TABLE IF NOT EXISTS public.verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  object_id UUID REFERENCES public.host_objects(id) ON DELETE CASCADE,
  verification_type public.verification_log_type NOT NULL,
  verification_status public.verification_log_status NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_logs_user ON public.verification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_object ON public.verification_logs(object_id);

-- ============================================================================
-- 3. RLS
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- host_objects
CREATE POLICY "Anyone can view published objects" ON public.host_objects
  FOR SELECT USING (object_status = 'published');
CREATE POLICY "Hosts can view own objects" ON public.host_objects
  FOR SELECT USING (auth.uid() = host_user_id);
CREATE POLICY "Admins can view all objects" ON public.host_objects
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Hosts can insert own objects" ON public.host_objects
  FOR INSERT WITH CHECK (auth.uid() = host_user_id);
CREATE POLICY "Anonymous can insert objects" ON public.host_objects
  FOR INSERT TO anon WITH CHECK (host_user_id IS NULL);
CREATE POLICY "Hosts can update own objects" ON public.host_objects
  FOR UPDATE USING (auth.uid() = host_user_id);
CREATE POLICY "Admins manage all objects" ON public.host_objects
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- storage_slots: видимость по объекту
CREATE POLICY "Slots visible if object visible" ON public.storage_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.host_objects o
      WHERE o.id = object_id
        AND (o.object_status = 'published' OR o.host_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY "Hosts manage slots of own objects" ON public.storage_slots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.host_objects o WHERE o.id = object_id AND o.host_user_id = auth.uid())
  );
CREATE POLICY "Admins manage all slots" ON public.storage_slots
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- booking_requests
CREATE POLICY "Clients view own requests" ON public.booking_requests
  FOR SELECT USING (auth.uid() = client_user_id);
CREATE POLICY "Hosts view requests for their objects" ON public.booking_requests
  FOR SELECT USING (auth.uid() = host_user_id);
CREATE POLICY "Admins view all requests" ON public.booking_requests
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can create requests" ON public.booking_requests
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Clients update own requests" ON public.booking_requests
  FOR UPDATE USING (auth.uid() = client_user_id);
CREATE POLICY "Hosts update requests for own objects" ON public.booking_requests
  FOR UPDATE USING (auth.uid() = host_user_id);
CREATE POLICY "Admins update all requests" ON public.booking_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- placements
CREATE POLICY "Participants view own placements" ON public.placements
  FOR SELECT USING (auth.uid() = client_user_id OR auth.uid() = host_user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Hosts update own placements" ON public.placements
  FOR UPDATE USING (auth.uid() = host_user_id);
CREATE POLICY "Admins manage all placements" ON public.placements
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- chats: видны участникам через chat_participants
CREATE OR REPLACE FUNCTION public.is_chat_participant(_chat_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = _chat_id AND user_id = _user_id);
$$;

CREATE POLICY "Participants view chat" ON public.chats
  FOR SELECT USING (public.is_chat_participant(id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can create chat" ON public.chats
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins manage chats" ON public.chats
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- chat_participants
CREATE POLICY "Participants view own membership" ON public.chat_participants
  FOR SELECT USING (auth.uid() = user_id OR public.is_chat_participant(chat_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can add participants" ON public.chat_participants
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users update own participant row" ON public.chat_participants
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage participants" ON public.chat_participants
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- messages
CREATE POLICY "Participants view chat messages" ON public.messages
  FOR SELECT USING (public.is_chat_participant(chat_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Participants send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_user_id AND public.is_chat_participant(chat_id, auth.uid())
  );
CREATE POLICY "Senders update own messages" ON public.messages
  FOR UPDATE USING (auth.uid() = sender_user_id);
CREATE POLICY "Admins manage messages" ON public.messages
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- verification_logs
CREATE POLICY "Users view own logs" ON public.verification_logs
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert logs" ON public.verification_logs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert logs" ON public.verification_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. ТРИГГЕРЫ updated_at
-- ============================================================================

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_host_objects_updated_at BEFORE UPDATE ON public.host_objects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_storage_slots_updated_at BEFORE UPDATE ON public.storage_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_booking_requests_updated_at BEFORE UPDATE ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_placements_updated_at BEFORE UPDATE ON public.placements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. АВТОСОЗДАНИЕ ПРОФИЛЯ ПРИ РЕГИСТРАЦИИ
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (user_id, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Назначаем роль из метаданных, по умолчанию client
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'client');
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 6. МИГРАЦИЯ ДАННЫХ
-- ============================================================================

-- 6.1 lots -> host_objects + storage_slots
INSERT INTO public.host_objects (
  id, host_user_id, title, description, address, city, lat, lng,
  access_mode, schedule_mode, schedule_notes, rules, photos, area_sqm,
  verification_status, object_status, contact_email, hide_token,
  created_at, updated_at
)
SELECT
  l.id,
  l.host_id,
  l.title,
  l.description,
  l.address,
  CASE WHEN l.address ILIKE '%мытищ%' THEN 'Мытищи' ELSE NULL END,
  l.lat, l.lng,
  CASE l.access_mode
    WHEN '24/7' THEN 'self_access'::public.access_mode_ext
    WHEN 'scheduled' THEN 'pre_approval'::public.access_mode_ext
  END,
  'by_arrangement'::public.schedule_mode,
  l.schedule,
  l.rules,
  COALESCE(l.photos, '{}'),
  l.area_sqm,
  'approved'::public.object_verification_status,
  CASE l.status
    WHEN 'draft' THEN 'draft'::public.object_status
    WHEN 'published' THEN 'published'::public.object_status
    WHEN 'archived' THEN 'archived'::public.object_status
  END,
  l.host_email,
  l.hide_token,
  l.created_at, l.updated_at
FROM public.lots l
ON CONFLICT (id) DO NOTHING;

-- слоты для каждого лота
INSERT INTO public.storage_slots (object_id, category, slot_count, slot_status, price_monthly, created_at, updated_at)
SELECT
  l.id,
  CASE l.category
    WHEN 'tires' THEN 'tires'::public.storage_category
    WHEN 'bikes' THEN 'bikes'::public.storage_category
    ELSE 'other'::public.storage_category
  END,
  1,
  'available'::public.slot_status,
  l.price_monthly,
  l.created_at, l.updated_at
FROM public.lots l
WHERE NOT EXISTS (SELECT 1 FROM public.storage_slots s WHERE s.object_id = l.id);

-- 6.2 host_applications -> host_objects (только те, что ещё не в host_objects по адресу+host)
INSERT INTO public.host_objects (
  host_user_id, title, address, city, lat, lng,
  access_mode, schedule_mode, schedule_notes, photos,
  verification_status, object_status, contact_email, contact_name, contact_phone,
  created_at, updated_at
)
SELECT
  ha.user_id,
  'Объект — ' || ha.address,
  ha.address,
  CASE WHEN ha.address ILIKE '%мытищ%' THEN 'Мытищи' ELSE NULL END,
  ha.lat, ha.lng,
  CASE ha.access_mode
    WHEN '24/7' THEN 'self_access'::public.access_mode_ext
    WHEN 'scheduled' THEN 'pre_approval'::public.access_mode_ext
  END,
  'by_arrangement'::public.schedule_mode,
  ha.schedule,
  COALESCE(ha.photos, '{}'),
  CASE ha.status
    WHEN 'new' THEN 'pending'::public.object_verification_status
    WHEN 'verified' THEN 'approved'::public.object_verification_status
    WHEN 'rejected' THEN 'rejected'::public.object_verification_status
  END,
  CASE ha.status
    WHEN 'new' THEN 'pending_review'::public.object_status
    WHEN 'verified' THEN 'published'::public.object_status
    WHEN 'rejected' THEN 'archived'::public.object_status
  END,
  ha.host_email, ha.host_name, ha.host_phone,
  ha.created_at, ha.updated_at
FROM public.host_applications ha
WHERE NOT EXISTS (
  SELECT 1 FROM public.host_objects ho
  WHERE ho.address = ha.address
    AND COALESCE(ho.host_user_id::text, '') = COALESCE(ha.user_id::text, '')
);

-- слоты для перенесённых заявок хостов (по 1 шт.)
INSERT INTO public.storage_slots (object_id, category, slot_count, slot_status, price_monthly, created_at, updated_at)
SELECT
  ho.id,
  CASE 
    WHEN ho.title ILIKE '%шин%' OR ho.title ILIKE '%tire%' THEN 'tires'::public.storage_category
    WHEN ho.title ILIKE '%вело%' OR ho.title ILIKE '%bike%' THEN 'bikes'::public.storage_category
    ELSE 'other'::public.storage_category
  END,
  1, 'available'::public.slot_status, 0,
  ho.created_at, ho.updated_at
FROM public.host_objects ho
WHERE NOT EXISTS (SELECT 1 FROM public.storage_slots s WHERE s.object_id = ho.id);

-- 6.3 client_applications -> booking_requests
INSERT INTO public.booking_requests (
  id, client_user_id, host_user_id, object_id, slot_id,
  client_name, client_phone, client_email,
  request_status, start_date, comment,
  created_at, updated_at
)
SELECT
  ca.id,
  NULL, -- старые заявки от анонимов
  (SELECT host_user_id FROM public.host_objects WHERE id = ca.lot_id),
  ca.lot_id,
  (SELECT id FROM public.storage_slots WHERE object_id = ca.lot_id LIMIT 1),
  ca.client_name, ca.client_phone, ca.client_email,
  CASE ca.status
    WHEN 'new' THEN 'new'::public.booking_request_status
    WHEN 'sent_to_host' THEN 'viewed'::public.booking_request_status
    WHEN 'completed' THEN 'completed'::public.booking_request_status
    WHEN 'rejected' THEN 'rejected'::public.booking_request_status
  END,
  ca.desired_date, ca.comment,
  ca.created_at, ca.updated_at
FROM public.client_applications ca
ON CONFLICT (id) DO NOTHING;
