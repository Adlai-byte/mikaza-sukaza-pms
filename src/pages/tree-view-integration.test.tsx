import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Contracts from './Contracts';
import ServiceDocuments from './ServiceDocuments';
import VendorCOIs from './VendorCOIs';
import AccessAuthorizations from './AccessAuthorizations';

// Mock the hooks
vi.mock('@/hooks/useDocuments', () => ({
  useDocuments: () => ({
    documents: [
      {
        document_id: '1',
        document_name: 'Test Contract.pdf',
        file_size: 1024000,
        created_at: '2024-01-01T00:00:00Z',
        category: 'contracts',
        contract_type: 'lease',
      },
    ],
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
    deleteDocument: vi.fn(),
  }),
  useDocumentDownload: () => ({
    downloadDocument: vi.fn(),
  }),
}));

vi.mock('@/hooks/useVendorCOIs', () => ({
  useVendorCOIs: () => ({
    cois: [],
    isLoading: false,
    refetch: vi.fn(),
    deleteCOI: vi.fn(),
    verifyCOI: vi.fn(),
    uploadCOIFile: vi.fn(),
    isDeleting: false,
    isVerifying: false,
  }),
  useExpiringCOIs: () => ({
    data: [],
  }),
}));

vi.mock('@/hooks/useCOIDashboardStats', () => ({
  useCOIDashboardStats: () => ({
    data: {
      active_cois: 0,
      expiring_soon: 0,
      expired_cois: 0,
      vendors_with_cois: 0,
    },
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAccessAuthorizations', () => ({
  useAccessAuthorizations: () => ({
    authorizations: [],
    isLoading: false,
    refetch: vi.fn(),
    approveAuthorization: vi.fn(),
    markInProgress: vi.fn(),
    completeAuthorization: vi.fn(),
    cancelAuthorization: vi.fn(),
    deleteAuthorization: vi.fn(),
    isApproving: false,
    isMarkingInProgress: false,
    isCompleting: false,
    isCancelling: false,
    isDeleting: false,
  }),
  useTodayAccessAuthorizations: () => ({ data: [] }),
  useUpcomingAccessAuthorizations: () => ({ data: [] }),
}));

vi.mock('@/hooks/useProviders', () => ({
  useProviders: () => ({
    providers: [],
  }),
}));

vi.mock('@/hooks/usePropertiesOptimized', () => ({
  usePropertiesOptimized: () => ({
    properties: [],
  }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: () => true,
  }),
}));

vi.mock('@/hooks/useExpiringDocumentsCount', () => ({
  markCategoryAsVisited: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Tree View Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  describe('Contracts Module', () => {
    it('renders with tree view toggle', () => {
      render(<Contracts />, { wrapper: createWrapper() });

      // Check for view mode toggle
      expect(screen.getByText('Tree View')).toBeInTheDocument();
      expect(screen.getByText('List View')).toBeInTheDocument();
    });

    it('switches between tree and list view', async () => {
      render(<Contracts />, { wrapper: createWrapper() });

      // Initially should be in tree view (default)
      const treeViewButton = screen.getByText('Tree View');
      expect(treeViewButton.closest('button')).toHaveAttribute('data-state', 'active');

      // Click list view
      const listViewButton = screen.getByText('List View');
      fireEvent.click(listViewButton);

      await waitFor(() => {
        expect(listViewButton.closest('button')).toHaveAttribute('data-state', 'active');
      });
    });

    it('displays contract type filter', () => {
      render(<Contracts />, { wrapper: createWrapper() });

      // Check for filter dropdown
      expect(screen.getByText('Filter by Type:')).toBeInTheDocument();
    });
  });

  describe('Service Documents Module', () => {
    it('renders with tree view toggle', () => {
      render(<ServiceDocuments />, { wrapper: createWrapper() });

      // Check for view mode toggle
      expect(screen.getByText('Tree View')).toBeInTheDocument();
      expect(screen.getByText('List View')).toBeInTheDocument();
    });

    it('switches between tree and list view', async () => {
      render(<ServiceDocuments />, { wrapper: createWrapper() });

      // Initially should be in tree view (default)
      const treeViewButton = screen.getByText('Tree View');
      expect(treeViewButton.closest('button')).toHaveAttribute('data-state', 'active');

      // Click list view
      const listViewButton = screen.getByText('List View');
      fireEvent.click(listViewButton);

      await waitFor(() => {
        expect(listViewButton.closest('button')).toHaveAttribute('data-state', 'active');
      });
    });
  });

  describe('Vendor COIs Module', () => {
    it('renders with tree view toggle', () => {
      render(<VendorCOIs />, { wrapper: createWrapper() });

      // Check for view mode toggle
      expect(screen.getByText('Tree View')).toBeInTheDocument();
      expect(screen.getByText('List View')).toBeInTheDocument();
    });

    it('displays filter section', () => {
      render(<VendorCOIs />, { wrapper: createWrapper() });

      // Check for filters
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('displays stats cards', () => {
      render(<VendorCOIs />, { wrapper: createWrapper() });

      // Check for stat cards
      expect(screen.getByText('Active COIs')).toBeInTheDocument();
      expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
      expect(screen.getByText('Expired')).toBeInTheDocument();
      expect(screen.getByText('Vendors Covered')).toBeInTheDocument();
    });
  });

  describe('Access Authorizations Module', () => {
    it('renders with tree view toggle', () => {
      render(<AccessAuthorizations />, { wrapper: createWrapper() });

      // Check for view mode toggle
      expect(screen.getByText('Tree View')).toBeInTheDocument();
      expect(screen.getByText('List View')).toBeInTheDocument();
    });

    it('switches between tree and list view', async () => {
      render(<AccessAuthorizations />, { wrapper: createWrapper() });

      // Initially should be in tree view (default)
      const treeViewButton = screen.getByText('Tree View');
      expect(treeViewButton.closest('button')).toHaveAttribute('data-state', 'active');

      // Click list view
      const listViewButton = screen.getByText('List View');
      fireEvent.click(listViewButton);

      await waitFor(() => {
        expect(listViewButton.closest('button')).toHaveAttribute('data-state', 'active');
      });
    });

    it('displays stats cards', () => {
      render(<AccessAuthorizations />, { wrapper: createWrapper() });

      // Check for stat cards
      expect(screen.getByText("Today's Access")).toBeInTheDocument();
      expect(screen.getByText('Upcoming (7 days)')).toBeInTheDocument();
      expect(screen.getByText('Total Active')).toBeInTheDocument();
    });
  });

  describe('View Mode Persistence', () => {
    it('maintains view mode state across re-renders', async () => {
      const { rerender } = render(<Contracts />, { wrapper: createWrapper() });

      // Switch to list view
      const listViewButton = screen.getByText('List View');
      fireEvent.click(listViewButton);

      await waitFor(() => {
        expect(listViewButton.closest('button')).toHaveAttribute('data-state', 'active');
      });

      // Re-render component
      rerender(<Contracts />);

      // View mode should still be list view
      const listViewButtonAfterRerender = screen.getByText('List View');
      expect(listViewButtonAfterRerender.closest('button')).toHaveAttribute('data-state', 'active');
    });
  });

  describe('Responsive Design', () => {
    it('hides view mode text on small screens', () => {
      render(<Contracts />, { wrapper: createWrapper() });

      // View mode buttons should have hidden class for small screens
      const treeViewButton = screen.getByText('Tree View');
      expect(treeViewButton).toHaveClass('hidden', 'sm:inline');
    });
  });

  describe('Accessibility', () => {
    it('tree view toggle uses proper ARIA attributes', () => {
      render(<Contracts />, { wrapper: createWrapper() });

      const treeViewButton = screen.getByText('Tree View').closest('button');
      const listViewButton = screen.getByText('List View').closest('button');

      // Check for data-state attribute (used by radix-ui)
      expect(treeViewButton).toHaveAttribute('data-state');
      expect(listViewButton).toHaveAttribute('data-state');
    });

    it('maintains keyboard navigation', () => {
      render(<Contracts />, { wrapper: createWrapper() });

      const treeViewButton = screen.getByText('Tree View').closest('button');
      const listViewButton = screen.getByText('List View').closest('button');

      // Both buttons should be focusable
      expect(treeViewButton).not.toHaveAttribute('disabled');
      expect(listViewButton).not.toHaveAttribute('disabled');
    });
  });
});
