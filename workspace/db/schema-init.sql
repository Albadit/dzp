-- =============================================
-- Database Schema for Invoice Management System
-- =============================================
-- This schema is designed to be idempotent (safe to run multiple times)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fast pattern matching (ILIKE)

-- =============================================
-- Enums
-- =============================================

-- Invoice status enumeration
DO $$ BEGIN
    CREATE TYPE status_type AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Amount type enumeration (for discounts, taxes, shipping)
DO $$ BEGIN
    CREATE TYPE amount_type AS ENUM ('percent', 'fixed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Symbol position enumeration (for currency display)
DO $$ BEGIN
    CREATE TYPE symbol_position_type AS ENUM ('left', 'right');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- Functions
-- =============================================

-- Function to generate random invoice code
CREATE OR REPLACE FUNCTION generate_invoice_code()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    number_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 10-digit number
        new_number := LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
        
        -- Check if this number already exists
        SELECT EXISTS(SELECT 1 FROM invoices WHERE invoice_code = new_number) INTO number_exists;
        
        -- If it doesn't exist, return it
        IF NOT number_exists THEN
            RETURN new_number;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to calculate invoice item total
CREATE OR REPLACE FUNCTION calculate_invoice_item_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_amount := NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- Tables
-- =============================================

-- Currencies table
CREATE TABLE IF NOT EXISTS currencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    symbol_position symbol_position_type NOT NULL DEFAULT 'left',
    symbol_space BOOLEAN NOT NULL DEFAULT false,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    styling TEXT NOT NULL DEFAULT '',
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    street TEXT,
    city TEXT,
    zip_code TEXT,
    country TEXT,
    vat_number TEXT,
    coc_number TEXT,
    logo_url TEXT,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    currency_id UUID REFERENCES currencies(id) ON DELETE SET NULL,
    tax_percent DECIMAL(5, 2),
    terms TEXT,
    language TEXT DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients table (record linking for invoices)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    street TEXT,
    city TEXT,
    zip_code TEXT,
    country TEXT,
    tax_id TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    currency_id UUID NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    invoice_code TEXT UNIQUE NOT NULL DEFAULT generate_invoice_code(),
    status status_type NOT NULL DEFAULT 'pending',
    customer_name TEXT NOT NULL,
    customer_street TEXT NOT NULL,
    customer_city TEXT NOT NULL,
    customer_zip_code TEXT NOT NULL,
    customer_country TEXT NOT NULL,
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE DEFAULT CURRENT_DATE,
    discount_type amount_type,
    discount_amount DECIMAL(12, 2),
    discount_total_amount DECIMAL(12, 2),
    tax_type amount_type,
    tax_amount DECIMAL(12, 2),
    tax_total_amount DECIMAL(12, 2),
    shipping_type amount_type,
    shipping_amount DECIMAL(12, 2),
    shipping_total_amount DECIMAL(12, 2),
    notes TEXT,
    terms TEXT,
    language TEXT DEFAULT 'en',
    subtotal_amount DECIMAL(12, 2),
    total_amount DECIMAL(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Full-text search vector (generated, for fast FTS queries)
    search_tsv tsvector GENERATED ALWAYS AS (
        to_tsvector('english', 
            coalesce(invoice_code, '') || ' ' || 
            coalesce(customer_name, '') || ' ' ||
            coalesce(customer_city, '') || ' ' ||
            coalesce(customer_country, '') || ' ' ||
            coalesce(notes, '')
        )
    ) STORED,
    -- Combined search text for trigram (generated, for ILIKE queries)
    search_text text GENERATED ALWAYS AS (
        coalesce(invoice_code, '') || ' ' || 
        coalesce(customer_name, '')
    ) STORED
);

-- Invoice line items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(12, 2),
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- Role-Based Access Control (RBAC) Tables
-- =============================================

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 0,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    description TEXT,
    route TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role ↔ Permission junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (role_id, permission_id)
);

-- User ↔ Role assignment table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role_id)
);

