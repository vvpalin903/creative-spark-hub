
-- 1. Add back_office to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'back_office';
