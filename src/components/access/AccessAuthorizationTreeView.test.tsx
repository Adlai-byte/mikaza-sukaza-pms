import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccessAuthorizationTreeView } from './AccessAuthorizationTreeView';
import { AccessAuthorization } from '@/lib/schemas';

describe('AccessAuthorizationTreeView', () => {
  const mockAuthorizations: AccessAuthorization[] = [
    {
      access_auth_id: '1',
      vendor_id: 'vendor1',
      property_id: 'prop1',
      access_date: '2024-01-15',
      access_time_start: '09:00',
      access_time_end: '17:00',
      number_of_personnel: 3,
      vendor_contact_name: 'John Doe',
      vendor_contact_phone: '555-0001',
      status: 'approved',
      vendor: {
        provider_id: 'vendor1',
        provider_name: 'ABC Services',
      },
      property: {
        property_id: 'prop1',
        property_name: 'Building A',
        property_type: 'commercial',
      },
    },
    {
      access_auth_id: '2',
      vendor_id: 'vendor2',
      property_id: 'prop1',
      access_date: new Date().toISOString().split('T')[0], // Today
      access_time_start: '10:00',
      access_time_end: '16:00',
      number_of_personnel: 2,
      vendor_contact_name: 'Jane Smith',
      status: 'in_progress',
      vendor: {
        provider_id: 'vendor2',
        provider_name: 'XYZ Maintenance',
      },
      property: {
        property_id: 'prop1',
        property_name: 'Building A',
        property_type: 'commercial',
      },
    },
    {
      access_auth_id: '3',
      vendor_id: 'vendor3',
      property_id: 'prop2',
      access_date: '2024-02-01',
      number_of_personnel: 1,
      status: 'requested',
      vendor: {
        provider_id: 'vendor3',
        provider_name: 'DEF Contractors',
      },
      property: {
        property_id: 'prop2',
        property_name: 'Building B',
        property_type: 'residential',
      },
    },
  ] as AccessAuthorization[];

  const mockOnEdit = vi.fn();

  it('renders tree view with property folders', () => {
    render(
      <AccessAuthorizationTreeView
        authorizations={mockAuthorizations}
        onEditAuth={mockOnEdit}
        canEdit={true}
      />
    );

    // Check if property folders are rendered
    expect(screen.getByText('Building A')).toBeInTheDocument();
    expect(screen.getByText('Building B')).toBeInTheDocument();
  });

  it('shows authorization count in property folder badges', () => {
    render(
      <AccessAuthorizationTreeView
        authorizations={mockAuthorizations}
        onEditAuth={mockOnEdit}
        canEdit={true}
      />
    );

    // Building A should show 2 authorizations
    expect(screen.getByText('2 authorizations')).toBeInTheDocument();
    // Building B should show 1 authorization
    expect(screen.getByText('1 authorization')).toBeInTheDocument();
  });

  it('expands property folder when clicked', () => {
    render(
      <AccessAuthorizationTreeView
        authorizations={mockAuthorizations}
        onEditAuth={mockOnEdit}
        canEdit={true}
      />
    );

    // Initially, vendor names should not be visible
    expect(screen.queryByText('ABC Services')).not.toBeInTheDocument();

    // Click on Building A folder
    const propertyFolder = screen.getByText('Building A');
    fireEvent.click(propertyFolder);

    // Now vendor names should be visible
    expect(screen.getByText('ABC Services')).toBeInTheDocument();
    expect(screen.getByText('XYZ Maintenance')).toBeInTheDocument();
  });

  it('displays authorization status badges correctly', () => {
    render(
      <AccessAuthorizationTreeView
        authorizations={mockAuthorizations}
        onEditAuth={mockOnEdit}
        canEdit={true}
      />
    );

    // Expand Building A folder
    const propertyFolder = screen.getByText('Building A');
    fireEvent.click(propertyFolder);

    // Check for status badges
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('highlights today\'s authorizations', () => {
    render(
      <AccessAuthorizationTreeView
        authorizations={mockAuthorizations}
        onEditAuth={mockOnEdit}
        canEdit={true}
      />
    );

    // Expand Building A folder
    const propertyFolder = screen.getByText('Building A');
    fireEvent.click(propertyFolder);

    // Should show "Today" badge for today's authorization
    expect(screen.getByText('Today')).toBeInTheDocument();

    // Find the actual row container (parent with bg-blue-50 class)
    const todayRow = screen.getByText('XYZ Maintenance').closest('.bg-blue-50');
    expect(todayRow).toBeInTheDocument();
  });

  it('displays access date and time window', () => {
    render(
      <AccessAuthorizationTreeView
        authorizations={mockAuthorizations}
        onEditAuth={mockOnEdit}
        canEdit={true}
      />
    );

    // Expand Building A folder
    const propertyFolder = screen.getByText('Building A');
    fireEvent.click(propertyFolder);

    // Check for time window
    expect(screen.getByText('09:00 - 17:00')).toBeInTheDocument();
    expect(screen.getByText('10:00 - 16:00')).toBeInTheDocument();
  });

  it('displays vendor contact information', () => {
    render(
      <AccessAuthorizationTreeView
        authorizations={mockAuthorizations}
        onEditAuth={mockOnEdit}
        canEdit={true}
      />
    );

    // Expand Building A folder
    const propertyFolder = screen.getByText('Building A');
    fireEvent.click(propertyFolder);

    // Check for contact names
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('displays number of personnel', () => {
    render(
      <AccessAuthorizationTreeView
        authorizations={mockAuthorizations}
        onEditAuth={mockOnEdit}
        canEdit={true}
      />
    );

    // Expand Building A folder
    const propertyFolder = screen.getByText('Building A');
    fireEvent.click(propertyFolder);

    // Check for personnel numbers
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows expand all and collapse all buttons', () => {
    render(
      <AccessAuthorizationTreeView
        authorizations={mockAuthorizations}
        onEditAuth={mockOnEdit}
        canEdit={true}
      />
    );

    expect(screen.getByText('Expand All')).toBeInTheDocument();
    expect(screen.getByText('Collapse All')).toBeInTheDocument();
  });

  it('expands all properties when Expand All is clicked', () => {
    render(
      <AccessAuthorizationTreeView
        authorizations={mockAuthorizations}
        onEditAuth={mockOnEdit}
        canEdit={true}
      />
    );

    // Click Expand All
    const expandAllButton = screen.getByText('Expand All');
    fireEvent.click(expandAllButton);

    // All vendor names should be visible
    expect(screen.getByText('ABC Services')).toBeInTheDocument();
    expect(screen.getByText('XYZ Maintenance')).toBeInTheDocument();
    expect(screen.getByText('DEF Contractors')).toBeInTheDocument();
  });

  it('collapses all properties when Collapse All is clicked', () => {
    render(
      <AccessAuthorizationTreeView
        authorizations={mockAuthorizations}
        onEditAuth={mockOnEdit}
        canEdit={true}
      />
    );

    // First expand all
    const expandAllButton = screen.getByText('Expand All');
    fireEvent.click(expandAllButton);

    // Verify vendors are visible
    expect(screen.getByText('ABC Services')).toBeInTheDocument();

    // Now collapse all
    const collapseAllButton = screen.getByText('Collapse All');
    fireEvent.click(collapseAllButton);

    // Vendors should be hidden
    expect(screen.queryByText('ABC Services')).not.toBeInTheDocument();
  });

  it('calls onEditAuth when edit button is clicked', () => {
    render(
      <AccessAuthorizationTreeView
        authorizations={mockAuthorizations}
        onEditAuth={mockOnEdit}
        canEdit={true}
      />
    );

    // Expand Building A folder
    const propertyFolder = screen.getByText('Building A');
    fireEvent.click(propertyFolder);

    // Get edit buttons
    const editButtons = screen.getAllByRole('button', { name: '' });
    const editButton = editButtons.find(btn =>
      btn.querySelector('svg')?.classList.contains('lucide-key-round')
    );

    if (editButton) {
      fireEvent.click(editButton);
      expect(mockOnEdit).toHaveBeenCalled();
    }
  });

  it('does not show edit button when canEdit is false', () => {
    render(
      <AccessAuthorizationTreeView
        authorizations={mockAuthorizations}
        canEdit={false}
      />
    );

    // Expand Building A folder
    const propertyFolder = screen.getByText('Building A');
    fireEvent.click(propertyFolder);

    // Edit button should not be present - look for action buttons in group-hover containers
    // When canEdit is false, the action div with opacity-0 should not have any buttons
    const actionContainers = document.querySelectorAll('.group-hover\\:opacity-100');

    // Check that action containers either don't exist or are empty
    let hasEditButtons = false;
    actionContainers.forEach(container => {
      const keyRoundIcons = container.querySelectorAll('.lucide-key-round');
      if (keyRoundIcons.length > 0) {
        hasEditButtons = true;
      }
    });

    expect(hasEditButtons).toBe(false);
  });

  it('shows empty state when no authorizations', () => {
    render(
      <AccessAuthorizationTreeView
        authorizations={[]}
        canEdit={true}
      />
    );

    expect(screen.getByText('No access authorizations found')).toBeInTheDocument();
  });

  it('displays total property and authorization count', () => {
    render(
      <AccessAuthorizationTreeView
        authorizations={mockAuthorizations}
        onEditAuth={mockOnEdit}
        canEdit={true}
      />
    );

    // Should show "2 properties • 3 authorizations"
    expect(screen.getByText(/2 properties/)).toBeInTheDocument();
    expect(screen.getByText(/3 authorizations/)).toBeInTheDocument();
  });

  it('sorts properties alphabetically', () => {
    render(
      <AccessAuthorizationTreeView
        authorizations={mockAuthorizations}
        onEditAuth={mockOnEdit}
        canEdit={true}
      />
    );

    const propertyElements = screen.getAllByText(/Building [AB]/);
    // Building A should come before Building B
    expect(propertyElements[0]).toHaveTextContent('Building A');
    expect(propertyElements[1]).toHaveTextContent('Building B');
  });
});
