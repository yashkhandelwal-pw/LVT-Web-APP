// Supabase client configuration and database operations
class SupabaseClient {
    constructor() {
        this.supabase = null;
        this.initialize();
    }

    async initialize() {
        try {
            // Wait for supabase to be available
            if (typeof supabase === 'undefined') {
                console.log('Waiting for Supabase to load...');
                await this.waitForSupabase();
            }
            
            this.supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
            console.log('Supabase client initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
        }
    }

    async waitForSupabase() {
        return new Promise((resolve) => {
            const checkSupabase = () => {
                if (typeof supabase !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(checkSupabase, 100);
                }
            };
            checkSupabase();
        });
    }

    // Employee Management - Using lvt_universe_data table
    async getEmployeeByEmail(email) {
        try {
            // Ensure supabase client is ready
            if (!this.supabase) {
                await this.initialize();
            }
            
            // Check if employee exists in emp_record table
            const { data, error } = await this.supabase
                .from('emp_record')
                .select('email, reporting_manager_email, zonal_manager_email, status')
                .eq('email', email.toLowerCase())
                .eq('status', 'Active')
                .limit(1);
            
            if (error) throw error;
            
            // Return employee info if found
            if (data && data.length > 0) {
                const emp = data[0];
                return {
                    email: emp.email,
                    rm_email: emp.reporting_manager_email || '',
                    zm_email: emp.zonal_manager_email || '',
                    status: emp.status
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching employee:', error);
            return null;
        }
    }

    async getTeamMembers(managerEmail) {
        try {
            // For now, return empty array since we don't have manager hierarchy in current table
            // This can be enhanced when you add manager relationships
            return [];
        } catch (error) {
            console.error('Error fetching team members:', error);
            return [];
        }
    }

    // Get co-visitors list based on ZM grouping
    async getCoVisitors(userEmail) {
        try {
            // Ensure supabase client is ready
            if (!this.supabase) {
                await this.initialize();
            }
            
            // First, get the user's ZM email
            const userData = await this.getEmployeeByEmail(userEmail);
            if (!userData || !userData.zm_email) {
                console.log('User not found or no ZM assigned');
                return [];
            }
            
            console.log('Getting co-visitors for ZM:', userData.zm_email);
            
            // Get all employees with the same ZM
            const { data, error } = await this.supabase
                .from('emp_record')
                .select('email')
                .eq('zonal_manager_email', userData.zm_email)
                .eq('status', 'Active')
                .neq('email', userEmail.toLowerCase()); // Exclude the current user
            
            if (error) throw error;
            
            // Transform data to match expected format
            const coVisitors = data.map(emp => ({
                id: emp.email,
                name: emp.email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                email: emp.email
            }));
            
            // Add "No Co-Visitor" option
            coVisitors.push({
                id: '',
                name: 'No Co-Visitor',
                email: ''
            });
            
            console.log('Co-visitors found:', coVisitors.length);
            return coVisitors;
            
        } catch (error) {
            console.error('Error fetching co-visitors:', error);
            return [];
        }
    }

    // School Management - Using lvt_universe_data table
    async getSchoolsForUser(userEmail, isManager = false) {
        try {
            // Ensure supabase client is ready
            if (!this.supabase) {
                await this.initialize();
            }
            
            const { data, error } = await this.supabase
                .from('lvt_universe_data')
                .select('*')
                .eq('employee_email', userEmail.toLowerCase())
                .eq('status', 'Active');

            if (error) throw error;
            
            // Transform data to match expected format
            return data.map(row => ({
                id: row.employee_email + '_' + row.school_name, // Generate unique ID
                name: row.school_name,
                district: row.district,
                state: '', // Not available in current table
                spocs: this.buildSpocsFromRow(row)
            }));
        } catch (error) {
            console.error('Error fetching schools:', error);
            return [];
        }
    }

    async getSchoolsByDistrict(district, userEmail, isManager = false) {
        try {
            // Ensure supabase client is ready
            if (!this.supabase) {
                await this.initialize();
            }
            
            const { data, error } = await this.supabase
                .from('lvt_universe_data')
                .select('*')
                .eq('district', district)
                .eq('employee_email', userEmail.toLowerCase())
                .eq('status', 'Active');

            if (error) throw error;
            
            // Transform data to match expected format
            return data.map(row => ({
                id: row.employee_email + '_' + row.school_name,
                name: row.school_name,
                district: row.district,
                state: '',
                spocs: this.buildSpocsFromRow(row)
            }));
        } catch (error) {
            console.error('Error fetching schools by district:', error);
            return [];
        }
    }

    async getDistrictsForManager(userEmail) {
        try {
            // Ensure supabase client is ready
            if (!this.supabase) {
                await this.initialize();
            }
            
            const { data, error } = await this.supabase
                .from('lvt_universe_data')
                .select('district')
                .eq('employee_email', userEmail.toLowerCase())
                .eq('status', 'Active');
            
            if (error) throw error;
            
            const districts = [...new Set(data.map(row => row.district))].sort();
            return districts;
        } catch (error) {
            console.error('Error fetching districts:', error);
            return [];
        }
    }

    // Helper method to build SPOCs from table row
    buildSpocsFromRow(row) {
        const spocs = [];
        
        // Add SPOC 1 if exists
        if (row.spoc1_name) {
            spocs.push({
                name: row.spoc1_name,
                designation: row.spoc1_designation || '',
                phone: row.spoc1_phone_number || '',
                email: row.spoc1_email || ''
            });
        }
        
        // Add SPOC 2 if exists
        if (row.spoc2_name) {
            spocs.push({
                name: row.spoc2_name,
                designation: row.spoc2_designation || '',
                phone: row.spoc2_phone_number || '',
                email: row.spoc2_email || ''
            });
        }
        
        return spocs;
    }

    // SKU Management - Using hardcoded data for now
    async getSkuData() {
        try {
            // Since SKU data is not in your current table, we'll use the original hardcoded data
            // You can later add a SKU table or modify this to fetch from your existing data
            return {
                'Test Prep': [
                    'Physics Test Prep',
                    'Chemistry Test Prep', 
                    'Mathematics Test Prep',
                    'Biology Test Prep'
                ],
                'K-8': [
                    'Science K-8',
                    'Mathematics K-8',
                    'English K-8',
                    'Social Studies K-8'
                ],
                'Competitive': [
                    'JEE Main',
                    'JEE Advanced',
                    'NEET',
                    'UPSC'
                ]
            };
        } catch (error) {
            console.error('Error fetching SKU data:', error);
            return {};
        }
    }

    // Visit Management - For now, we'll only save to Google Sheets
    // You can add a visits table later if needed
    async saveVisit(visitData) {
        try {
            // Since you don't have a visits table yet, we'll just return success
            // The actual saving will be handled by Google Sheets integration
            console.log('Visit data prepared for Google Sheets:', visitData);
            return { success: true, data: visitData };
        } catch (error) {
            console.error('Error saving visit:', error);
            return { success: false, error: error.message };
        }
    }

    // Additional methods can be added here as needed
    // For now, we're using the lvt_universe_data table for all data
}

// Create global instance
window.supabaseClient = new SupabaseClient();
