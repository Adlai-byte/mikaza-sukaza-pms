import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/ui/page-header';
import { CasaSpinner } from '@/components/ui/casa-loader';
import {
  Mail,
  Inbox,
  Send,
  Star,
  Archive,
  Trash2,
  Plus,
  Search,
  MoreVertical,
  Reply,
  ArrowLeft,
  RefreshCw,
  StarOff,
  AlertCircle,
  Paperclip,
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import {
  useInboxMessages,
  useSentMessages,
  useStarredMessages,
  useArchivedMessages,
  useMessageThread,
  useSendMessage,
  useMarkAsRead,
  useToggleStar,
  useArchiveMessage,
  useDeleteMessage,
  useUnreadCount,
  Message,
  MessageInsert,
} from '@/hooks/useMessages';
import { useUsersOptimized } from '@/hooks/useUsersOptimized';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type View = 'inbox' | 'sent' | 'starred' | 'archived';

export default function Messages() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const currentUserId = profile?.user_id || user?.id;
  const [currentView, setCurrentView] = useState<View>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

  // Queries
  const { data: inboxMessages = [], isLoading: loadingInbox, refetch: refetchInbox, error: inboxError } = useInboxMessages();
  const { data: sentMessages = [], isLoading: loadingSent, refetch: refetchSent, error: sentError } = useSentMessages();
  const { data: starredMessages = [], isLoading: loadingStarred, error: starredError } = useStarredMessages();
  const { data: archivedMessages = [], isLoading: loadingArchived, error: archivedError } = useArchivedMessages();

  // Log errors for debugging
  const currentError = currentView === 'inbox' ? inboxError :
                       currentView === 'sent' ? sentError :
                       currentView === 'starred' ? starredError :
                       archivedError;

  if (currentError) {
    console.error(`[Messages] Error loading ${currentView} messages:`, currentError);
  }
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: threadMessages = [] } = useMessageThread(selectedMessage?.thread_id || selectedMessage?.message_id || null);

  // Mutations
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const toggleStar = useToggleStar();
  const archiveMessage = useArchiveMessage();
  const deleteMessage = useDeleteMessage();

  // Users for recipient selection - only active admin and ops users, excluding current user
  const { users: allUsers, loading: usersLoading } = useUsersOptimized();
  const users = allUsers.filter(u =>
    u.is_active !== false &&
    u.user_id !== currentUserId &&
    (u.user_type === 'admin' || u.user_type === 'ops')
  );

  // Get current messages based on view
  const getCurrentMessages = (): Message[] => {
    switch (currentView) {
      case 'inbox':
        return inboxMessages;
      case 'sent':
        return sentMessages;
      case 'starred':
        return starredMessages;
      case 'archived':
        return archivedMessages;
      default:
        return [];
    }
  };

  const isLoading = currentView === 'inbox' ? loadingInbox :
                    currentView === 'sent' ? loadingSent :
                    currentView === 'starred' ? loadingStarred :
                    loadingArchived;

  const messages = getCurrentMessages();

  // Filter messages by search
  const filteredMessages = messages.filter((msg) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      msg.subject?.toLowerCase().includes(query) ||
      msg.body?.toLowerCase().includes(query) ||
      msg.sender?.first_name?.toLowerCase().includes(query) ||
      msg.sender?.last_name?.toLowerCase().includes(query)
    );
  });

  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    if (!message.is_read && currentView === 'inbox') {
      markAsRead.mutate(message.message_id);
    }
  };

  const handleReply = (message: Message) => {
    setReplyToMessage(message);
    setShowComposeDialog(true);
  };

  const handleRefresh = () => {
    if (currentView === 'inbox') refetchInbox();
    else if (currentView === 'sent') refetchSent();
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700';
      case 'high':
        return 'bg-orange-100 text-orange-700';
      case 'low':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Mail}
        title={t('internalMessages.title', 'Messages')}
        subtitle={t('internalMessages.subtitle', 'Internal messaging system')}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
              {t('common.refresh', 'Refresh')}
            </Button>
            <Button onClick={() => { setReplyToMessage(null); setShowComposeDialog(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              {t('internalMessages.compose', 'Compose')}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <Card className="col-span-12 md:col-span-3 shadow-sm">
          <CardContent className="p-4">
            <nav className="space-y-1">
              <Button
                variant={currentView === 'inbox' ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => { setCurrentView('inbox'); setSelectedMessage(null); }}
              >
                <Inbox className="mr-2 h-4 w-4" />
                {t('internalMessages.inbox', 'Inbox')}
                {unreadCount > 0 && (
                  <Badge className="ml-auto" variant="destructive">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant={currentView === 'sent' ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => { setCurrentView('sent'); setSelectedMessage(null); }}
              >
                <Send className="mr-2 h-4 w-4" />
                {t('internalMessages.sent', 'Sent')}
              </Button>
              <Button
                variant={currentView === 'starred' ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => { setCurrentView('starred'); setSelectedMessage(null); }}
              >
                <Star className="mr-2 h-4 w-4" />
                {t('internalMessages.starred', 'Starred')}
              </Button>
              <Button
                variant={currentView === 'archived' ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => { setCurrentView('archived'); setSelectedMessage(null); }}
              >
                <Archive className="mr-2 h-4 w-4" />
                {t('internalMessages.archived', 'Archived')}
              </Button>
            </nav>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card className="col-span-12 md:col-span-9 shadow-sm">
          {selectedMessage ? (
            // Message Detail View
            <div className="h-[calc(100vh-280px)]">
              <CardHeader className="border-b py-3">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMessage(null)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('common.back', 'Back')}
                  </Button>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReply(selectedMessage)}
                    >
                      <Reply className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleStar.mutate({
                        messageId: selectedMessage.message_id,
                        isStarred: !selectedMessage.is_starred,
                      })}
                    >
                      {selectedMessage.is_starred ? (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <Star className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        archiveMessage.mutate(selectedMessage.message_id);
                        setSelectedMessage(null);
                      }}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        deleteMessage.mutate(selectedMessage.message_id);
                        setSelectedMessage(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <ScrollArea className="h-[calc(100%-60px)]">
                <CardContent className="p-6">
                  {/* Thread View */}
                  {threadMessages.length > 0 ? (
                    <div className="space-y-6">
                      {threadMessages.map((msg, index) => (
                        <div key={msg.message_id} className={cn(
                          'p-4 rounded-lg',
                          index === 0 ? 'bg-muted/50' : 'bg-background border'
                        )}>
                          <div className="flex items-start gap-4">
                            <Avatar>
                              <AvatarFallback>
                                {getInitials(msg.sender?.first_name, msg.sender?.last_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-semibold">
                                    {msg.sender?.first_name} {msg.sender?.last_name}
                                  </span>
                                  <span className="text-muted-foreground text-sm ml-2">
                                    &lt;{msg.sender?.email}&gt;
                                  </span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {format(parseISO(msg.created_at), 'PPp')}
                                </span>
                              </div>
                              {index === 0 && msg.subject && (
                                <h2 className="text-xl font-semibold mt-2">{msg.subject}</h2>
                              )}
                              {msg.priority !== 'normal' && (
                                <Badge className={cn('mt-2', getPriorityColor(msg.priority))}>
                                  {msg.priority}
                                </Badge>
                              )}
                              <div className="mt-4 prose prose-sm max-w-none whitespace-pre-wrap">
                                {msg.body}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      <Avatar>
                        <AvatarFallback>
                          {getInitials(selectedMessage.sender?.first_name, selectedMessage.sender?.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold">
                              {selectedMessage.sender?.first_name} {selectedMessage.sender?.last_name}
                            </span>
                            <span className="text-muted-foreground text-sm ml-2">
                              &lt;{selectedMessage.sender?.email}&gt;
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {format(parseISO(selectedMessage.created_at), 'PPp')}
                          </span>
                        </div>
                        {selectedMessage.subject && (
                          <h2 className="text-xl font-semibold mt-2">{selectedMessage.subject}</h2>
                        )}
                        {selectedMessage.priority !== 'normal' && (
                          <Badge className={cn('mt-2', getPriorityColor(selectedMessage.priority))}>
                            {selectedMessage.priority}
                          </Badge>
                        )}
                        <div className="mt-4 prose prose-sm max-w-none whitespace-pre-wrap">
                          {selectedMessage.body}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </ScrollArea>
            </div>
          ) : (
            // Message List View
            <>
              <CardHeader className="border-b py-3">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('internalMessages.searchPlaceholder', 'Search messages...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <CasaSpinner />
                  </div>
                ) : currentError ? (
                  <div className="flex flex-col items-center justify-center py-12 text-destructive">
                    <AlertCircle className="h-12 w-12 mb-4" />
                    <p className="font-medium">{t('common.error', 'Error loading messages')}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {currentError instanceof Error ? currentError.message : 'Unknown error'}
                    </p>
                    <Button variant="outline" className="mt-4" onClick={handleRefresh}>
                      {t('common.retry', 'Retry')}
                    </Button>
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mb-4" />
                    <p>{t('internalMessages.noMessages', 'No messages found')}</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-380px)]">
                    <div className="divide-y">
                      {filteredMessages.map((message) => (
                        <div
                          key={message.message_id}
                          className={cn(
                            'flex items-start gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors',
                            !message.is_read && currentView === 'inbox' && 'bg-blue-50/50'
                          )}
                          onClick={() => handleSelectMessage(message)}
                        >
                          <Avatar className="mt-1">
                            <AvatarFallback>
                              {getInitials(message.sender?.first_name, message.sender?.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={cn(
                                'font-medium truncate',
                                !message.is_read && currentView === 'inbox' && 'font-semibold'
                              )}>
                                {message.sender?.first_name} {message.sender?.last_name}
                              </span>
                              <div className="flex items-center gap-2">
                                {message.is_starred && (
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                )}
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatDistanceToNow(parseISO(message.created_at), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                            <p className={cn(
                              'text-sm truncate',
                              !message.is_read && currentView === 'inbox' ? 'font-medium' : 'text-muted-foreground'
                            )}>
                              {message.subject || t('internalMessages.noSubject', '(No subject)')}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {message.body}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {message.priority !== 'normal' && (
                                <Badge variant="outline" className={cn('text-xs', getPriorityColor(message.priority))}>
                                  {message.priority}
                                </Badge>
                              )}
                              {message.property && (
                                <Badge variant="outline" className="text-xs">
                                  {message.property.property_name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                toggleStar.mutate({
                                  messageId: message.message_id,
                                  isStarred: !message.is_starred,
                                });
                              }}>
                                {message.is_starred ? (
                                  <>
                                    <StarOff className="mr-2 h-4 w-4" />
                                    {t('internalMessages.unstar', 'Remove star')}
                                  </>
                                ) : (
                                  <>
                                    <Star className="mr-2 h-4 w-4" />
                                    {t('internalMessages.star', 'Star message')}
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                archiveMessage.mutate(message.message_id);
                              }}>
                                <Archive className="mr-2 h-4 w-4" />
                                {t('internalMessages.archive', 'Archive')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMessage.mutate(message.message_id);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('common.delete', 'Delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Compose Dialog */}
      <ComposeDialog
        open={showComposeDialog}
        onOpenChange={setShowComposeDialog}
        replyTo={replyToMessage}
        users={users}
        usersLoading={usersLoading}
        onSend={sendMessage.mutate}
        isSending={sendMessage.isPending}
      />
    </div>
  );
}

// Compose Dialog Component
interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replyTo: Message | null;
  users: any[];
  usersLoading: boolean;
  onSend: (message: MessageInsert) => void;
  isSending: boolean;
}

function ComposeDialog({ open, onOpenChange, replyTo, users, usersLoading, onSend, isSending }: ComposeDialogProps) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (replyTo) {
        setSubject(`Re: ${replyTo.subject || ''}`);
        setSelectedRecipients([replyTo.sender_id]);
      } else {
        setSubject('');
        setSelectedRecipients([]);
      }
      setBody('');
      setPriority('normal');
    }
  }, [open, replyTo]);

  const handleSend = () => {
    if (selectedRecipients.length === 0 || !body.trim()) return;

    onSend({
      subject: subject || undefined,
      body,
      recipient_ids: selectedRecipients,
      priority,
      thread_id: replyTo?.thread_id || replyTo?.message_id,
      parent_id: replyTo?.message_id,
    });

    onOpenChange(false);
    setSubject('');
    setBody('');
    setSelectedRecipients([]);
    setPriority('normal');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {replyTo ? t('internalMessages.reply', 'Reply') : t('internalMessages.newMessage', 'New Message')}
          </DialogTitle>
          <DialogDescription>
            {replyTo
              ? t('internalMessages.replyDescription', 'Reply to this message')
              : t('internalMessages.composeDescription', 'Send a new message to team members')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('internalMessages.to', 'To')}</Label>
            <Select
              value={selectedRecipients[0] || ''}
              onValueChange={(value) => setSelectedRecipients([value])}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('internalMessages.selectRecipient', 'Select recipient...')} />
              </SelectTrigger>
              <SelectContent>
                {usersLoading ? (
                  <div className="py-2 px-2 text-sm text-muted-foreground">
                    {t('common.loading', 'Loading...')}
                  </div>
                ) : users.length === 0 ? (
                  <div className="py-2 px-2 text-sm text-muted-foreground">
                    {t('internalMessages.noRecipients', 'No other admin/ops users available')}
                  </div>
                ) : (
                  users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('internalMessages.subject', 'Subject')}</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('internalMessages.subjectPlaceholder', 'Message subject...')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('internalMessages.priority', 'Priority')}</Label>
            <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t('internalMessages.priorityLow', 'Low')}</SelectItem>
                <SelectItem value="normal">{t('internalMessages.priorityNormal', 'Normal')}</SelectItem>
                <SelectItem value="high">{t('internalMessages.priorityHigh', 'High')}</SelectItem>
                <SelectItem value="urgent">{t('internalMessages.priorityUrgent', 'Urgent')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('internalMessages.message', 'Message')}</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('internalMessages.messagePlaceholder', 'Type your message...')}
              rows={8}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || selectedRecipients.length === 0 || !body.trim()}
          >
            {isSending ? t('internalMessages.sending', 'Sending...') : t('internalMessages.send', 'Send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
