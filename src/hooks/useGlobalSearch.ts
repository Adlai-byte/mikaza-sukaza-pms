import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import {
  ENTITY_CONFIGS,
  EntityConfig,
  SearchResult,
  filterQuickActions,
  getEntityTitle,
  getEntitySubtitle,
  getEntityIdField,
  EntityType,
} from '@/components/global-search/search-config';

// Minimum characters required for database search
const MIN_SEARCH_CHARS = 2;

// Debounce delay in milliseconds
const DEBOUNCE_DELAY = 300;

// Maximum results per entity type
const MAX_RESULTS_PER_ENTITY = 5;

// Search a single entity table
async function searchEntity(
  config: EntityConfig,
  query: string
): Promise<SearchResult[]> {
  try {
    // Build the OR clause for search fields
    const orClauses = config.searchFields
      .map(field => `${field}.ilike.%${query}%`)
      .join(',');

    const { data, error } = await supabase
      .from(config.table)
      .select(config.fields.join(','))
      .or(orClauses)
      .limit(MAX_RESULTS_PER_ENTITY);

    if (error) {
      console.warn(`Search error for ${config.type}:`, error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const idField = getEntityIdField(config.type);

    return data.map((item): SearchResult => ({
      id: String(item[idField]),
      type: config.type,
      title: getEntityTitle(config, item),
      subtitle: getEntitySubtitle(config, item),
      route: config.routeGenerator(String(item[idField]), item),
      icon: config.icon,
    }));
  } catch (error) {
    console.warn(`Search exception for ${config.type}:`, error);
    return [];
  }
}

// Search all entity tables in parallel
async function searchAllEntities(
  query: string,
  hasPermission: (permission: string) => boolean
): Promise<Record<EntityType, SearchResult[]>> {
  // Filter configs by permission
  const permittedConfigs = ENTITY_CONFIGS.filter(config =>
    hasPermission(config.permission)
  );

  // Search all permitted entities in parallel
  const searchPromises = permittedConfigs.map(async (config) => ({
    type: config.type,
    results: await searchEntity(config, query),
  }));

  const searchResults = await Promise.all(searchPromises);

  // Convert to record
  const resultsByType: Record<EntityType, SearchResult[]> = {} as Record<EntityType, SearchResult[]>;
  for (const { type, results } of searchResults) {
    resultsByType[type] = results;
  }

  return resultsByType;
}

// Custom hook for debounced value
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Search results grouped by type
export interface GroupedSearchResults {
  quickActions: SearchResult[];
  entities: Record<EntityType, SearchResult[]>;
  totalCount: number;
  isLoading: boolean;
  error: Error | null;
}

// Main global search hook
export function useGlobalSearch(query: string): GroupedSearchResults {
  const { hasPermission } = usePermissions();
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_DELAY);

  // Filter quick actions (no debounce needed, instant filtering)
  const quickActions = useMemo(() => {
    const actions = filterQuickActions(query.trim(), hasPermission);
    return actions.map((action): SearchResult => ({
      id: action.id,
      type: 'quickAction',
      title: action.title,
      subtitle: action.keywords.slice(0, 3).join(', '),
      route: action.route,
      icon: action.icon,
    }));
  }, [query, hasPermission]);

  // Database search (debounced)
  const shouldSearch = debouncedQuery.length >= MIN_SEARCH_CHARS;

  const {
    data: entityResults,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: () => searchAllEntities(debouncedQuery, hasPermission),
    enabled: shouldSearch,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate total count
  const totalCount = useMemo(() => {
    let count = quickActions.length;
    if (entityResults) {
      for (const results of Object.values(entityResults)) {
        count += results.length;
      }
    }
    return count;
  }, [quickActions, entityResults]);

  return {
    quickActions,
    entities: entityResults || ({} as Record<EntityType, SearchResult[]>),
    totalCount,
    isLoading: shouldSearch && isLoading,
    error: error as Error | null,
  };
}

// Hook to get just quick actions (for empty state)
export function useQuickActions(): SearchResult[] {
  const { hasPermission } = usePermissions();

  return useMemo(() => {
    const actions = filterQuickActions('', hasPermission);
    return actions.slice(0, 8).map((action): SearchResult => ({
      id: action.id,
      type: 'quickAction',
      title: action.title,
      subtitle: action.keywords.slice(0, 3).join(', '),
      route: action.route,
      icon: action.icon,
    }));
  }, [hasPermission]);
}

// Export types and constants
export { MIN_SEARCH_CHARS };
