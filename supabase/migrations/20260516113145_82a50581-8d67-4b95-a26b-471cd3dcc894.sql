-- Enum статусов
CREATE TYPE public.ticket_status AS ENUM ('new', 'in_progress', 'closed');

-- Таблица обращений
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  initiator_user_id uuid NOT NULL,
  object_id uuid REFERENCES public.host_objects(id) ON DELETE SET NULL,
  placement_id uuid REFERENCES public.placements(id) ON DELETE SET NULL,
  status public.ticket_status NOT NULL DEFAULT 'new',
  created_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_initiator ON public.tickets(initiator_user_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at DESC);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Пользователь видит свои обращения (где он инициатор)
CREATE POLICY "Users view own tickets"
ON public.tickets FOR SELECT
USING (auth.uid() = initiator_user_id);

-- Пользователь создаёт обращение от своего имени
CREATE POLICY "Users create own tickets"
ON public.tickets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = initiator_user_id AND auth.uid() = created_by_user_id);

-- Админы/бэк-офис видят все обращения
CREATE POLICY "Staff view all tickets"
ON public.tickets FOR SELECT
USING (public.has_admin_access(auth.uid()));

-- Админы/бэк-офис создают обращения от любого инициатора
CREATE POLICY "Staff create tickets"
ON public.tickets FOR INSERT
TO authenticated
WITH CHECK (public.has_admin_access(auth.uid()) AND auth.uid() = created_by_user_id);

-- Админы/бэк-офис обновляют (смена статуса)
CREATE POLICY "Staff update tickets"
ON public.tickets FOR UPDATE
USING (public.has_admin_access(auth.uid()));

-- Триггер updated_at
CREATE TRIGGER trg_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();