-- ============================================================
-- MNIT SHOP: Notifications Table Setup
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receiver_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  message      TEXT NOT NULL,
  metadata     JSONB DEFAULT '{}'::jsonb,
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = receiver_id);
