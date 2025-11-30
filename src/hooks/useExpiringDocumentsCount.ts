import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface ExpiringCounts {
  contracts: number;
  coi: number;
  total: number;
}

// Storage key for last visited timestamps
const LAST_VISITED_KEY = 'expiring_docs_last_visited';

interface LastVisited {
  contracts?: number;
  coi?: number;
}

// Get last visited timestamps from localStorage
export const getLastVisited = (): LastVisited => {
  try {
    const stored = localStorage.getItem(LAST_VISITED_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Mark a category as visited (resets notification for that category)
export const markCategoryAsVisited = (category: 'contracts' | 'coi') => {
  try {
    const lastVisited = getLastVisited();
    lastVisited[category] = Date.now();
    localStorage.setItem(LAST_VISITED_KEY, JSON.stringify(lastVisited));
  } catch (error) {
    console.error('Failed to mark category as visited:', error);
  }
};

// Hook to get expiring documents count
export function useExpiringDocumentsCount(daysAhead: number = 30) {
  const { data: counts, refetch, isLoading } = useQuery({
    queryKey: ['expiring-documents-count', daysAhead],
    queryFn: async (): Promise<ExpiringCounts> => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      // Fetch expiring contracts
      const { data: contracts, error: contractsError } = await supabase
        .from('document_summary')
        .select('document_id', { count: 'exact', head: true })
        .eq('category', 'contracts')
        .eq('is_current_version', true)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', futureDateStr)
        .gte('expiry_date', todayStr);

      if (contractsError) throw contractsError;

      // Fetch expiring COIs (from vendor_cois table)
      const { data: cois, error: coisError } = await supabase
        .from('vendor_cois')
        .select('coi_id', { count: 'exact', head: true })
        .in('status', ['active', 'expiring_soon'])
        .not('valid_through', 'is', null)
        .lte('valid_through', futureDateStr)
        .gte('valid_through', todayStr);

      if (coisError) throw coisError;

      const contractsCount = contracts?.length || 0;
      const coisCount = cois?.length || 0;

      return {
        contracts: contractsCount,
        coi: coisCount,
        total: contractsCount + coisCount,
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  return {
    counts: counts || { contracts: 0, coi: 0, total: 0 },
    isLoading,
    refetch,
  };
}

// Hook to get unseen counts (considering last visited times)
export function useUnseenExpiringCounts(daysAhead: number = 30) {
  const { counts, isLoading, refetch } = useExpiringDocumentsCount(daysAhead);
  const lastVisited = getLastVisited();

  // For now, we'll show all expiring documents as notifications
  // In the future, you could implement logic to only show "new" expiring docs
  // based on when they were created vs lastVisited timestamp

  return {
    unseenCounts: counts,
    isLoading,
    refetch,
    markAsVisited: markCategoryAsVisited,
  };
}