-- Password Reset Tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- Indexes
-- =============================================

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_currencies_user_id ON currencies(user_id);
CREATE INDEX IF NOT EXISTS idx_currencies_is_system ON currencies(is_system);
CREATE INDEX IF NOT EXISTS idx_currencies_code ON currencies(code);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_is_system ON templates(is_system);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_currency_id ON invoices(currency_id);
CREATE INDEX IF NOT EXISTS idx_invoices_template_id ON invoices(template_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_code ON invoices(invoice_code);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- RBAC indexes
CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions(key);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Password reset tokens indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- Composite indexes for fast cursor-based (keyset) pagination
-- These enable O(1) pagination instead of O(n) offset on 10M+ rows
CREATE INDEX IF NOT EXISTS idx_invoices_cursor_active ON invoices(created_at DESC, id DESC) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_invoices_cursor_cancelled ON invoices(created_at DESC, id DESC) WHERE status = 'cancelled';
CREATE INDEX IF NOT EXISTS idx_invoices_status_cursor ON invoices(status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_date_cursor ON invoices(issue_date, created_at DESC, id DESC);

-- Full-text search (FTS) GIN index for fast word-based search
-- Enables queries like "payment failed" in ~1-10ms instead of seconds
CREATE INDEX IF NOT EXISTS idx_invoices_search_tsv_gin ON invoices USING GIN (search_tsv);

-- Trigram (pg_trgm) GIN indexes for fast ILIKE/substring search
-- Enables queries like "%00123%" in ~10-50ms instead of seconds
CREATE INDEX IF NOT EXISTS idx_invoices_customer_name_trgm ON invoices USING GIN (customer_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_code_trgm ON invoices USING GIN (invoice_code gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_invoices_search_text_trgm ON invoices USING GIN (search_text gin_trgm_ops);

-- =============================================
-- Views
-- =============================================

-- Invoice summary view with company and customer details
CREATE OR REPLACE VIEW invoice_summary
WITH (security_invoker = true) AS
SELECT 
    i.id,
    i.invoice_code,
    i.status,
    i.issue_date,
    i.due_date,
    i.subtotal_amount,
    i.total_amount,
    i.customer_name,
    i.customer_city,
    i.customer_country,
    c.name AS company_name,
    cur.code AS currency_code,
    cur.symbol AS currency_symbol,
    i.created_at,
    i.updated_at
FROM invoices i
LEFT JOIN companies c ON i.company_id = c.id
LEFT JOIN currencies cur ON i.currency_id = cur.id;

-- Company invoice statistics
CREATE OR REPLACE VIEW company_invoice_stats
WITH (security_invoker = true) AS
SELECT 
    c.id,
    c.name,
    COUNT(i.id) AS total_invoices,
    COALESCE(SUM(CASE WHEN i.status = 'paid' THEN 1 ELSE 0 END), 0) AS paid_invoices,
    COALESCE(SUM(CASE WHEN i.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_invoices,
    COALESCE(SUM(CASE WHEN i.status = 'overdue' THEN 1 ELSE 0 END), 0) AS overdue_invoices,
    COALESCE(SUM(i.total_amount), 0) AS total_amount,
    MAX(i.issue_date) AS last_invoice_date
FROM companies c
LEFT JOIN invoices i ON c.id = i.company_id
GROUP BY c.id, c.name;

-- Overdue invoices view
CREATE OR REPLACE VIEW overdue_invoices
WITH (security_invoker = true) AS
SELECT 
    i.id,
    i.invoice_code,
    i.company_id,
    c.name AS company_name,
    i.customer_name,
    i.issue_date,
    i.due_date,
    i.total_amount,
    (CURRENT_DATE - i.due_date) AS days_overdue
FROM invoices i
LEFT JOIN companies c ON i.company_id = c.id
WHERE i.status = 'overdue'
  AND i.due_date < CURRENT_DATE;

-- Function to calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_subtotal DECIMAL(12, 2);
    v_discount_amount DECIMAL(12, 2);
    v_discount_type amount_type;
    v_tax_amount DECIMAL(12, 2);
    v_tax_type amount_type;
    v_shipping_amount DECIMAL(12, 2);
    v_shipping_type amount_type;
    v_total DECIMAL(12, 2);
BEGIN
    -- Determine invoice_id based on trigger source
    IF TG_TABLE_NAME = 'invoice_items' THEN
        v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
    ELSE
        v_invoice_id := NEW.id;
    END IF;
    
    -- Calculate subtotal from invoice items
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_subtotal
    FROM invoice_items
    WHERE invoice_id = v_invoice_id;
    
    -- Get the invoice discount, tax, and shipping settings
    SELECT 
        COALESCE(discount_amount, 0),
        discount_type,
        COALESCE(tax_amount, 0),
        tax_type,
        COALESCE(shipping_amount, 0),
        shipping_type
    INTO v_discount_amount, v_discount_type, v_tax_amount, v_tax_type, v_shipping_amount, v_shipping_type
    FROM invoices
    WHERE id = v_invoice_id;
    
    -- Calculate discount amount
    IF v_discount_type = 'percent' THEN
        v_discount_amount := v_subtotal * (v_discount_amount / 100);
    END IF;
    
    -- Calculate tax amount (applied after discount)
    IF v_tax_type = 'percent' THEN
        v_tax_amount := (v_subtotal - v_discount_amount) * (v_tax_amount / 100);
    END IF;
    
    -- Calculate shipping amount
    IF v_shipping_type = 'percent' THEN
        v_shipping_amount := v_subtotal * (v_shipping_amount / 100);
    END IF;
    
    -- Calculate total
    v_total := v_subtotal - v_discount_amount + v_tax_amount + v_shipping_amount;
    
    -- Update invoice totals (set to NULL if 0)
    UPDATE invoices
    SET 
        subtotal_amount = v_subtotal,
        discount_total_amount = CASE WHEN v_discount_amount = 0 THEN NULL ELSE v_discount_amount END,
        tax_total_amount = CASE WHEN v_tax_amount = 0 THEN NULL ELSE v_tax_amount END,
        shipping_total_amount = CASE WHEN v_shipping_amount = 0 THEN NULL ELSE v_shipping_amount END,
        total_amount = v_total,
        updated_at = NOW()
    WHERE id = v_invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to update invoice status based on due date
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS void AS $$
BEGIN
    UPDATE invoices
    SET status = 'overdue'
    WHERE status = 'pending'
      AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- Triggers
-- =============================================

-- Triggers for updated_at columns
DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for currencies updated_at
DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_currencies_updated_at ON currencies;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER update_currencies_updated_at
    BEFORE UPDATE ON currencies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for clients updated_at
DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to recalculate invoice totals when items change
-- Trigger to calculate invoice item total
DO $$ BEGIN
    DROP TRIGGER IF EXISTS calculate_item_total ON invoice_items;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER calculate_item_total
    BEFORE INSERT OR UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_item_total();

-- Trigger to recalculate invoice totals when items change
DO $$ BEGIN
    DROP TRIGGER IF EXISTS recalculate_invoice_totals_from_items ON invoice_items;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER recalculate_invoice_totals_from_items
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_totals();

-- Trigger to calculate invoice totals when invoice is created or updated
DO $$ BEGIN
    DROP TRIGGER IF EXISTS calculate_invoice_totals_on_change ON invoices;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER calculate_invoice_totals_on_change
    AFTER INSERT OR UPDATE OF discount_type, discount_amount, tax_type, tax_amount, shipping_type, shipping_amount ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_totals();

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE currencies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Currencies: read system + own; write own non-system only
CREATE POLICY currencies_select ON currencies FOR SELECT
    USING (is_system = true OR user_id = auth.uid());
CREATE POLICY currencies_insert ON currencies FOR INSERT
    WITH CHECK (user_id = auth.uid() AND is_system = false);
CREATE POLICY currencies_update ON currencies FOR UPDATE
    USING (user_id = auth.uid() AND is_system = false)
    WITH CHECK (user_id = auth.uid() AND is_system = false);
CREATE POLICY currencies_delete ON currencies FOR DELETE
    USING (user_id = auth.uid() AND is_system = false);

-- Templates: read system + own; write own non-system only
CREATE POLICY templates_select ON templates FOR SELECT
    USING (is_system = true OR user_id = auth.uid());
CREATE POLICY templates_insert ON templates FOR INSERT
    WITH CHECK (user_id = auth.uid() AND is_system = false);
CREATE POLICY templates_update ON templates FOR UPDATE
    USING (user_id = auth.uid() AND is_system = false)
    WITH CHECK (user_id = auth.uid() AND is_system = false);
CREATE POLICY templates_delete ON templates FOR DELETE
    USING (user_id = auth.uid() AND is_system = false);

-- Companies: own rows only
CREATE POLICY companies_select ON companies FOR SELECT
    USING (user_id = auth.uid());
CREATE POLICY companies_insert ON companies FOR INSERT
    WITH CHECK (user_id = auth.uid());
CREATE POLICY companies_update ON companies FOR UPDATE
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY companies_delete ON companies FOR DELETE
    USING (user_id = auth.uid());

-- Clients: own rows only
CREATE POLICY clients_select ON clients FOR SELECT
    USING (user_id = auth.uid());
CREATE POLICY clients_insert ON clients FOR INSERT
    WITH CHECK (user_id = auth.uid());
CREATE POLICY clients_update ON clients FOR UPDATE
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY clients_delete ON clients FOR DELETE
    USING (user_id = auth.uid());

-- Invoices: own rows only
CREATE POLICY invoices_select ON invoices FOR SELECT
    USING (user_id = auth.uid());
CREATE POLICY invoices_insert ON invoices FOR INSERT
    WITH CHECK (user_id = auth.uid());
CREATE POLICY invoices_update ON invoices FOR UPDATE
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY invoices_delete ON invoices FOR DELETE
    USING (user_id = auth.uid());

-- Invoice items: inherited via parent invoice
CREATE POLICY invoice_items_select ON invoice_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id
          AND invoices.user_id = auth.uid()
    ));
CREATE POLICY invoice_items_insert ON invoice_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id
          AND invoices.user_id = auth.uid()
    ));
CREATE POLICY invoice_items_update ON invoice_items FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id
          AND invoices.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id
          AND invoices.user_id = auth.uid()
    ));
