-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create email accounts table
CREATE TABLE public.email_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  imap_host TEXT NOT NULL,
  imap_port INTEGER NOT NULL DEFAULT 993,
  imap_username TEXT NOT NULL,
  imap_password TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, email)
);

-- Create email categories enum
CREATE TYPE email_category AS ENUM ('interested', 'meeting_booked', 'not_interested', 'spam', 'out_of_office', 'uncategorized');

-- Create emails table with full-text search
CREATE TABLE public.emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT,
  subject TEXT,
  body TEXT,
  folder TEXT NOT NULL DEFAULT 'INBOX',
  category email_category NOT NULL DEFAULT 'uncategorized',
  is_read BOOLEAN NOT NULL DEFAULT false,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  search_vector tsvector,
  UNIQUE(account_id, message_id)
);

-- Create index for full-text search
CREATE INDEX emails_search_idx ON public.emails USING GIN (search_vector);
CREATE INDEX emails_category_idx ON public.emails (category);
CREATE INDEX emails_user_id_idx ON public.emails (user_id);
CREATE INDEX emails_account_id_idx ON public.emails (account_id);
CREATE INDEX emails_received_at_idx ON public.emails (received_at DESC);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_email_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.subject, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.from_address, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for search vector
CREATE TRIGGER emails_search_vector_update
  BEFORE INSERT OR UPDATE ON public.emails
  FOR EACH ROW
  EXECUTE FUNCTION update_email_search_vector();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_email_accounts_updated_at
  BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emails_updated_at
  BEFORE UPDATE ON public.emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create webhook notifications table
CREATE TABLE public.webhook_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_accounts
CREATE POLICY "Users can view their own email accounts"
  ON public.email_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email accounts"
  ON public.email_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email accounts"
  ON public.email_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email accounts"
  ON public.email_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for emails
CREATE POLICY "Users can view their own emails"
  ON public.emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emails"
  ON public.emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emails"
  ON public.emails FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emails"
  ON public.emails FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for webhook_notifications
CREATE POLICY "Users can view their own webhook notifications"
  ON public.webhook_notifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.emails
    WHERE emails.id = webhook_notifications.email_id
    AND emails.user_id = auth.uid()
  ));

-- Enable realtime for emails table
ALTER PUBLICATION supabase_realtime ADD TABLE public.emails;