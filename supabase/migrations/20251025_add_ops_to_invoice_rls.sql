-- =====================================================
-- ADD OPS USER TYPE TO INVOICE RLS POLICIES
-- Allow ops (internal team) users to access invoices
-- =====================================================

-- Drop existing invoice policies
DROP POLICY IF EXISTS "Users can view invoices for their properties" ON public.invoices;
DROP POLICY IF EXISTS "Admins and property managers can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins and property managers can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can delete invoices" ON public.invoices;

-- Recreate policies with ops included

-- 1. SELECT Policy: Ops, admins, property managers, and owners can view invoices
CREATE POLICY "Users can view invoices for their properties"
    ON public.invoices FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops', 'property_manager', 'owner')
        )
    );

-- 2. INSERT Policy: Ops, admins, and property managers can create invoices
CREATE POLICY "Admins and ops can create invoices"
    ON public.invoices FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops', 'property_manager')
        )
    );

-- 3. UPDATE Policy: Ops, admins, and property managers can update invoices
CREATE POLICY "Admins and ops can update invoices"
    ON public.invoices FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops', 'property_manager')
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops', 'property_manager')
        )
    );

-- 4. DELETE Policy: Admins and ops can delete invoices
CREATE POLICY "Admins and ops can delete invoices"
    ON public.invoices FOR DELETE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops')
        )
    );

-- =====================================================
-- UPDATE INVOICE LINE ITEMS POLICIES
-- =====================================================

-- Drop existing invoice line items policies
DROP POLICY IF EXISTS "Users can view invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Admins and property managers can create invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Admins and property managers can update invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Admins and property managers can delete invoice line items" ON public.invoice_line_items;

-- Recreate line items policies with ops included

-- 1. SELECT Policy: Ops, admins, property managers, and owners can view line items
CREATE POLICY "Users can view invoice line items"
    ON public.invoice_line_items FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops', 'property_manager', 'owner')
        )
    );

-- 2. INSERT Policy: Ops, admins, and property managers can create line items
CREATE POLICY "Admins and ops can create invoice line items"
    ON public.invoice_line_items FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops', 'property_manager')
        )
    );

-- 3. UPDATE Policy: Ops, admins, and property managers can update line items
CREATE POLICY "Admins and ops can update invoice line items"
    ON public.invoice_line_items FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops', 'property_manager')
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops', 'property_manager')
        )
    );

-- 4. DELETE Policy: Ops, admins, and property managers can delete line items
CREATE POLICY "Admins and ops can delete invoice line items"
    ON public.invoice_line_items FOR DELETE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.users
            WHERE user_type IN ('admin', 'ops', 'property_manager')
        )
    );

-- =====================================================
-- MIGRATION COMPLETE
-- Added 'ops' user type to all invoice RLS policies
-- =====================================================
