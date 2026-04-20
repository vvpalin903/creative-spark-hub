-- Drop legacy triggers that auto-create lots from host_applications (we don't use lots anymore in the new flow)
DROP TRIGGER IF EXISTS create_lot_on_host_app_verified ON public.host_applications;
DROP TRIGGER IF EXISTS create_lot_on_host_app_insert ON public.host_applications;
DROP TRIGGER IF EXISTS auto_verify_non_mytishchi_trigger ON public.host_applications;

-- Add updated_at triggers for new tables
DROP TRIGGER IF EXISTS update_host_objects_updated_at ON public.host_objects;
CREATE TRIGGER update_host_objects_updated_at BEFORE UPDATE ON public.host_objects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_storage_slots_updated_at ON public.storage_slots;
CREATE TRIGGER update_storage_slots_updated_at BEFORE UPDATE ON public.storage_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_booking_requests_updated_at ON public.booking_requests;
CREATE TRIGGER update_booking_requests_updated_at BEFORE UPDATE ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_placements_updated_at ON public.placements;
CREATE TRIGGER update_placements_updated_at BEFORE UPDATE ON public.placements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile on signup (the function handle_new_user already exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow public to view profiles of hosts (only name) when their object is published — needed for showing host name on lot detail
CREATE POLICY "Public can view host profile names of published objects"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.host_objects o
    WHERE o.host_user_id = profiles.user_id
      AND o.object_status = 'published'
  )
);

-- Add price_monthly to host_objects-derived view via storage_slots: ensure storage_slots has min price index
CREATE INDEX IF NOT EXISTS idx_storage_slots_object_id ON public.storage_slots(object_id);
CREATE INDEX IF NOT EXISTS idx_host_objects_status ON public.host_objects(object_status);
CREATE INDEX IF NOT EXISTS idx_host_objects_host_user_id ON public.host_objects(host_user_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_client ON public.booking_requests(client_user_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_host ON public.booking_requests(host_user_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_object ON public.booking_requests(object_id);