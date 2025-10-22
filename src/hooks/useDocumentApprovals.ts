import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DocumentApproval, DocumentApprovalInsert } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { useAuth } from "@/contexts/AuthContext";
import { documentKeys } from "@/hooks/useDocuments";

// Query keys for approval cache management
export const approvalKeys = {
  all: () => ['document_approvals'] as const,
  lists: () => ['document_approvals', 'list'] as const,
  list: (status?: string) => ['document_approvals', 'list', ...(status ? [status] : [])] as const,
  detail: (id: string) => ['document_approvals', 'detail', id] as const,
  pending: () => ['document_approvals', 'pending'] as const,
  myRequests: () => ['document_approvals', 'my_requests'] as const,
} as const;

// Fetch approvals with optional status filter
const fetchApprovals = async (status?: string): Promise<DocumentApproval[]> => {
  console.log('🔐 [Approvals] Fetching approvals', status ? `with status: ${status}` : '');

  let query = supabase
    .from('document_approvals')
    .select(`
      *,
      document:documents(
        document_id,
        document_name,
        category,
        file_name
      ),
      requested_user:users!document_approvals_requested_by_fkey(
        user_id,
        first_name,
        last_name,
        email
      ),
      approved_user:users!document_approvals_approved_by_fkey(
        user_id,
        first_name,
        last_name,
        email
      )
    `)
    .order('request_date', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ [Approvals] Fetch error:', error);
    throw error;
  }

  console.log('✅ [Approvals] Fetched:', data?.length || 0, 'approvals');
  return (data || []) as DocumentApproval[];
};

// Fetch pending approvals (using view)
const fetchPendingApprovals = async (): Promise<any[]> => {
  console.log('🔐 [Approvals] Fetching pending approvals');

  const { data, error } = await supabase
    .from('pending_approvals')
    .select('*')
    .order('request_date', { ascending: true });

  if (error) {
    console.error('❌ [Approvals] Pending fetch error:', error);
    throw error;
  }

  console.log('✅ [Approvals] Fetched:', data?.length || 0, 'pending approvals');
  return data || [];
};

