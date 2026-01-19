-- Fix infinite recursion in messages RLS policies
-- The issue is circular dependency between messages and message_recipients policies

-- Create SECURITY DEFINER helper functions to break the recursion
-- These functions bypass RLS when checking ownership

-- Helper function to check if user is sender of a message
CREATE OR REPLACE FUNCTION is_message_sender(p_message_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM messages
    WHERE message_id = p_message_id
    AND sender_id = p_user_id
  );
$$;

-- Helper function to check if user is recipient of a message
CREATE OR REPLACE FUNCTION is_message_recipient(p_message_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM message_recipients
    WHERE message_id = p_message_id
    AND user_id = p_user_id
  );
$$;

-- Helper function to get message IDs where user is recipient
CREATE OR REPLACE FUNCTION get_user_message_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT message_id FROM message_recipients WHERE user_id = p_user_id;
$$;

-- Helper function to get message IDs where user is sender
CREATE OR REPLACE FUNCTION get_sender_message_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT message_id FROM messages WHERE sender_id = p_user_id;
$$;

-- Drop existing policies on messages
DROP POLICY IF EXISTS "Users can view messages they sent" ON messages;
DROP POLICY IF EXISTS "Users can view messages they received" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

-- Drop existing policies on message_recipients
DROP POLICY IF EXISTS "Users can view their own recipient records" ON message_recipients;
DROP POLICY IF EXISTS "Senders can view recipient records" ON message_recipients;
DROP POLICY IF EXISTS "Senders can insert recipients" ON message_recipients;
DROP POLICY IF EXISTS "Users can update their own recipient records" ON message_recipients;

-- Drop existing policies on message_attachments
DROP POLICY IF EXISTS "Users can view attachments for their messages" ON message_attachments;
DROP POLICY IF EXISTS "Senders can insert attachments" ON message_attachments;

-- Recreate messages policies (using helper functions)
CREATE POLICY "Users can view messages they sent"
  ON messages FOR SELECT
  USING (sender_id = auth.uid());

CREATE POLICY "Users can view messages they received"
  ON messages FOR SELECT
  USING (message_id IN (SELECT get_user_message_ids(auth.uid())));

CREATE POLICY "Users can insert messages"
  ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Recreate message_recipients policies (using helper functions)
-- Recipients can view their own records
CREATE POLICY "Users can view their own recipient records"
  ON message_recipients FOR SELECT
  USING (user_id = auth.uid());

-- Senders can view recipient records for messages they sent (to see who received their messages)
CREATE POLICY "Senders can view recipient records"
  ON message_recipients FOR SELECT
  USING (message_id IN (SELECT get_sender_message_ids(auth.uid())));

CREATE POLICY "Senders can insert recipients"
  ON message_recipients FOR INSERT
  WITH CHECK (is_message_sender(message_id, auth.uid()));

CREATE POLICY "Users can update their own recipient records"
  ON message_recipients FOR UPDATE
  USING (user_id = auth.uid());

-- Recreate message_attachments policies (using helper functions)
CREATE POLICY "Users can view attachments for their messages"
  ON message_attachments FOR SELECT
  USING (
    is_message_sender(message_id, auth.uid())
    OR is_message_recipient(message_id, auth.uid())
  );

CREATE POLICY "Senders can insert attachments"
  ON message_attachments FOR INSERT
  WITH CHECK (is_message_sender(message_id, auth.uid()));

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION is_message_sender(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_message_recipient(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_message_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sender_message_ids(UUID) TO authenticated;

-- Add comments
COMMENT ON FUNCTION is_message_sender IS 'SECURITY DEFINER helper to check message ownership without RLS recursion';
COMMENT ON FUNCTION is_message_recipient IS 'SECURITY DEFINER helper to check recipient status without RLS recursion';
COMMENT ON FUNCTION get_user_message_ids IS 'SECURITY DEFINER helper to get user message IDs without RLS recursion';
COMMENT ON FUNCTION get_sender_message_ids IS 'SECURITY DEFINER helper to get sender message IDs without RLS recursion';
