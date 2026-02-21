-- Kiosk Mapping V2 Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    spvr VARCHAR(100),
    role VARCHAR(100) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    franchise VARCHAR(255),
    area VARCHAR(10) DEFAULT 'LDN',
    status VARCHAR(50) DEFAULT 'Active',
    radius_meters INTEGER DEFAULT 200,
    municipality VARCHAR(255),
    photo_url TEXT,
    coordinate_screenshot_url TEXT,
    qr_code TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    changes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_area ON employees(area);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON employees(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123)
-- Password hash generated with bcrypt
INSERT INTO users (email, password_hash, full_name, role)
VALUES (
    'admin@kioskmap.com',
    '$2b$10$52ITjSw3f13ywDgMAp1ZUuy4e5QjbNztPhgvvaf95GbnEd5Fbmtl2',
    'System Administrator',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY users_select_own ON users
    FOR SELECT USING (auth.uid() = id);

-- Employees are readable by authenticated users
CREATE POLICY employees_select_authenticated ON employees
    FOR SELECT TO authenticated USING (true);

-- Employees can be inserted/updated/deleted by authenticated users
CREATE POLICY employees_insert_authenticated ON employees
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY employees_update_authenticated ON employees
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY employees_delete_authenticated ON employees
    FOR DELETE TO authenticated USING (true);

-- Audit logs are readable by authenticated users
CREATE POLICY audit_logs_select_authenticated ON audit_logs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY audit_logs_insert_authenticated ON audit_logs
    FOR INSERT TO authenticated WITH CHECK (true);
-- Attendance/Monitoring table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    scan_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'On Duty',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    distance_meters DECIMAL(10, 2),
    alert_type VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_scan_time ON attendance(scan_time);

-- RLS Policies
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Attendance readable by authenticated users
CREATE POLICY attendance_select_authenticated ON attendance
    FOR SELECT TO authenticated USING (true);

-- Attendance can be inserted by authenticated users (kiosk/system)
CREATE POLICY attendance_insert_authenticated ON attendance
    FOR INSERT TO authenticated WITH CHECK (true);

-- Supervisors table
CREATE TABLE IF NOT EXISTS supervisors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for supervisors
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
CREATE POLICY supervisors_select_authenticated ON supervisors
    FOR SELECT TO authenticated USING (true);

-- Unique Supervisors Insert
INSERT INTO supervisors (name)
VALUES 
('CAMILOJAYMINOZA@GFLDN'),
('CRISTIANAGATON@GFLDN'),
('CLINTDARYLBALANSAG@GFLDN'),
('EDGARDOCAINGLESJR@GFLDN'),
('JASONAMEN@GFLDN'),
('ERLUARBOLADURA@GFLDN'),
('FREXYNIESBACALSO@GFLDN'),
('HECTORCANDOLE@GFLDN'),
('ISAGANIPACULBA@GFLDN'),
('JESUSTITODONATO@GFLDN'),
('JETMICHAELDONATO@GFLDN'),
('JOELORDONA@GFLDN'),
('JUNRIEMORALES@GFLDN'),
('PATRICKCHIONG@GFLDN'),
('JOHNSTEPHGORRES@GFLDN'),
('ARNOLDABITONA@GFLDN'),
('NAVEXYRILHOTILLA@GFLDN'),
('REGIEMORALES@GFLDN'),
('MARLONTAUTOAN@GFLDN'),
('ANNESUMILE@GFLDN'),
('SUANR@GFLDN'),
('ARCHIEFERNANDEZ@GFLDN'),
('MELVINLIMBAGA@GFLDN'),
('NOELORDONEZ@GFLDN'),
('JASONGAUDIANO@GFLDN'),
('JETPEPITO@GFLDN'),
('ROELLUAB@GFLDN'),
('ARIELCANUBAS@GFLDN'),
('ODENCAMPONG@GFLDN'),
('ALANCARALOS@GFLDN'),
('JOVANFERNANDEZ@GFLDN'),
('MARJOHNDELACERNA@GFLDN'),
('RUTHERDELACERNA@GFLDN'),
('ANDYVICABIAS@GFLDN'),
('JEFFREYBAGUIO@GFLDN'),
('DAVEASIDOR@GFLDN'),
('NADERMASAUNA@GFLDN'),
('FAISALMACABATO@GFLDN'),
('FROILANBUHISAN@GFLDN'),
('JAMESMARLONLUCOT@GFLDN'),
('JOVENILLODAYLE@GFLDN'),
('NOELADELMITA@GFLDN'),
('HONEYCLEARLUMANTAS@GFLDN'),
('JAYSALAC@GFLDN'),
('MAPANTASMALA@GFLDN'),
('ALISAMAGONDACAN@GFLDN'),
('ACMADPALO@GFLDN'),
('JASONMABINI@GFLDN'),
('JESSENTPIZON@GFLDN'),
('JACKSONSLIMPANGOG@GFLDN'),
('RIELMPIZON@GFLDN'),
('IANJOHNMBALALA@GFLDN'),
('IVANKENNETHG.AGCOPRA@GFLDN'),
('COOR@GFLDN'),
('EDMONDGONZAGA@GFLDN'),
('STEVERODRIGUEZ@GFLDN')
ON CONFLICT (name) DO NOTHING;
