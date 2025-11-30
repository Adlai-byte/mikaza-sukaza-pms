-- Messages System Migration
-- Creates tables for internal messaging between users

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  message_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Thread management
  thread_id UUID REFERENCES messages(message_id) ON DELETE CASCADE,
  parent_id UUID REFERENCES messages(message_id) ON DELETE CASCADE,

  -- Sender/Recipients
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  subject VARCHAR(255),
  body TEXT NOT NULL,

  -- Related entities (optional)
  property_id UUID REFERENCES properties(property_id) ON DELETE SET NULL,
  booking_id UUID REFERENCES property_bookings(booking_id) ON DELETE SET NULL,

  -- Priority and status
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message recipients table (for multi-recipient support)
CREATE TABLE IF NOT EXISTS message_recipients (
  recipient_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES messages(message_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Read status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Archive/Delete
  is_archived BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,

  -- Starred for important messages
  is_starred BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(message_id, user_id)
);

-- Message attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
  attachment_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES messages(message_id) ON DELETE CASCADE,

  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_sender_id') THEN
    CREATE INDEX idx_messages_sender_id ON messages(sender_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_thread_id') THEN
    CREATE INDEX idx_messages_thread_id ON messages(thread_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_created_at') THEN
    CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_message_recipients_user_id') THEN
    CREATE INDEX idx_message_recipients_user_id ON message_recipients(user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_message_recipients_message_id') THEN
    CREATE INDEX idx_message_recipients_message_id ON message_recipients(message_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_message_recipients_is_read') THEN
    CREATE INDEX idx_message_recipients_is_read ON message_recipients(user_id, is_read) WHERE is_read = FALSE;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
DROP POLICY IF EXISTS "Users can view messages they sent" ON messages;
CREATE POLICY "Users can view messages they sent"
  ON messages FOR SELECT
  USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can view messages they received" ON messages;
CREATE POLICY "Users can view messages they received"
  ON messages FOR SELECT
  USING (
    message_id IN (
      SELECT message_id FROM message_recipients WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert messages" ON messages;
CREATE POLICY "Users can insert messages"
  ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- RLS Policies for message_recipients
DROP POLICY IF EXISTS "Users can view their own recipient records" ON message_recipients;
CREATE POLICY "Users can view their own recipient records"
  ON message_recipients FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Senders can insert recipients" ON message_recipients;
CREATE POLICY "Senders can insert recipients"
  ON message_recipients FOR INSERT
  WITH CHECK (
    message_id IN (
      SELECT message_id FROM messages WHERE sender_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own recipient records" ON message_recipients;
CREATE POLICY "Users can update their own recipient records"
  ON message_recipients FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for message_attachments
DROP POLICY IF EXISTS "Users can view attachments for their messages" ON message_attachments;
CREATE POLICY "Users can view attachments for their messages"
  ON message_attachments FOR SELECT
  USING (
    message_id IN (
      SELECT message_id FROM messages WHERE sender_id = auth.uid()
      UNION
      SELECT message_id FROM message_recipients WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Senders can insert attachments" ON message_attachments;
CREATE POLICY "Senders can insert attachments"
  ON message_attachments FOR INSERT
  WITH CHECK (
    message_id IN (
      SELECT message_id FROM messages WHERE sender_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_messages_updated_at ON messages;
CREATE TRIGGER trigger_update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();

-- Comments
COMMENT ON TABLE messages IS 'Internal messaging system for user communication';
COMMENT ON TABLE message_recipients IS 'Recipients and read status for messages';
COMMENT ON TABLE message_attachments IS 'File attachments for messages';