// Fetch user's own approval requests
const fetchMyApprovalRequests = async (userId: string): Promise<DocumentApproval[]> => {
  console.log('🔐 [Approvals] Fetching my approval requests');

  const { data, error } = await supabase
    .from('document_approvals')
    .select(`
      *,
      document:documents(
        document_id,
        document_name,
        category,
        file_name
      ),
      approved_user:users!document_approvals_approved_by_fkey(
        user_id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('requested_by', userId)
    .order('request_date', { ascending: false });

  if (error) {
    console.error('❌ [Approvals] My requests fetch error:', error);
    throw error;
  }

  console.log('✅ [Approvals] Fetched:', data?.length || 0, 'my requests');
  return (data || []) as DocumentApproval[];
};

// Hook for managing document approvals
export function useDocumentApprovals(status?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLogs();
  const { hasPermission } = usePermissions();
  const { user, profile } = useAuth();
  const currentUserId = profile?.user_id || user?.id;

  // Approvals query
  const {
    data: approvals = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: approvalKeys.list(status),
    queryFn: () => fetchApprovals(status),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Request approval mutation
  const requestApprovalMutation = useMutation({
    mutationFn: async (data: DocumentApprovalInsert) => {
      console.log('🔐 [Approvals] Requesting approval for document:', data.document_id);

      if (!hasPermission(PERMISSIONS.DOCUMENTS_ACCESS_CREATE)) {
        throw new Error("You don't have permission to request document access");
      }

      const { data: approval, error } = await supabase
        .from('document_approvals')
        .insert([{
          ...data,
          requested_by: currentUserId,
        }])
        .select(`
          *,
          document:documents(document_id, document_name, category)
        `)
        .single();

      if (error) {
        console.error('❌ [Approvals] Request error:', error);
        throw error;
      }

      console.log('✅ [Approvals] Approval requested');
      return approval;
    },
    onSuccess: async (approval) => {
      await logActivity('APPROVAL_REQUESTED', {
        approvalId: approval.approval_id,
        documentId: approval.document_id,
        documentName: approval.document?.document_name,
      });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: approvalKeys.pending() });

      toast({
        title: "Success",
        description: "Approval request submitted successfully",
      });
    },
    onError: (error) => {
      console.error('❌ [Approvals] Request error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to request approval",
        variant: "destructive",
      });
    },
  });

  // Approve document mutation
  const approveDocumentMutation = useMutation({
    mutationFn: async (approvalId: string) => {
      console.log('✅ [Approvals] Approving:', approvalId);

      if (!hasPermission(PERMISSIONS.DOCUMENTS_ACCESS_APPROVE)) {
        throw new Error("You don't have permission to approve document access");
      }

      const { data: approval, error } = await supabase
        .from('document_approvals')
        .update({
          status: 'approved',
          approved_by: currentUserId,
        })
        .eq('approval_id', approvalId)
        .select(`
          *,
          document:documents(document_id, document_name),
          requested_user:users!document_approvals_requested_by_fkey(user_id, first_name, last_name, email)
        `)
        .single();

      if (error) {
        console.error('❌ [Approvals] Approve error:', error);
        throw error;
      }

      console.log('✅ [Approvals] Approval granted');
      return approval;
    },
    onSuccess: async (approval) => {
      await logActivity('APPROVAL_GRANTED', {
        approvalId: approval.approval_id,
        documentId: approval.document_id,
        documentName: approval.document?.document_name,
        requestedBy: approval.requested_user?.email,
      });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: approvalKeys.pending() });

      toast({
        title: "Success",
        description: "Document access approved",
      });
    },
    onError: (error) => {
      console.error('❌ [Approvals] Approve error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve request",
        variant: "destructive",
      });
    },
  });

  // Reject document mutation
  const rejectDocumentMutation = useMutation({
    mutationFn: async ({ approvalId, reason }: { approvalId: string; reason?: string }) => {
      console.log('❌ [Approvals] Rejecting:', approvalId);

      if (!hasPermission(PERMISSIONS.DOCUMENTS_ACCESS_APPROVE)) {
        throw new Error("You don't have permission to reject document access");
      }

      const { data: approval, error } = await supabase
        .from('document_approvals')
        .update({
          status: 'rejected',
          approved_by: currentUserId,
          rejection_reason: reason,
        })
        .eq('approval_id', approvalId)
        .select(`
          *,
          document:documents(document_id, document_name),
          requested_user:users!document_approvals_requested_by_fkey(user_id, first_name, last_name, email)
        `)
        .single();

      if (error) {
        console.error('❌ [Approvals] Reject error:', error);
        throw error;
      }

      console.log('✅ [Approvals] Approval rejected');
      return approval;
    },
    onSuccess: async (approval) => {
      await logActivity('APPROVAL_REJECTED', {
        approvalId: approval.approval_id,
        documentId: approval.document_id,
        documentName: approval.document?.document_name,
        requestedBy: approval.requested_user?.email,
        reason: approval.rejection_reason,
      });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: approvalKeys.pending() });

      toast({
        title: "Success",
        description: "Document access rejected",
      });
    },
    onError: (error) => {
      console.error('❌ [Approvals] Reject error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject request",
        variant: "destructive",
      });
    },
  });

  return {
    approvals,
    isLoading,
    isFetching,
    error,
    refetch,
    requestApproval: requestApprovalMutation.mutate,
    approveDocument: approveDocumentMutation.mutate,
    rejectDocument: rejectDocumentMutation.mutate,
    isRequesting: requestApprovalMutation.isPending,
    isApproving: approveDocumentMutation.isPending,
    isRejecting: rejectDocumentMutation.isPending,
  };
}

// Hook for pending approvals
export function usePendingApprovals() {
  const {
    data: pendingApprovals = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: approvalKeys.pending(),
    queryFn: fetchPendingApprovals,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return {
    pendingApprovals,
    isLoading,
    error,
    refetch,
    count: pendingApprovals.length,
  };
}

// Hook for user's own approval requests
export function useMyApprovalRequests() {
  const { user, profile } = useAuth();
  const currentUserId = profile?.user_id || user?.id;

  const {
    data: myRequests = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: approvalKeys.myRequests(),
    queryFn: () => fetchMyApprovalRequests(currentUserId!),
    enabled: !!currentUserId,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return {
    myRequests,
    isLoading,
    error,
    refetch,
    pendingCount: myRequests.filter(r => r.status === 'pending').length,
    approvedCount: myRequests.filter(r => r.status === 'approved').length,
    rejectedCount: myRequests.filter(r => r.status === 'rejected').length,
  };
}
