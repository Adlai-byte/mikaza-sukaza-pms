import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { useGlobalSearch, useQuickActions, MIN_SEARCH_CHARS } from '@/hooks/useGlobalSearch';
import { SearchResult, EntityType, getEntityIcon } from './search-config';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Entity type display names
const ENTITY_LABELS: Record<EntityType, string> = {
  user: 'globalSearch.groups.users',
  property: 'globalSearch.groups.properties',
  guest: 'globalSearch.groups.guests',
  booking: 'globalSearch.groups.bookings',
  job: 'globalSearch.groups.jobs',
  task: 'globalSearch.groups.tasks',
  issue: 'globalSearch.groups.issues',
  invoice: 'globalSearch.groups.invoices',
  expense: 'globalSearch.groups.expenses',
  provider: 'globalSearch.groups.providers',
  document: 'globalSearch.groups.documents',
  checkInOut: 'globalSearch.groups.checkInOut',
  accessAuth: 'globalSearch.groups.accessAuthorizations',
  vendorCoi: 'globalSearch.groups.vendorCois',
  billTemplate: 'globalSearch.groups.billTemplates',
  checklistTemplate: 'globalSearch.groups.checklistTemplates',
  media: 'globalSearch.groups.media',
  vehicle: 'globalSearch.groups.vehicles',
  notification: 'globalSearch.groups.notifications',
};

// Order of entity groups in results
const ENTITY_ORDER: EntityType[] = [
  'property',
  'booking',
  'guest',
  'user',
  'job',
  'task',
  'issue',
  'invoice',
  'expense',
  'provider',
  'document',
  'checkInOut',
  'accessAuth',
  'vendorCoi',
  'billTemplate',
  'checklistTemplate',
  'media',
  'vehicle',
  'notification',
];

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  // Search results
  const { quickActions, entities, isLoading } = useGlobalSearch(query);
  const defaultQuickActions = useQuickActions();

  // Clear query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Handle result selection
  const handleSelect = useCallback(
    (result: SearchResult) => {
      onOpenChange(false);
      navigate(result.route);
    },
    [navigate, onOpenChange]
  );

  // Render a search result item
  const renderResultItem = (result: SearchResult) => {
    const Icon = result.icon || getEntityIcon(result.type);
    return (
      <CommandItem
        key={`${result.type}-${result.id}`}
        value={`${result.type}-${result.id}-${result.title}`}
        onSelect={() => handleSelect(result)}
        className="flex items-center gap-3 py-3"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-0.5 overflow-hidden">
          <span className="font-medium truncate">{result.title}</span>
          <span className="text-xs text-muted-foreground truncate">
            {result.subtitle}
          </span>
        </div>
      </CommandItem>
    );
  };

  // Determine which quick actions to show
  const displayQuickActions = query.length > 0 ? quickActions : defaultQuickActions;
  const showMinCharsHint = query.length > 0 && query.length < MIN_SEARCH_CHARS;

  // Check if there are any entity results
  const hasEntityResults = Object.values(entities).some(
    results => results && results.length > 0
  );

  // Check if there are any results at all
  const hasAnyResults = displayQuickActions.length > 0 || hasEntityResults;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={t('globalSearch.placeholder', 'Search users, properties, bookings...')}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[400px]">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-6 gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              {t('globalSearch.loading', 'Searching...')}
            </span>
          </div>
        )}

        {/* No results state */}
        {!isLoading && !hasAnyResults && query.length >= MIN_SEARCH_CHARS && (
          <CommandEmpty>
            {t('globalSearch.noResults', 'No results found')}
          </CommandEmpty>
        )}

        {/* Quick Actions */}
        {displayQuickActions.length > 0 && (
          <CommandGroup heading={t('globalSearch.groups.quickActions', 'Quick Actions')}>
            {displayQuickActions.map(renderResultItem)}
          </CommandGroup>
        )}

        {/* Min chars hint */}
        {showMinCharsHint && (
          <div className="py-3 px-4 text-center">
            <span className="text-sm text-muted-foreground">
              {t('globalSearch.minChars', 'Type at least 2 characters to search')}
            </span>
          </div>
        )}

        {/* Entity Results */}
        {!isLoading &&
          ENTITY_ORDER.map(entityType => {
            const results = entities[entityType];
            if (!results || results.length === 0) return null;

            return (
              <div key={entityType}>
                {(displayQuickActions.length > 0 || ENTITY_ORDER.indexOf(entityType) > 0) && (
                  <CommandSeparator />
                )}
                <CommandGroup heading={t(ENTITY_LABELS[entityType], entityType)}>
                  {results.map(renderResultItem)}
                </CommandGroup>
              </div>
            );
          })}
      </CommandList>
    </CommandDialog>
  );
}

export default GlobalSearch;
