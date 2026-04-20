CREATE OR REPLACE FUNCTION public.get_host_public_stats(_host_user_id uuid)
RETURNS TABLE(published_objects bigint, completed_placements bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.host_objects
       WHERE host_user_id = _host_user_id AND object_status = 'published')::bigint,
    (SELECT COUNT(*) FROM public.placements
       WHERE host_user_id = _host_user_id AND placement_status = 'completed')::bigint;
$$;