-- P0.3: Worker documents + verification audit log
CREATE TABLE IF NOT EXISTS public.worker_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('id_front', 'id_back', 'avatar', 'certificate', 'selfie', 'other')),
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  is_current BOOLEAN DEFAULT true,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id),
  notes TEXT
);

ALTER TABLE public.worker_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON public.worker_documents
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own documents" ON public.worker_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON public.worker_documents
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can delete documents" ON public.worker_documents
  FOR DELETE USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_worker_documents_user ON public.worker_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_documents_current ON public.worker_documents(user_id, is_current);
CREATE INDEX IF NOT EXISTS idx_worker_documents_type ON public.worker_documents(document_type);

-- Verification audit log
CREATE TABLE IF NOT EXISTS public.verification_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'resubmitted', 'document_uploaded', 'info_updated')),
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  admin_id UUID REFERENCES public.profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.verification_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit log" ON public.verification_audit_log
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Admins can insert audit log" ON public.verification_audit_log
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Trigger can insert audit log" ON public.verification_audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_verification_audit_user ON public.verification_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_audit_created ON public.verification_audit_log(created_at DESC);

-- Add missing profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS dob DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Vietnam',
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_holder TEXT;