CREATE POLICY invoice_items_delete ON invoice_items FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id
          AND invoices.user_id = auth.uid()
    ));

-- =============================================
-- RBAC - Triggers
-- =============================================

-- Trigger for roles updated_at
DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RBAC - Row Level Security (RLS)
-- =============================================

ALTER TABLE roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles       ENABLE ROW LEVEL SECURITY;

-- Roles: all authenticated users can read; system roles are immutable
CREATE POLICY roles_select ON roles FOR SELECT
    USING (true);
CREATE POLICY roles_insert ON roles FOR INSERT
    WITH CHECK (is_system = false);
CREATE POLICY roles_update ON roles FOR UPDATE
    USING (is_system = false)
    WITH CHECK (is_system = false);
CREATE POLICY roles_delete ON roles FOR DELETE
    USING (is_system = false);

-- Permissions: all authenticated users can read; no direct mutation
CREATE POLICY permissions_select ON permissions FOR SELECT
    USING (true);

-- Role permissions: all authenticated users can read
CREATE POLICY role_permissions_select ON role_permissions FOR SELECT
    USING (true);

-- User roles: users can read their own assignments
CREATE POLICY user_roles_select ON user_roles FOR SELECT
    USING (user_id = auth.uid());

-- =============================================
-- Password Reset Tokens - RLS
-- =============================================

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- No direct RLS policies — access is via SECURITY DEFINER functions only

