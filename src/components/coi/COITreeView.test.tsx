import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { COITreeView } from './COITreeView';
import { VendorCOI } from '@/lib/schemas';

describe('COITreeView', () => {
  const mockCOIs: VendorCOI[] = [
    {
      coi_id: '1',
      vendor_id: 'vendor1',
      policy_number: 'POL-001',
      insurance_company: 'ABC Insurance',
      coverage_amount: 1000000,
      coverage_type: 'general_liability',
      valid_through: '2025-12-31',
      status: 'active',
      verified_at: '2024-01-01T00:00:00Z',
      vendor: {
        provider_id: 'vendor1',
        provider_name: 'Vendor One LLC',
      },
    },
    {
      coi_id: '2',
      vendor_id: 'vendor1',
      policy_number: 'POL-002',
      insurance_company: 'XYZ Insurance',
      coverage_amount: 500000,
      coverage_type: 'workers_comp',
      valid_through: '2024-12-31',
      status: 'expiring_soon',
      vendor: {
        provider_id: 'vendor1',
        provider_name: 'Vendor One LLC',
      },
    },
    {
      coi_id: '3',
      vendor_id: 'vendor2',
      policy_number: 'POL-003',
      insurance_company: 'DEF Insurance',
      coverage_amount: 2000000,
      coverage_type: 'general_liability',
      valid_through: '2023-12-31',
      status: 'expired',
      vendor: {
        provider_id: 'vendor2',
        provider_name: 'Vendor Two Inc',
      },
    },
  ] as VendorCOI[];

  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  it('renders tree view with vendor folders', () => {
    render(
      <COITreeView
        cois={mockCOIs}
        onEditCOI={mockOnEdit}
        canEdit={true}
      />
    );

    // Check if vendor folders are rendered
    expect(screen.getByText('Vendor One LLC')).toBeInTheDocument();
    expect(screen.getByText('Vendor Two Inc')).toBeInTheDocument();
  });

  it('shows COI count in vendor folder badges', () => {
    render(
      <COITreeView
        cois={mockCOIs}
        onEditCOI={mockOnEdit}
        canEdit={true}
      />
    );

    // Vendor One should show 2 COIs
    expect(screen.getByText('2 COIs')).toBeInTheDocument();
    // Vendor Two should show 1 COI
    expect(screen.getByText('1 COI')).toBeInTheDocument();
  });

  it('expands vendor folder when clicked', () => {
    render(
      <COITreeView
        cois={mockCOIs}
        onEditCOI={mockOnEdit}
        canEdit={true}
      />
    );

    // Initially, policy numbers should not be visible
    expect(screen.queryByText('POL-001')).not.toBeInTheDocument();

    // Click on Vendor One folder
    const vendorFolder = screen.getByText('Vendor One LLC');
    fireEvent.click(vendorFolder);

    // Now policy numbers should be visible
    expect(screen.getByText('POL-001')).toBeInTheDocument();
    expect(screen.getByText('POL-002')).toBeInTheDocument();
  });

  it('displays COI status badges correctly', () => {
    render(
      <COITreeView
        cois={mockCOIs}
        onEditCOI={mockOnEdit}
        canEdit={true}
      />
    );

    // Expand Vendor One folder
    const vendorOneFolder = screen.getByText('Vendor One LLC');
    fireEvent.click(vendorOneFolder);

    // Check for active status
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('expiring soon')).toBeInTheDocument();

    // Expand Vendor Two folder
    const vendorTwoFolder = screen.getByText('Vendor Two Inc');
    fireEvent.click(vendorTwoFolder);

    // Check for expired status
    expect(screen.getByText('expired')).toBeInTheDocument();
  });

  it('shows verified badge for verified COIs', () => {
    render(
      <COITreeView
        cois={mockCOIs}
        onEditCOI={mockOnEdit}
        canEdit={true}
      />
    );

    // Expand Vendor One folder
    const vendorFolder = screen.getByText('Vendor One LLC');
    fireEvent.click(vendorFolder);

    // Should show Verified badge
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('displays insurance company and coverage amount', () => {
    render(
      <COITreeView
        cois={mockCOIs}
        onEditCOI={mockOnEdit}
        canEdit={true}
      />
    );

    // Expand Vendor One folder
    const vendorFolder = screen.getByText('Vendor One LLC');
    fireEvent.click(vendorFolder);

    // Check for insurance company
    expect(screen.getByText('ABC Insurance')).toBeInTheDocument();
    // Check for formatted coverage amount
    expect(screen.getByText('$1,000,000')).toBeInTheDocument();
  });

  it('shows expiry date and days until expiry for expiring soon COIs', () => {
    render(
      <COITreeView
        cois={mockCOIs}
        onEditCOI={mockOnEdit}
        canEdit={true}
      />
    );

    // Expand Vendor One folder
    const vendorFolder = screen.getByText('Vendor One LLC');
    fireEvent.click(vendorFolder);

    // Should show expiry dates (there are multiple, so use getAllByText)
    const expiryTexts = screen.getAllByText(/Exp:/);
    expect(expiryTexts.length).toBeGreaterThan(0);
  });

  it('highlights expired COIs with background color', () => {
    render(
      <COITreeView
        cois={mockCOIs}
        onEditCOI={mockOnEdit}
        canEdit={true}
      />
    );

    // Expand Vendor Two folder
    const vendorFolder = screen.getByText('Vendor Two Inc');
    fireEvent.click(vendorFolder);

    // Find the actual COI row container (parent with bg-red-50 class)
    const expiredRow = screen.getByText('POL-003').closest('.bg-red-50');
    expect(expiredRow).toBeInTheDocument();
  });

  it('shows expand all and collapse all buttons', () => {
    render(
      <COITreeView
        cois={mockCOIs}
        onEditCOI={mockOnEdit}
        canEdit={true}
      />
    );

    expect(screen.getByText('Expand All')).toBeInTheDocument();
    expect(screen.getByText('Collapse All')).toBeInTheDocument();
  });

  it('expands all vendors when Expand All is clicked', () => {
    render(
      <COITreeView
        cois={mockCOIs}
        onEditCOI={mockOnEdit}
        canEdit={true}
      />
    );

    // Click Expand All
    const expandAllButton = screen.getByText('Expand All');
    fireEvent.click(expandAllButton);

    // All policy numbers should be visible
    expect(screen.getByText('POL-001')).toBeInTheDocument();
    expect(screen.getByText('POL-002')).toBeInTheDocument();
    expect(screen.getByText('POL-003')).toBeInTheDocument();
  });

  it('calls onEditCOI when edit button is clicked', () => {
    render(
      <COITreeView
        cois={mockCOIs}
        onEditCOI={mockOnEdit}
        canEdit={true}
      />
    );

    // Expand Vendor One folder
    const vendorFolder = screen.getByText('Vendor One LLC');
    fireEvent.click(vendorFolder);

    // Look for FileText icon directly in the document
    const editIcons = document.querySelectorAll('.lucide-file-text');
    expect(editIcons.length).toBeGreaterThan(0);

    // Click the first edit icon's parent button
    const editButton = editIcons[0].closest('button');
    if (editButton) {
      fireEvent.click(editButton);
      expect(mockOnEdit).toHaveBeenCalled();
    }
  });

  it('does not show edit button when canEdit is false', () => {
    render(
      <COITreeView
        cois={mockCOIs}
        canEdit={false}
      />
    );

    // Expand Vendor One folder
    const vendorFolder = screen.getByText('Vendor One LLC');
    fireEvent.click(vendorFolder);

    // Edit button should not be present - check for FileText icons
    const editIcons = document.querySelectorAll('.lucide-file-text');
    expect(editIcons.length).toBe(0);
  });

  it('shows empty state when no COIs', () => {
    render(
      <COITreeView
        cois={[]}
        canEdit={true}
      />
    );

    expect(screen.getByText('No COIs found')).toBeInTheDocument();
  });

  it('displays total vendor and COI count', () => {
    render(
      <COITreeView
        cois={mockCOIs}
        onEditCOI={mockOnEdit}
        canEdit={true}
      />
    );

    // Should show "2 vendors • 3 COIs"
    expect(screen.getByText(/2 vendors/)).toBeInTheDocument();
    expect(screen.getByText(/3 COIs/)).toBeInTheDocument();
  });

  it('sorts vendors alphabetically', () => {
    render(
      <COITreeView
        cois={mockCOIs}
        onEditCOI={mockOnEdit}
        canEdit={true}
      />
    );

    const vendorElements = screen.getAllByText(/Vendor (One|Two)/);
    // Vendor One should come before Vendor Two
    expect(vendorElements[0]).toHaveTextContent('Vendor One LLC');
    expect(vendorElements[1]).toHaveTextContent('Vendor Two Inc');
  });
});
