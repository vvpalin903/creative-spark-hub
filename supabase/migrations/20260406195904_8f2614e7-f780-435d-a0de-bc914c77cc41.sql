
-- Enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Enum for lot categories
CREATE TYPE public.lot_category AS ENUM ('tires', 'bikes', 'other');

-- Enum for access modes
CREATE TYPE public.access_mode AS ENUM ('24/7', 'scheduled');

-- Enum for lot status
CREATE TYPE public.lot_status AS ENUM ('draft', 'published', 'archived');

-- Enum for application status
CREATE TYPE public.client_app_status AS ENUM ('new', 'sent_to_host', 'completed', 'rejected');

-- Enum for host application status
CREATE TYPE public.host_app_status AS ENUM ('new', 'verified', 'rejected');

-- Enum for verification status
CREATE TYPE public.verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Lots table
CREATE TABLE public.lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category lot_category NOT NULL DEFAULT 'other',
  address TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  price_monthly INTEGER NOT NULL,
  access_mode access_mode NOT NULL DEFAULT '24/7',
  schedule TEXT,
  photos TEXT[] DEFAULT '{}',
  rules TEXT,
  status lot_status NOT NULL DEFAULT 'draft',
  host_id UUID REFERENCES auth.users(id),
  is_mytishchi BOOLEAN NOT NULL DEFAULT true,
  area_sqm NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_lots_updated_at
BEFORE UPDATE ON public.lots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anyone can view published lots"
ON public.lots FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can do anything with lots"
ON public.lots FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Client applications
CREATE TABLE public.client_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  category lot_category,
  desired_date DATE,
  comment TEXT,
  status client_app_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_applications ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_client_applications_updated_at
BEFORE UPDATE ON public.client_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anyone can create client applications"
ON public.client_applications FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all client applications"
ON public.client_applications FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update client applications"
ON public.client_applications FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Host applications
CREATE TABLE public.host_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  host_name TEXT NOT NULL,
  host_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  place_type TEXT,
  category lot_category NOT NULL DEFAULT 'other',
  access_mode access_mode NOT NULL DEFAULT '24/7',
  schedule TEXT,
  photos TEXT[] DEFAULT '{}',
  status host_app_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.host_applications ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_host_applications_updated_at
BEFORE UPDATE ON public.host_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anyone can create host applications"
ON public.host_applications FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all host applications"
ON public.host_applications FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update host applications"
ON public.host_applications FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Verification documents
CREATE TABLE public.verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status verification_status NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_verification_documents_updated_at
BEFORE UPDATE ON public.verification_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users can view their own documents"
ON public.verification_documents FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can upload their own documents"
ON public.verification_documents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update verification documents"
ON public.verification_documents FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Site documents (legal pages)
CREATE TABLE public.site_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_documents ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_site_documents_updated_at
BEFORE UPDATE ON public.site_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anyone can view active site documents"
ON public.site_documents FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage site documents"
ON public.site_documents FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('lot-photos', 'lot-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-docs', 'verification-docs', false);

-- Storage policies
CREATE POLICY "Lot photos are publicly accessible"
ON storage.objects FOR SELECT USING (bucket_id = 'lot-photos');

CREATE POLICY "Admins can upload lot photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lot-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update lot photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lot-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete lot photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lot-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can upload verification docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own verification docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'verification-docs' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
