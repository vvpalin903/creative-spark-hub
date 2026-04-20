-- Reviews table: bidirectional client↔host reviews after placement completed
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  placement_id UUID NOT NULL REFERENCES public.placements(id) ON DELETE CASCADE,
  rater_user_id UUID NOT NULL,
  ratee_user_id UUID NOT NULL,
  rater_role public.chat_role NOT NULL, -- 'host' or 'client'
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (placement_id, rater_user_id)
);

CREATE INDEX idx_reviews_ratee ON public.reviews(ratee_user_id);
CREATE INDEX idx_reviews_placement ON public.reviews(placement_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews (used for public host rating on lot pages)
CREATE POLICY "Reviews are publicly viewable"
ON public.reviews
FOR SELECT
USING (true);

-- Only the rater (a participant of the completed placement) can insert their review
CREATE POLICY "Participants insert their review on completed placement"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = rater_user_id
  AND EXISTS (
    SELECT 1 FROM public.placements p
    WHERE p.id = reviews.placement_id
      AND p.placement_status = 'completed'
      AND (
        (rater_role = 'client' AND p.client_user_id = auth.uid() AND ratee_user_id = p.host_user_id)
        OR (rater_role = 'host' AND p.host_user_id = auth.uid() AND ratee_user_id = p.client_user_id)
      )
  )
);

-- Rater can edit their own review
CREATE POLICY "Rater updates own review"
ON public.reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = rater_user_id);

-- Admins manage all
CREATE POLICY "Admins manage all reviews"
ON public.reviews
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Public RPC: get host aggregate rating (avg + count)
CREATE OR REPLACE FUNCTION public.get_host_rating(_host_user_id UUID)
RETURNS TABLE (avg_rating NUMERIC, review_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROUND(AVG(rating)::numeric, 1) AS avg_rating,
    COUNT(*)::bigint AS review_count
  FROM public.reviews
  WHERE ratee_user_id = _host_user_id
    AND rater_role = 'client';
$$;

-- Allow cancellation: extend booking_requests UPDATE policy already covers clients (existing policy "Clients update own requests")
-- No schema change needed for cancellation; status set to 'cancelled' from app code.