-- =============================================
-- Admin RPC Functions (SECURITY DEFINER)
-- =============================================

-- Admin: List all users with their roles
CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS TABLE (
    id uuid,
    email text,
    created_at timestamptz,
    last_sign_in_at timestamptz,
    role_id uuid,
    role_name text,
    role_level integer,
    is_system boolean
) AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.key = 'users:read'
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.email::text,
        u.created_at,
        u.last_sign_in_at,
        r.id   AS role_id,
        r.name AS role_name,
        COALESCE(r.level, 0) AS role_level,
        COALESCE(ur.is_system, false) AS is_system
    FROM auth.users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin: Update a user's role (replaces existing assignment)
CREATE OR REPLACE FUNCTION admin_update_user_role(p_user_id uuid, p_role_id uuid)
RETURNS void AS $$
DECLARE
    v_caller_is_system boolean;
    v_target_is_system boolean;
    v_target_role_name text;
    v_new_role_name text;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.key = 'users:update'
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    -- Check if the caller is a system user
    SELECT COALESCE(ur.is_system, false) INTO v_caller_is_system
    FROM user_roles ur WHERE ur.user_id = auth.uid() LIMIT 1;

    -- Check if the target user is a system user
    SELECT COALESCE(ur.is_system, false), r.name INTO v_target_is_system, v_target_role_name
    FROM user_roles ur JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id LIMIT 1;

    -- Get the new role name
    SELECT r.name INTO v_new_role_name FROM roles r WHERE r.id = p_role_id;

    -- Non-system users cannot modify system users
    IF v_target_is_system AND NOT v_caller_is_system THEN
        RAISE EXCEPTION 'Cannot modify a system user';
    END IF;

    -- Only system super admins can assign the Super Admin role
    IF v_new_role_name = 'Super Admin' AND NOT v_caller_is_system THEN
        RAISE EXCEPTION 'Only system administrators can assign the Super Admin role';
    END IF;

    DELETE FROM user_roles WHERE user_id = p_user_id;
    INSERT INTO user_roles (user_id, role_id) VALUES (p_user_id, p_role_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin: Remove a user's role assignment
CREATE OR REPLACE FUNCTION admin_remove_user_role(p_user_id uuid)
RETURNS void AS $$
DECLARE
    v_caller_is_system boolean;
    v_target_is_system boolean;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.key = 'users:update'
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    SELECT COALESCE(ur.is_system, false) INTO v_caller_is_system
    FROM user_roles ur WHERE ur.user_id = auth.uid() LIMIT 1;

    SELECT COALESCE(ur.is_system, false) INTO v_target_is_system
    FROM user_roles ur WHERE ur.user_id = p_user_id LIMIT 1;

    IF v_target_is_system AND NOT v_caller_is_system THEN
        RAISE EXCEPTION 'Cannot modify a system user';
    END IF;

    DELETE FROM user_roles WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin: Generate a 24-hour password reset token
CREATE OR REPLACE FUNCTION admin_generate_reset_token(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
    v_token uuid;
    v_caller_is_system boolean;
    v_target_is_system boolean;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.key = 'users:update'
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    SELECT COALESCE(ur.is_system, false) INTO v_caller_is_system
    FROM user_roles ur WHERE ur.user_id = auth.uid() LIMIT 1;

    SELECT COALESCE(ur.is_system, false) INTO v_target_is_system
    FROM user_roles ur WHERE ur.user_id = p_user_id LIMIT 1;

    IF v_target_is_system AND NOT v_caller_is_system THEN
        RAISE EXCEPTION 'Cannot reset password for a system user';
    END IF;

    -- Invalidate any existing unused tokens for this user
    UPDATE password_reset_tokens
    SET used_at = NOW()
    WHERE user_id = p_user_id AND used_at IS NULL;

    v_token := uuid_generate_v4();

    INSERT INTO password_reset_tokens (user_id, token, expires_at)
    VALUES (p_user_id, v_token, NOW() + INTERVAL '24 hours');

    RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Public: Validate a reset token (no auth required)
CREATE OR REPLACE FUNCTION validate_reset_token(p_token uuid)
RETURNS TABLE (valid boolean, email text) AS $$
BEGIN
    RETURN QUERY
    SELECT
        true  AS valid,
        u.email::text
    FROM password_reset_tokens prt
    JOIN auth.users u ON prt.user_id = u.id
    WHERE prt.token = p_token
      AND prt.used_at IS NULL
      AND prt.expires_at > NOW();

    IF NOT FOUND THEN
        RETURN QUERY SELECT false AS valid, NULL::text AS email;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Public: Reset password using a valid token (no auth required)
CREATE OR REPLACE FUNCTION reset_password_with_token(p_token uuid, p_new_password text)
RETURNS boolean AS $$
DECLARE
    v_user_id uuid;
BEGIN
    SELECT user_id INTO v_user_id
    FROM password_reset_tokens
    WHERE token = p_token
      AND used_at IS NULL
      AND expires_at > NOW();

    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;

    UPDATE auth.users
    SET encrypted_password = crypt(p_new_password, gen_salt('bf'))
    WHERE id = v_user_id;

    UPDATE password_reset_tokens
    SET used_at = NOW()
    WHERE token = p_token;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Admin: Replace all permissions for a role
CREATE OR REPLACE FUNCTION admin_set_role_permissions(p_role_id uuid, p_permission_ids uuid[])
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.key = 'roles:update'
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    IF EXISTS (SELECT 1 FROM roles WHERE id = p_role_id AND is_system = true) THEN
        RAISE EXCEPTION 'Cannot modify system role permissions';
    END IF;

    DELETE FROM role_permissions WHERE role_id = p_role_id;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT p_role_id, unnest(p_permission_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin: Create a new user with email and password, optionally assign a role
CREATE OR REPLACE FUNCTION admin_create_user(p_email text, p_password text, p_role_id uuid DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
    v_user_id uuid;
    v_caller_is_system boolean;
    v_new_role_name text;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.key = 'users:create'
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    -- Only system super admins can create users with Super Admin role
    IF p_role_id IS NOT NULL THEN
        SELECT r.name INTO v_new_role_name FROM roles r WHERE r.id = p_role_id;
        IF v_new_role_name = 'Super Admin' THEN
            SELECT COALESCE(ur.is_system, false) INTO v_caller_is_system
            FROM user_roles ur WHERE ur.user_id = auth.uid() LIMIT 1;
            IF NOT v_caller_is_system THEN
                RAISE EXCEPTION 'Only system administrators can create Super Admin users';
            END IF;
        END IF;
    END IF;

    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'A user with this email already exists';
    END IF;

    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
        id, instance_id, role, aud, email,
        raw_app_meta_data, raw_user_meta_data,
        is_super_admin, encrypted_password,
        created_at, updated_at, last_sign_in_at,
        email_confirmed_at, confirmation_sent_at,
        confirmation_token, recovery_token,
        email_change_token_new, email_change
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated',
        p_email,
        '{"provider":"email","providers":["email"]}', '{}',
        FALSE, crypt(p_password, gen_salt('bf')),
        NOW(), NOW(), NULL, NOW(), NOW(),
        '', '', '', ''
    );

    INSERT INTO auth.identities (id, provider_id, provider, user_id, identity_data, last_sign_in_at, created_at, updated_at)
    VALUES (v_user_id, v_user_id, 'email', v_user_id, json_build_object('sub', v_user_id), NOW(), NOW(), NOW());

    -- Optionally assign a role
    IF p_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id) VALUES (v_user_id, p_role_id);
    END IF;

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION admin_delete_user(p_user_id uuid)
RETURNS void AS $$
DECLARE
    v_target_is_system boolean;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.key = 'users:delete'
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot delete your own account';
    END IF;

    SELECT COALESCE(ur.is_system, false) INTO v_target_is_system
    FROM user_roles ur WHERE ur.user_id = p_user_id LIMIT 1;

    IF v_target_is_system THEN
        RAISE EXCEPTION 'Cannot delete a system user';
    END IF;

    DELETE FROM password_reset_tokens WHERE user_id = p_user_id;
    DELETE FROM user_roles WHERE user_id = p_user_id;
    DELETE FROM auth.identities WHERE user_id = p_user_id;
    DELETE FROM auth.sessions WHERE user_id = p_user_id;
    DELETE FROM auth.refresh_tokens WHERE instance_id = '00000000-0000-0000-0000-000000000000' AND user_id = p_user_id::text;
    DELETE FROM auth.mfa_factors WHERE user_id = p_user_id;
    DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin: Create a new permission
CREATE OR REPLACE FUNCTION admin_create_permission(p_key text, p_description text DEFAULT NULL, p_route text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
    v_id uuid;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.key = 'permissions:create'
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    INSERT INTO permissions (key, description, route)
    VALUES (p_key, p_description, p_route)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin: Update a permission
CREATE OR REPLACE FUNCTION admin_update_permission(p_id uuid, p_key text, p_description text DEFAULT NULL, p_route text DEFAULT NULL)
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.key = 'permissions:update'
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    UPDATE permissions SET key = p_key, description = p_description, route = p_route
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin: Delete a permission
CREATE OR REPLACE FUNCTION admin_delete_permission(p_id uuid)
RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = auth.uid() AND p.key = 'permissions:delete'
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    DELETE FROM role_permissions WHERE permission_id = p_id;
    DELETE FROM permissions WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute to anon for public reset functions
GRANT EXECUTE ON FUNCTION validate_reset_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_password_with_token(uuid, text) TO anon, authenticated;
