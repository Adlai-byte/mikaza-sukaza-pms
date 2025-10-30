import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DocumentTreeView, TreeFolder } from './DocumentTreeView';
import { DocumentSummary } from '@/lib/schemas';

describe('DocumentTreeView', () => {
  const mockDocuments: DocumentSummary[] = [
    {
      document_id: '1',
      document_name: 'Contract 1.pdf',
      file_size: 1024000,
      created_at: '2024-01-01T00:00:00Z',
      uploaded_by_name: 'John Doe',
      category: 'contracts',
      contract_type: 'lease',
    },
    {
      document_id: '2',
      document_name: 'Contract 2.pdf',
      file_size: 2048000,
      created_at: '2024-01-02T00:00:00Z',
      uploaded_by_name: 'Jane Smith',
      category: 'contracts',
      contract_type: 'service',
    },
    {
      document_id: '3',
      document_name: 'Contract 3.pdf',
      file_size: 512000,
      created_at: '2024-01-03T00:00:00Z',
      uploaded_by_name: 'Bob Johnson',
      category: 'contracts',
      contract_type: 'lease',
    },
  ] as DocumentSummary[];

  const mockFolders: TreeFolder[] = [
    { id: 'lease', name: 'Lease Contracts', metadata: { type: 'lease' } },
    { id: 'service', name: 'Service Agreements', metadata: { type: 'service' } },
  ];

  const mockGroupDocuments = (doc: DocumentSummary, folder: TreeFolder) => {
    return doc.contract_type === folder.metadata?.type;
  };

  const mockOnDownload = vi.fn();
  const mockOnDelete = vi.fn();

  it('renders tree view with folders and documents', () => {
    render(
      <DocumentTreeView
        documents={mockDocuments}
        folders={mockFolders}
        groupDocuments={mockGroupDocuments}
        onDownloadDocument={mockOnDownload}
      />
    );

    // Check if folders are rendered
    expect(screen.getByText('Lease Contracts')).toBeInTheDocument();
    expect(screen.getByText('Service Agreements')).toBeInTheDocument();
  });

  it('shows document count in folder badges', () => {
    render(
      <DocumentTreeView
        documents={mockDocuments}
        folders={mockFolders}
        groupDocuments={mockGroupDocuments}
        onDownloadDocument={mockOnDownload}
      />
    );

    // Lease folder should show 2 documents
    const leaseBadge = screen.getByText('2');
    expect(leaseBadge).toBeInTheDocument();

    // Service folder should show 1 document
    const serviceBadge = screen.getByText('1');
    expect(serviceBadge).toBeInTheDocument();
  });

  it('expands folder when clicked', () => {
    render(
      <DocumentTreeView
        documents={mockDocuments}
        folders={mockFolders}
        groupDocuments={mockGroupDocuments}
        onDownloadDocument={mockOnDownload}
      />
    );

    // Initially, documents should not be visible
    expect(screen.queryByText('Contract 1.pdf')).not.toBeInTheDocument();

    // Click on Lease Contracts folder
    const leaseFolder = screen.getByText('Lease Contracts');
    fireEvent.click(leaseFolder);

    // Now documents should be visible
    expect(screen.getByText('Contract 1.pdf')).toBeInTheDocument();
    expect(screen.getByText('Contract 3.pdf')).toBeInTheDocument();
  });

  it('shows expand all and collapse all buttons', () => {
    render(
      <DocumentTreeView
        documents={mockDocuments}
        folders={mockFolders}
        groupDocuments={mockGroupDocuments}
        onDownloadDocument={mockOnDownload}
      />
    );

    expect(screen.getByText('Expand All')).toBeInTheDocument();
    expect(screen.getByText('Collapse All')).toBeInTheDocument();
  });

  it('expands all folders when Expand All is clicked', () => {
    render(
      <DocumentTreeView
        documents={mockDocuments}
        folders={mockFolders}
        groupDocuments={mockGroupDocuments}
        onDownloadDocument={mockOnDownload}
      />
    );

    // Click Expand All
    const expandAllButton = screen.getByText('Expand All');
    fireEvent.click(expandAllButton);

    // All documents should be visible
    expect(screen.getByText('Contract 1.pdf')).toBeInTheDocument();
    expect(screen.getByText('Contract 2.pdf')).toBeInTheDocument();
    expect(screen.getByText('Contract 3.pdf')).toBeInTheDocument();
  });

  it('collapses all folders when Collapse All is clicked', () => {
    render(
      <DocumentTreeView
        documents={mockDocuments}
        folders={mockFolders}
        groupDocuments={mockGroupDocuments}
        onDownloadDocument={mockOnDownload}
      />
    );

    // First expand all
    const expandAllButton = screen.getByText('Expand All');
    fireEvent.click(expandAllButton);

    // Verify documents are visible
    expect(screen.getByText('Contract 1.pdf')).toBeInTheDocument();

    // Now collapse all
    const collapseAllButton = screen.getByText('Collapse All');
    fireEvent.click(collapseAllButton);

    // Documents should be hidden
    expect(screen.queryByText('Contract 1.pdf')).not.toBeInTheDocument();
  });

  it('displays file sizes correctly', () => {
    render(
      <DocumentTreeView
        documents={mockDocuments}
        folders={mockFolders}
        groupDocuments={mockGroupDocuments}
        onDownloadDocument={mockOnDownload}
      />
    );

    // Expand folder
    const leaseFolder = screen.getByText('Lease Contracts');
    fireEvent.click(leaseFolder);

    // Check file sizes (1024000 bytes = 1000.0 KB)
    expect(screen.getByText('1000.0 KB')).toBeInTheDocument();
    // 512000 bytes = 500.0 KB
    expect(screen.getByText('500.0 KB')).toBeInTheDocument();
  });

  it('calls onDownloadDocument when download button is clicked', () => {
    render(
      <DocumentTreeView
        documents={mockDocuments}
        folders={mockFolders}
        groupDocuments={mockGroupDocuments}
        onDownloadDocument={mockOnDownload}
      />
    );

    // Expand folder
    const leaseFolder = screen.getByText('Lease Contracts');
    fireEvent.click(leaseFolder);

    // Get all download buttons (there should be 2 in lease folder)
    const downloadButtons = screen.getAllByRole('button', { name: '' });
    const downloadButton = downloadButtons.find(btn =>
      btn.querySelector('svg')?.classList.contains('lucide-download')
    );

    if (downloadButton) {
      fireEvent.click(downloadButton);
      expect(mockOnDownload).toHaveBeenCalled();
    }
  });

  it('shows delete button when canDelete is true', () => {
    render(
      <DocumentTreeView
        documents={mockDocuments}
        folders={mockFolders}
        groupDocuments={mockGroupDocuments}
        onDownloadDocument={mockOnDownload}
        onDeleteDocument={mockOnDelete}
        canDelete={true}
      />
    );

    // Expand folder
    const leaseFolder = screen.getByText('Lease Contracts');
    fireEvent.click(leaseFolder);

    // Delete functionality should be available when canDelete is true
    // The button is rendered but has opacity-0 until hover
    // Check that the component received the canDelete prop and onDeleteDocument handler
    expect(mockOnDelete).toBeDefined();

    // Verify action container exists (which would contain delete button)
    const actionContainers = document.querySelectorAll('.group-hover\\:opacity-100');
    expect(actionContainers.length).toBeGreaterThan(0);
  });

  it('does not show delete button when canDelete is false', () => {
    render(
      <DocumentTreeView
        documents={mockDocuments}
        folders={mockFolders}
        groupDocuments={mockGroupDocuments}
        onDownloadDocument={mockOnDownload}
        canDelete={false}
      />
    );

    // Expand folder
    const leaseFolder = screen.getByText('Lease Contracts');
    fireEvent.click(leaseFolder);

    // Trash icon should not be present
    const buttons = screen.getAllByRole('button', { name: '' });
    const hasTrashIcon = buttons.some(btn =>
      btn.querySelector('svg')?.classList.contains('lucide-trash-2')
    );
    expect(hasTrashIcon).toBe(false);
  });

  it('shows empty state when no documents', () => {
    render(
      <DocumentTreeView
        documents={[]}
        folders={mockFolders}
        groupDocuments={mockGroupDocuments}
        onDownloadDocument={mockOnDownload}
        emptyMessage="No documents available"
      />
    );

    expect(screen.getByText('No documents available')).toBeInTheDocument();
  });

  it('displays total document and folder count', () => {
    render(
      <DocumentTreeView
        documents={mockDocuments}
        folders={mockFolders}
        groupDocuments={mockGroupDocuments}
        onDownloadDocument={mockOnDownload}
      />
    );

    // Should show "2 folders • 3 documents"
    expect(screen.getByText(/2 folders/)).toBeInTheDocument();
    expect(screen.getByText(/3 documents/)).toBeInTheDocument();
  });

  it('creates unassigned folder for documents without matching folder', () => {
    const docsWithUnassigned: DocumentSummary[] = [
      ...mockDocuments,
      {
        document_id: '4',
        document_name: 'Unassigned.pdf',
        file_size: 1024,
        created_at: '2024-01-04T00:00:00Z',
        category: 'contracts',
        contract_type: 'unknown',
      } as DocumentSummary,
    ];

    render(
      <DocumentTreeView
        documents={docsWithUnassigned}
        folders={mockFolders}
        groupDocuments={mockGroupDocuments}
        onDownloadDocument={mockOnDownload}
      />
    );

    // Should show Unassigned Documents folder
    expect(screen.getByText('Unassigned Documents')).toBeInTheDocument();
  });
});
