-- Live Visit Tracker Database Schema for Supabase
-- Run these commands in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create employees table
CREATE TABLE employees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    rm_email VARCHAR(255),
    zm_email VARCHAR(255),
    is_manager BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create schools table
CREATE TABLE schools (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    state VARCHAR(100),
    district VARCHAR(100),
    assigned_to VARCHAR(255) NOT NULL, -- Employee email
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create SPOCs table
CREATE TABLE spocs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create SKUs table
CREATE TABLE skus (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create visits table
CREATE TABLE visits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    submission_id VARCHAR(50) UNIQUE NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    rm_email VARCHAR(255),
    zm_email VARCHAR(255),
    state VARCHAR(100),
    district VARCHAR(100),
    school VARCHAR(500) NOT NULL,
    meeting_outcome TEXT,
    selected_skus TEXT,
    spoc_type VARCHAR(100),
    spoc_designation VARCHAR(100),
    spoc_name VARCHAR(255),
    spoc_phone VARCHAR(20),
    spoc_email VARCHAR(255),
    co_visitor1 VARCHAR(255),
    co_visitor2 VARCHAR(255),
    remarks TEXT,
    image_url TEXT,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_schools_assigned_to ON schools(assigned_to);
CREATE INDEX idx_schools_district ON schools(district);
CREATE INDEX idx_schools_status ON schools(status);
CREATE INDEX idx_spocs_school_id ON spocs(school_id);
CREATE INDEX idx_skus_category ON skus(category);
CREATE INDEX idx_visits_user_email ON visits(user_email);
CREATE INDEX idx_visits_created_at ON visits(created_at);
CREATE INDEX idx_visits_submission_id ON visits(submission_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spocs_updated_at BEFORE UPDATE ON spocs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skus_updated_at BEFORE UPDATE ON skus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional - for testing)
INSERT INTO employees (email, rm_email, zm_email, is_manager) VALUES
('test@pw.live', 'rm@pw.live', 'zm@pw.live', false),
('manager@pw.live', 'senior@pw.live', 'zm@pw.live', true),
('rm@pw.live', 'senior@pw.live', 'zm@pw.live', true),
('zm@pw.live', 'senior@pw.live', 'zm@pw.live', true);

INSERT INTO schools (name, state, district, assigned_to, status) VALUES
('ABC School', 'Delhi', 'Central Delhi', 'test@pw.live', 'Active'),
('XYZ School', 'Delhi', 'Central Delhi', 'test@pw.live', 'Active'),
('PQR School', 'Mumbai', 'Mumbai City', 'manager@pw.live', 'Active');

INSERT INTO spocs (school_id, name, designation, phone, email) VALUES
((SELECT id FROM schools WHERE name = 'ABC School'), 'John Doe', 'Principal', '9876543210', 'john@abcschool.com'),
((SELECT id FROM schools WHERE name = 'ABC School'), 'Jane Smith', 'Teacher', '9876543211', 'jane@abcschool.com'),
((SELECT id FROM schools WHERE name = 'XYZ School'), 'Bob Johnson', 'Coordinator', '9876543212', 'bob@xyzschool.com');

INSERT INTO skus (category, name) VALUES
('Test Prep', 'Physics Test Prep'),
('Test Prep', 'Chemistry Test Prep'),
('Test Prep', 'Mathematics Test Prep'),
('K-8', 'Science K-8'),
('K-8', 'Mathematics K-8'),
('K-8', 'English K-8');

-- Set up Row Level Security (RLS)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE spocs ENABLE ROW LEVEL SECURITY;
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow all operations for authenticated users (you may want to restrict this further)
CREATE POLICY "Allow all operations for authenticated users" ON employees
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON schools
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON spocs
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON skus
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON visits
    FOR ALL USING (true);

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

