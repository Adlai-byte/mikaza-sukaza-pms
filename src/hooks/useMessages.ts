import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface Message {
  message_id: string;
  thread_id: string | null;
  parent_id: string | null;
  sender_id: string;
  subject: string | null;
  body: string;
  property_id: string | null;
  booking_id: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  // Joined data
  sender?: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
  recipients?: MessageRecipient[];
  attachments?: MessageAttachment[];
  property?: {
    property_id: string;
    property_name: string;
  };
  // For inbox view
  is_read?: boolean;
  is_starred?: boolean;
  is_archived?: boolean;
}

export interface MessageRecipient {
  recipient_id: string;
  message_id: string;
  user_id: string;
  is_read: boolean;
  read_at: string | null;
  is_archived: boolean;
  is_deleted: boolean;
  is_starred: boolean;
  created_at: string;
  user?: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface MessageAttachment {
  attachment_id: string;
  message_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export interface MessageInsert {
  subject?: string;
  body: string;
  recipient_ids: string[];
  property_id?: string;
  booking_id?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  thread_id?: string;
  parent_id?: string;
}

// Query keys
export const messageKeys = {
  all: ['messages'] as const,
  inbox: () => [...messageKeys.all, 'inbox'] as const,
  sent: () => [...messageKeys.all, 'sent'] as const,
  starred: () => [...messageKeys.all, 'starred'] as const,
  archived: () => [...messageKeys.all, 'archived'] as const,
  thread: (threadId: string) => [...messageKeys.all, 'thread', threadId] as const,
  detail: (id: string) => [...messageKeys.all, 'detail', id] as const,
  unreadCount: () => [...messageKeys.all, 'unreadCount'] as const,
};

// Fetch inbox messages (received by current user)
const fetchInboxMessages = async (userId: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('message_recipients')
    .select(`
      *,
      message:messages(
        *,
        sender:users!messages_sender_id_fkey(user_id, first_name, last_name, email, avatar_url),
        property:properties(property_id, property_name)
      )
    `)
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Transform data to flatten message with recipient status
  return (data || []).map((item: any) => ({
    ...item.message,
    is_read: item.is_read,
    is_starred: item.is_starred,
    is_archived: item.is_archived,
  }));
};

// Fetch sent messages
const fetchSentMessages = async (userId: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:users!messages_sender_id_fkey(user_id, first_name, last_name, email, avatar_url),
      recipients:message_recipients(
        *,
        user:users(user_id, first_name, last_name, email)
      ),
      property:properties(property_id, property_name)
    `)
    .eq('sender_id', userId)
    .is('parent_id', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Message[];
};

// Fetch starred messages
const fetchStarredMessages = async (userId: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('message_recipients')
    .select(`
      *,
      message:messages(
        *,
        sender:users!messages_sender_id_fkey(user_id, first_name, last_name, email, avatar_url),
        property:properties(property_id, property_name)
      )
    `)
    .eq('user_id', userId)
    .eq('is_starred', true)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((item: any) => ({
    ...item.message,
    is_read: item.is_read,
    is_starred: item.is_starred,
    is_archived: item.is_archived,
  }));
};

// Fetch archived messages
const fetchArchivedMessages = async (userId: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('message_recipients')
    .select(`
      *,
      message:messages(
        *,
        sender:users!messages_sender_id_fkey(user_id, first_name, last_name, email, avatar_url),
        property:properties(property_id, property_name)
      )
    `)
    .eq('user_id', userId)
    .eq('is_archived', true)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((item: any) => ({
    ...item.message,
    is_read: item.is_read,
    is_starred: item.is_starred,
    is_archived: item.is_archived,
  }));
};

// Fetch message thread
const fetchMessageThread = async (threadId: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:users!messages_sender_id_fkey(user_id, first_name, last_name, email, avatar_url),
      recipients:message_recipients(
        *,
        user:users(user_id, first_name, last_name, email)
      ),
      attachments:message_attachments(*)
    `)
    .or(`message_id.eq.${threadId},thread_id.eq.${threadId}`)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as Message[];
};

// Fetch single message
const fetchMessage = async (messageId: string): Promise<Message> => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:users!messages_sender_id_fkey(user_id, first_name, last_name, email, avatar_url),
      recipients:message_recipients(
        *,
        user:users(user_id, first_name, last_name, email)
      ),
      attachments:message_attachments(*),
      property:properties(property_id, property_name)
    `)
    .eq('message_id', messageId)
    .single();

  if (error) throw error;
  return data as Message;
};

// Get unread count
const fetchUnreadCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('message_recipients')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
    .eq('is_deleted', false);

  if (error) throw error;
  return count || 0;
};

// Send message
const sendMessage = async (message: MessageInsert, senderId: string): Promise<Message> => {
  // Create the message
  const { data: newMessage, error: messageError } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      subject: message.subject,
      body: message.body,
      property_id: message.property_id,
      booking_id: message.booking_id,
      priority: message.priority || 'normal',
      thread_id: message.thread_id,
      parent_id: message.parent_id,
    })
    .select()
    .single();

  if (messageError) throw messageError;

  // Add recipients
  const recipients = message.recipient_ids.map((userId) => ({
    message_id: newMessage.message_id,
    user_id: userId,
  }));

  const { error: recipientError } = await supabase
    .from('message_recipients')
    .insert(recipients);

  if (recipientError) throw recipientError;

  return newMessage as Message;
};

// Mark message as read
const markAsRead = async (messageId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('message_recipients')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('message_id', messageId)
    .eq('user_id', userId);

  if (error) throw error;
};

// Toggle star
const toggleStar = async (messageId: string, userId: string, isStarred: boolean): Promise<void> => {
  const { error } = await supabase
    .from('message_recipients')
    .update({ is_starred: isStarred })
    .eq('message_id', messageId)
    .eq('user_id', userId);

  if (error) throw error;
};

// Archive message
const archiveMessage = async (messageId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('message_recipients')
    .update({ is_archived: true })
    .eq('message_id', messageId)
    .eq('user_id', userId);

  if (error) throw error;
};

// Delete message (soft delete for recipient)
const deleteMessage = async (messageId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('message_recipients')
    .update({ is_deleted: true })
    .eq('message_id', messageId)
    .eq('user_id', userId);

  if (error) throw error;
};

// Hooks
export function useInboxMessages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: messageKeys.inbox(),
    queryFn: () => fetchInboxMessages(user!.id),
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });
}

export function useSentMessages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: messageKeys.sent(),
    queryFn: () => fetchSentMessages(user!.id),
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });
}

export function useStarredMessages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: messageKeys.starred(),
    queryFn: () => fetchStarredMessages(user!.id),
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });
}

export function useArchivedMessages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: messageKeys.archived(),
    queryFn: () => fetchArchivedMessages(user!.id),
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });
}

export function useMessageThread(threadId: string | null) {
  return useQuery({
    queryKey: messageKeys.thread(threadId || ''),
    queryFn: () => fetchMessageThread(threadId!),
    enabled: !!threadId,
    staleTime: 30 * 1000,
  });
}

export function useMessage(messageId: string | null) {
  return useQuery({
    queryKey: messageKeys.detail(messageId || ''),
    queryFn: () => fetchMessage(messageId!),
    enabled: !!messageId,
    staleTime: 30 * 1000,
  });
}

export function useUnreadCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: messageKeys.unreadCount(),
    queryFn: () => fetchUnreadCount(user!.id),
    enabled: !!user?.id,
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

export function useSendMessage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (message: MessageInsert) => sendMessage(message, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.all });
      toast({
        title: 'Message sent',
        description: 'Your message has been sent successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (messageId: string) => markAsRead(messageId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.all });
    },
  });
}

export function useToggleStar() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ messageId, isStarred }: { messageId: string; isStarred: boolean }) =>
      toggleStar(messageId, user!.id, isStarred),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.all });
    },
  });
}

export function useArchiveMessage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (messageId: string) => archiveMessage(messageId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.all });
      toast({
        title: 'Message archived',
        description: 'The message has been moved to archive',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to archive message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteMessage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (messageId: string) => deleteMessage(messageId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messageKeys.all });
      toast({
        title: 'Message deleted',
        description: 'The message has been deleted',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
