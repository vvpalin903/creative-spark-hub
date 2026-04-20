-- Лог отправленных email-уведомлений о непрочитанных сообщениях для троттлинга
CREATE TABLE public.chat_email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL,
  chat_id uuid NOT NULL,
  last_notified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipient_user_id, chat_id)
);

ALTER TABLE public.chat_email_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notification log"
  ON public.chat_email_notifications FOR SELECT
  USING (auth.uid() = recipient_user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage notification log"
  ON public.chat_email_notifications FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Включаем pg_cron и pg_net для регулярного запуска edge-функции
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;