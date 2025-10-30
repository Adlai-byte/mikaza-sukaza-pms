import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingsTable } from './BookingsTable';
import { mockBooking } from '@/test/utils/mock-data';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock InvoiceGenerationDialog
vi.mock('./InvoiceGenerationDialog', () => ({
  InvoiceGenerationDialog: ({ open, booking }: any) =>
    open ? <div data-testid="invoice-dialog">Invoice Dialog for {booking?.guest_name}</div> : null,
}));

// Mock useBookings hook
const mockDeleteBooking = vi.fn();
const mockUpdateBooking = vi.fn();

vi.mock('@/hooks/useBookings', () => ({
  useBookings: () => ({
    deleteBooking: mockDeleteBooking,
    isDeleting: false,
    updateBooking: mockUpdateBooking,
    isUpdating: false,
  }),
}));

describe('BookingsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should display empty state when no bookings', () => {
      render(<BookingsTable bookings={[]} />);

      expect(screen.getByText('No Bookings Yet')).toBeInTheDocument();
      expect(screen.getByText('No bookings found')).toBeInTheDocument();
    });

    it('should display custom empty message', () => {
      render(<BookingsTable bookings={[]} emptyMessage="Custom empty message" />);

      expect(screen.getByText('Custom empty message')).toBeInTheDocument();
    });
  });

  describe('Bookings Display', () => {
    it('should render BookingsTable component with bookings', () => {
      const bookings = [mockBooking({ booking_id: 'b1', guest_name: 'Test Guest' })];

      render(<BookingsTable bookings={bookings} />);

      // Component should render (both desktop and mobile views render simultaneously)
      expect(screen.getAllByText(/Test Guest/i)[0]).toBeInTheDocument();
    });

    it('should display multiple bookings', () => {
      const bookings = [
        mockBooking({ booking_id: 'b1', guest_name: 'Guest One' }),
        mockBooking({ booking_id: 'b2', guest_name: 'Guest Two' }),
      ];

      render(<BookingsTable bookings={bookings} />);

      expect(screen.getByText(/Bookings List/i)).toBeInTheDocument();
    });
  });

  describe('Status Workflow - Quick Actions', () => {
    it('should show Confirm button for inquiry status', () => {
      const booking = mockBooking({
        booking_id: 'b1',
        booking_status: 'inquiry' as any,
      });

      render(<BookingsTable bookings={[booking]} />);

      expect(screen.getAllByRole('button', { name: /Confirm/i })[0]).toBeInTheDocument();
    });

    it('should show Confirm button for pending status', () => {
      const booking = mockBooking({
        booking_id: 'b2',
        booking_status: 'pending' as any,
      });

      render(<BookingsTable bookings={[booking]} />);

      expect(screen.getAllByRole('button', { name: /Confirm/i })[0]).toBeInTheDocument();
    });

    it('should show Check In button for confirmed status', () => {
      const booking = mockBooking({
        booking_id: 'b3',
        booking_status: 'confirmed',
      });

      render(<BookingsTable bookings={[booking]} />);

      expect(screen.getAllByRole('button', { name: /Check In/i })[0]).toBeInTheDocument();
    });

    it('should show Check Out button for checked_in status', () => {
      const booking = mockBooking({
        booking_id: 'b4',
        booking_status: 'checked_in' as any,
      });

      render(<BookingsTable bookings={[booking]} />);

      expect(screen.getAllByRole('button', { name: /Check Out/i })[0]).toBeInTheDocument();
    });

    it('should show Complete button for checked_out status', () => {
      const booking = mockBooking({
        booking_id: 'b5',
        booking_status: 'checked_out' as any,
      });

      render(<BookingsTable bookings={[booking]} />);

      expect(screen.getAllByRole('button', { name: /Complete/i })[0]).toBeInTheDocument();
    });

    it('should not show quick actions for completed status', () => {
      const booking = mockBooking({
        booking_id: 'b6',
        booking_status: 'completed' as any,
      });

      render(<BookingsTable bookings={[booking]} />);

      expect(screen.queryByRole('button', { name: /Confirm/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Check In/i })).not.toBeInTheDocument();
    });

    it('should not show quick actions for cancelled status', () => {
      const booking = mockBooking({
        booking_id: 'b7',
        booking_status: 'cancelled' as any,
      });

      render(<BookingsTable bookings={[booking]} />);

      expect(screen.queryByRole('button', { name: /Confirm/i })).not.toBeInTheDocument();
    });
  });

  describe('Status Change Actions', () => {
    it('should call updateBooking when confirming inquiry', async () => {
      const user = userEvent.setup();
      const booking = mockBooking({
        booking_id: 'b1',
        booking_status: 'inquiry' as any,
      });

      render(<BookingsTable bookings={[booking]} />);

      const confirmButton = screen.getAllByRole('button', { name: /Confirm/i })[0];
      await user.click(confirmButton);

      expect(mockUpdateBooking).toHaveBeenCalledWith('b1', { booking_status: 'confirmed' });
    });

    it('should call updateBooking when checking in', async () => {
      const user = userEvent.setup();
      const booking = mockBooking({
        booking_id: 'b2',
        booking_status: 'confirmed',
      });

      render(<BookingsTable bookings={[booking]} />);

      const checkInButton = screen.getAllByRole('button', { name: /Check In/i })[0];
      await user.click(checkInButton);

      expect(mockUpdateBooking).toHaveBeenCalledWith('b2', { booking_status: 'checked_in' });
    });

    it('should show confirmation dialog when checking out', async () => {
      const user = userEvent.setup();
      const booking = mockBooking({
        booking_id: 'b3',
        guest_name: 'Jane Doe',
        booking_status: 'checked_in' as any,
      });

      render(<BookingsTable bookings={[booking]} />);

      const checkOutButton = screen.getAllByRole('button', { name: /Check Out/i })[0];
      await user.click(checkOutButton);

      await waitFor(() => {
        expect(screen.getByText(/Confirm Guest Check-Out/i)).toBeInTheDocument();
      });

      expect(mockUpdateBooking).not.toHaveBeenCalled();
    });

    it('should complete checkout after confirmation', async () => {
      const user = userEvent.setup();
      const booking = mockBooking({
        booking_id: 'b4',
        guest_name: 'Bob Smith',
        booking_status: 'checked_in' as any,
      });

      render(<BookingsTable bookings={[booking]} />);

      const checkOutButton = screen.getAllByRole('button', { name: /Check Out/i })[0];
      await user.click(checkOutButton);

      await waitFor(() => {
        expect(screen.getByText(/Confirm Guest Check-Out/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /Confirm Check-Out/i });
      await user.click(confirmButton);

      expect(mockUpdateBooking).toHaveBeenCalledWith('b4', { booking_status: 'checked_out' });
    });

    it('should call updateBooking when completing', async () => {
      const user = userEvent.setup();
      const booking = mockBooking({
        booking_id: 'b5',
        booking_status: 'checked_out' as any,
      });

      render(<BookingsTable bookings={[booking]} />);

      const completeButton = screen.getAllByRole('button', { name: /Complete/i })[0];
      await user.click(completeButton);

      expect(mockUpdateBooking).toHaveBeenCalledWith('b5', { booking_status: 'completed' });
    });
  });

  describe('Delete Booking Workflow', () => {
    it('should show delete confirmation dialog', async () => {
      const user = userEvent.setup();
      const booking = mockBooking({
        booking_id: 'b6',
        guest_name: 'Alice Johnson',
      });

      render(<BookingsTable bookings={[booking]} />);

      const moreButtons = screen.getAllByRole('button', { name: /Open menu/i });
      await user.click(moreButtons[0]);

      const cancelButton = await screen.findByText(/Cancel Booking/i);
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText(/Cancel Booking\?/i)).toBeInTheDocument();
      });
    });

    it('should call deleteBooking after confirmation', async () => {
      const user = userEvent.setup();
      const booking = mockBooking({
        booking_id: 'b7',
        guest_name: 'Charlie Brown',
      });

      render(<BookingsTable bookings={[booking]} />);

      const moreButtons = screen.getAllByRole('button', { name: /Open menu/i });
      await user.click(moreButtons[0]);

      const cancelButton = await screen.findByText(/Cancel Booking/i);
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText(/Cancel Booking\?/i)).toBeInTheDocument();
      });

      const yesButton = screen.getByRole('button', { name: /Yes, Cancel Booking/i });
      await user.click(yesButton);

      expect(mockDeleteBooking).toHaveBeenCalledWith('b7');
    });
  });

  describe('Edit Booking', () => {
    it('should call onEdit when edit button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnEdit = vi.fn();
      const booking = mockBooking({ booking_id: 'b8' });

      render(<BookingsTable bookings={[booking]} onEdit={mockOnEdit} />);

      const moreButtons = screen.getAllByRole('button', { name: /Open menu/i });
      await user.click(moreButtons[0]);

      const editButton = await screen.findByText(/Edit Booking/i);
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(booking);
    });
  });

  describe('Invoice Actions', () => {
    it('should open invoice dialog for generating invoice', async () => {
      const user = userEvent.setup();
      const booking = { ...mockBooking({ booking_id: 'b9', guest_name: 'Test Guest' }), invoice_id: null };

      render(<BookingsTable bookings={[booking as any]} />);

      const moreButtons = screen.getAllByRole('button', { name: /Open menu/i });
      await user.click(moreButtons[0]);

      const generateButton = await screen.findByText(/Generate Invoice/i);
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('invoice-dialog')).toBeInTheDocument();
      });
    });

    it('should navigate to invoice when viewing existing invoice', async () => {
      const user = userEvent.setup();
      const booking = { ...mockBooking({ booking_id: 'b10' }), invoice_id: 'inv-123' };

      render(<BookingsTable bookings={[booking as any]} />);

      const moreButtons = screen.getAllByRole('button', { name: /Open menu/i });
      await user.click(moreButtons[0]);

      const viewButton = await screen.findByText(/View Invoice/i);
      await user.click(viewButton);

      expect(mockNavigate).toHaveBeenCalledWith('/invoices/inv-123');
    });
  });

  describe('Dropdown Menu Status Changes', () => {
    it('should change status from dropdown menu', async () => {
      const user = userEvent.setup();
      const booking = mockBooking({
        booking_id: 'b11',
        booking_status: 'confirmed',
      });

      render(<BookingsTable bookings={[booking]} />);

      const moreButtons = screen.getAllByRole('button', { name: /Open menu/i });
      await user.click(moreButtons[0]);

      const pendingButton = await screen.findByText(/Mark as Pending/i);
      await user.click(pendingButton);

      expect(mockUpdateBooking).toHaveBeenCalledWith('b11', { booking_status: 'pending' });
    });

    it('should allow changing to different statuses', async () => {
      const user = userEvent.setup();
      const booking = mockBooking({
        booking_id: 'b12',
        booking_status: 'pending' as any,
      });

      render(<BookingsTable bookings={[booking]} />);

      const moreButtons = screen.getAllByRole('button', { name: /Open menu/i });
      await user.click(moreButtons[0]);

      // Should show option to mark as confirmed
      expect(await screen.findByText(/Mark as Confirmed/i)).toBeInTheDocument();
    });
  });
});
