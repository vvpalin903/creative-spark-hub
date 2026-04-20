-- Drop legacy trigger functions (CASCADE removes any attached triggers)
DROP FUNCTION IF EXISTS public.create_lot_from_host_application_insert() CASCADE;
DROP FUNCTION IF EXISTS public.create_lot_from_host_application() CASCADE;
DROP FUNCTION IF EXISTS public.auto_verify_non_mytishchi() CASCADE;

-- Drop legacy tables (data already migrated)
DROP TABLE IF EXISTS public.client_applications CASCADE;
DROP TABLE IF EXISTS public.host_applications CASCADE;
DROP TABLE IF EXISTS public.lots CASCADE;