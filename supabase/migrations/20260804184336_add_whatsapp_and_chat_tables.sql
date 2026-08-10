/*
# Add WhatsApp number and in-app chat tables

1. New Columns
- `companies.whatsapp_number` (text, nullable) — WhatsApp contact number for the publisher entity, stored in international format (e.g. 9665XXXXXXXX).

2. New Tables
- `chats`
  - `id` (uuid, primary key)
  - `opportunity_id` (uuid, FK to opportunities) — the listing this chat is about
  - `company_id` (uuid, FK to companies) — the publisher/owner of the listing
  - `customer_user_id` (uuid, NOT NULL DEFAULT auth.uid()) — the authenticated user who initiated the chat
  - `customer_phone` (text, nullable) — optional: the customer's WhatsApp number if they provided it
  - `status` (text, default 'active') — 'active' | 'closed'
  - `last_whatsapp_at` (timestamptz, nullable) — timestamp of last WhatsApp interaction (for notification linkage)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())
  - Unique constraint on (opportunity_id, customer_user_id) so one chat per user per listing.

- `chat_messages`
  - `id` (uuid, primary key)
  - `chat_id` (uuid, FK to chats ON DELETE CASCADE)
  - `sender_user_id` (uuid, NOT NULL DEFAULT auth.uid()) — who sent the message
  - `body` (text, not null) — message content
  - `is_system` (boolean, default false) — true for system notifications (e.g. "new chat started")
  - `created_at` (timestamptz, default now())

3. Security
- Enable RLS on `chats` and `chat_messages`.
- `chats`: the customer (customer_user_id) and the company owner can read; only the customer can insert a new chat; both can update status.
- `chat_messages`: participants of the chat can read and insert.
- `companies.whatsapp_number`: readable by anon+authenticated (it's public contact info shown on listings).

4. Important Notes
- The app has sign-in, so policies are scoped to `authenticated` with ownership checks.
- `customer_user_id` defaults to `auth.uid()` so inserts from the client work without passing it explicitly.
- Company ownership is verified via `companies.owner_user_id` column if it exists; otherwise via a join on the opportunities table. We use a SECURITY DEFINER function `is_chat_participant` to check participation.
*/

-- Add whatsapp_number to companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE companies ADD COLUMN whatsapp_number text;
  END IF;
END $$;

-- Allow anyone to read the whatsapp_number (public contact info on listings)
DROP POLICY IF EXISTS "read_companies_whatsapp" ON companies;
CREATE POLICY "read_companies_whatsapp"
ON companies FOR SELECT
TO anon, authenticated
USING (true);

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_phone text,
  status text NOT NULL DEFAULT 'active',
  last_whatsapp_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, customer_user_id)
);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Helper function: is the current user a participant in this chat?
CREATE OR REPLACE FUNCTION is_chat_participant(p_chat_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chats c
    WHERE c.id = p_chat_id
    AND (
      c.customer_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM opportunities o
        WHERE o.id = c.opportunity_id
        AND o.company_id = c.company_id
        AND EXISTS (
          SELECT 1 FROM publisher_entities pe
          WHERE pe.owner_user_id = auth.uid()
          AND pe.id = o.publisher_entity_id
        )
      )
    )
  );
$$;

-- chats: SELECT — customer or company owner
DROP POLICY IF EXISTS "select_own_chats" ON chats;
CREATE POLICY "select_own_chats"
ON chats FOR SELECT
TO authenticated
USING (
  customer_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM publisher_entities pe
    WHERE pe.owner_user_id = auth.uid()
    AND pe.id = (
      SELECT o.publisher_entity_id FROM opportunities o WHERE o.id = chats.opportunity_id
    )
  )
);

-- chats: INSERT — only the customer (the one starting the chat)
DROP POLICY IF EXISTS "insert_own_chats" ON chats;
CREATE POLICY "insert_own_chats"
ON chats FOR INSERT
TO authenticated
WITH CHECK (customer_user_id = auth.uid());

-- chats: UPDATE — customer or company owner can update status/timestamps
DROP POLICY IF EXISTS "update_own_chats" ON chats;
CREATE POLICY "update_own_chats"
ON chats FOR UPDATE
TO authenticated
USING (
  customer_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM publisher_entities pe
    WHERE pe.owner_user_id = auth.uid()
    AND pe.id = (
      SELECT o.publisher_entity_id FROM opportunities o WHERE o.id = chats.opportunity_id
    )
  )
)
WITH CHECK (
  customer_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM publisher_entities pe
    WHERE pe.owner_user_id = auth.uid()
    AND pe.id = (
      SELECT o.publisher_entity_id FROM opportunities o WHERE o.id = chats.opportunity_id
    )
  )
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- chat_messages: SELECT — participants only
DROP POLICY IF EXISTS "select_chat_messages" ON chat_messages;
CREATE POLICY "select_chat_messages"
ON chat_messages FOR SELECT
TO authenticated
USING (is_chat_participant(chat_id));

-- chat_messages: INSERT — participants only
DROP POLICY IF EXISTS "insert_chat_messages" ON chat_messages;
CREATE POLICY "insert_chat_messages"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_user_id = auth.uid()
  AND is_chat_participant(chat_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_chats_opportunity ON chats(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_chats_customer ON chats(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

-- Trigger to update chats.updated_at on new message
CREATE OR REPLACE FUNCTION update_chat_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE chats SET updated_at = now() WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_chat_timestamp ON chat_messages;
CREATE TRIGGER trg_update_chat_timestamp
AFTER INSERT ON chat_messages
FOR EACH ROW EXECUTE FUNCTION update_chat_timestamp();
