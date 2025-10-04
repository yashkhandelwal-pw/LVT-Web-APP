// Google Sheets and Drive Integration for Live Visit Tracker
console.log('google-sheets.js loading...');

class GoogleSheetsService {
    constructor() {
        this.gapi = null;
        this.isInitialized = false;
        this.isAuthenticated = false;
        this.authInstance = null;
        this.tokenClient = null;
        this.accessToken = null;
        this.tokenRefreshTimer = null;
    }

    // Initialize Google API
    async initialize() {
        try {
            console.log('Initializing Google API...');
            
            // Wait for gapi to be available
            let attempts = 0;
            while (!window.gapi && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!window.gapi) {
                throw new Error('Google API failed to load. Check your internet connection and try again.');
            }

            // Initialize gapi client
            return new Promise((resolve, reject) => {
                window.gapi.load('client', async () => {
                    console.log('Google API client loaded');
                    
                    try {
                        await window.gapi.client.init({
                            apiKey: CONFIG.GOOGLE.API_KEY,
                            discoveryDocs: CONFIG.GOOGLE.DISCOVERY_DOCS
                        });

                        this.gapi = window.gapi;
                        this.isInitialized = true;
                    
                        // Initialize the token client using Google Identity Services
                        if (window.google && window.google.accounts.oauth2) {
                            this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                                client_id: CONFIG.GOOGLE.CLIENT_ID,
                                scope: CONFIG.GOOGLE.SCOPES.join(' '),
                                callback: (response) => {
                                    console.log('Token response received');
                                    this.accessToken = response.access_token;
                                    this.isAuthenticated = true;
                                    
                                    // Save token to localStorage for persistence
                                    localStorage.setItem('google_access_token', response.access_token);
                                    localStorage.setItem('google_token_expiry', (Date.now() + 3600000).toString()); // 1 hour
                                    
                                    // Set up token refresh
                                    this.setupTokenRefresh();
                                },
                                error_callback: (error) => {
                                    console.error('Token error:', error);
                                    this.isAuthenticated = false;
                                    this.clearStoredToken();
                                }
                            });
                            
                            // Check for existing valid token
                            await this.checkStoredToken();
                            
                            console.log('Google API initialized successfully with new auth');
                            resolve();
                        } else {
                            reject(new Error('Google Identity Services not loaded'));
                        }
                    } catch (initError) {
                        console.error('Google API client init error:', initError);
                        reject(new Error('Google API initialization failed. Please check your OAuth client configuration.'));
                    }
                });
            });
        } catch (error) {
            console.error('Error initializing Google API:', error);
            throw error;
        }
    }

    // Authenticate user
    async authenticate() {
        // Check for stored token first
        const storedToken = this.checkStoredToken();
        if (storedToken) {
            console.log('Using stored token');
            return { access_token: storedToken };
        }

        if (!this.isInitialized) {
            await this.initialize();
        }

        // Re-check for stored token after initialization
        const recheckToken = this.checkStoredToken();
        if (recheckToken) {
            console.log('Using stored token after initialization');
            return { access_token: recheckToken };
        }

        // Wait for Google Identity Services
        let attempts = 0;
        while (!window.google?.accounts?.oauth2 && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.google?.accounts?.oauth2) {
            throw new Error('Google Identity Services not available. Please refresh the page and try again.');
        }

        if (!this.tokenClient) {
            // Initialize token client
            this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CONFIG.GOOGLE.CLIENT_ID,
                scope: CONFIG.GOOGLE.SCOPES.join(' '),
                callback: (response) => {
                    console.log('Authentication successful');
                    this.accessToken = response.access_token;
                    this.isAuthenticated = true;
                    this.storeToken(response);
                    this.setupTokenRefresh(response);
                }
            });
        }

        try {
            console.log('Starting Google authentication...');
            
            return new Promise((resolve, reject) => {
                // Set up one-time callbacks
                const originalCallback = this.tokenClient.callback;
                const originalErrorCallback = this.tokenClient.error_callback;
                
                this.tokenClient.callback = (response) => {
                    console.log('Authentication successful');
                    this.accessToken = response.access_token;
                    this.isAuthenticated = true;
                    this.storeToken(response);
                    
                    // Restore original callbacks
                    this.tokenClient.callback = originalCallback;
                    this.tokenClient.error_callback = originalErrorCallback;
                    
                    resolve(response);
                };
                
                this.tokenClient.error_callback = (error) => {
                    console.error('Authentication failed:', error);
                    this.isAuthenticated = false;
                    
                    // Restore original callbacks
                    this.tokenClient.callback = originalCallback;
                    this.tokenClient.error_callback = originalErrorCallback;
                    
                    if (error.type === 'popup_closed') {
                        reject(new Error('Authentication cancelled by user. Please try again.'));
                    } else {
                        reject(new Error('Authentication failed: ' + error.type));
                    }
                };
                
                // Request access token
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            });
            
        } catch (error) {
            console.error('Authentication failed:', error);
            throw error;
        }
    }

    // Store token in localStorage
    storeToken(response) {
        try {
            const expiryTime = Date.now() + (response.expires_in * 1000) - 60000; // 1 minute buffer
            localStorage.setItem('google_access_token', response.access_token);
            localStorage.setItem('google_token_expiry', expiryTime.toString());
            console.log('Token stored successfully');
        } catch (error) {
            console.error('Error storing token:', error);
        }
    }

    // Check for stored token
    checkStoredToken() {
        try {
            const storedToken = localStorage.getItem('google_access_token');
            const expiryTime = localStorage.getItem('google_token_expiry');
            
            if (storedToken && expiryTime && Date.now() < parseInt(expiryTime)) {
                console.log('Found valid stored token');
                this.accessToken = storedToken;
                this.isAuthenticated = true;
                return storedToken;
            } else {
                console.log('No valid stored token found');
                this.clearStoredToken();
                return null;
            }
        } catch (error) {
            console.error('Error checking stored token:', error);
            this.clearStoredToken();
            return null;
        }
    }

    // Set up token refresh
    setupTokenRefresh() {
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
        }
        
        // Refresh token 5 minutes before expiry
        this.tokenRefreshTimer = setTimeout(() => {
            console.log('Refreshing token...');
            this.refreshToken();
        }, 3300000); // 55 minutes (5 minutes before 1-hour expiry)
    }

    // Refresh token
    async refreshToken() {
        try {
            if (this.tokenClient) {
                this.tokenClient.requestAccessToken({ prompt: '' }); // Silent refresh
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearStoredToken();
        }
    }

    // Clear stored token
    clearStoredToken() {
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_token_expiry');
        this.accessToken = null;
        this.isAuthenticated = false;
        
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
            this.tokenRefreshTimer = null;
        }
    }

    // Check if user is authenticated
    isUserAuthenticated() {
        return this.isAuthenticated && this.accessToken;
    }

    // Upload image to Google Drive
    async uploadImageToDrive(imageData, fileName) {
        // Always ensure gapi client is initialized
        if (!this.isInitialized || !this.gapi || !this.gapi.client) {
            await this.initialize();
        }
        
        if (!this.isUserAuthenticated()) {
            await this.authenticate();
        }

        try {
            console.log('Uploading image to Drive:', fileName);
            
            // Convert base64 to blob if needed
            let imageBlob;
            if (typeof imageData === 'string' && imageData.startsWith('data:')) {
                // Base64 data URL
                imageBlob = await this.base64ToBlob(imageData);
            } else if (imageData instanceof Blob) {
                // Already a blob
                imageBlob = imageData;
            } else {
                throw new Error('Invalid image data format');
            }
            
            // Use gapi client for Drive upload instead of fetch
            const metadata = {
                name: fileName,
                parents: [CONFIG.GOOGLE_SHEETS.IMAGE_FOLDER_ID]
            };

            // Step 1: Create the file metadata using authenticated request
            const createResponse = await this.gapi.client.request({
                path: 'https://www.googleapis.com/drive/v3/files',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify(metadata)
            });

            const fileId = createResponse.result.id;
            console.log('File created with ID:', fileId);

            // Step 2: Upload the file content using authenticated request
            const uploadResponse = await this.gapi.client.request({
                path: `https://www.googleapis.com/upload/drive/v3/files/${fileId}`,
                method: 'PATCH',
                params: { uploadType: 'media' },
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: imageBlob
            });

            console.log('File content uploaded successfully');

            // Set file permissions to anyone with link can view
            await this.setFilePermissions(fileId);

            // Get file web view link
            const fileInfo = await this.getFileInfo(fileId);
            return fileInfo.webViewLink;

        } catch (error) {
            console.error('Error uploading to Drive:', error);
            throw error;
        }
    }

    // Set file permissions to anyone with link can view
    async setFilePermissions(fileId) {
        try {
            const permissions = {
                role: 'reader',
                type: 'anyone'
            };

            await fetch(`${CONFIG.API.GOOGLE_DRIVE_API}/files/${fileId}/permissions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(permissions)
            });

            console.log('File permissions set for:', fileId);
        } catch (error) {
            console.error('Error setting file permissions:', error);
        }
    }

    // Get file information including web view link
    async getFileInfo(fileId) {
        try {
            const response = await fetch(`${CONFIG.API.GOOGLE_DRIVE_API}/files/${fileId}?fields=webViewLink,name,id`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get file info: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting file info:', error);
            throw error;
        }
    }

    // Submit visit data to Google Sheets
    async submitVisitToSheets(visitData) {
        // Always ensure gapi client is initialized
        if (!this.isInitialized || !this.gapi || !this.gapi.client) {
            await this.initialize();
        }
        
        if (!this.isUserAuthenticated()) {
            await this.authenticate();
        }

        try {
            console.log('Submitting visit data to Sheets:', visitData);
            console.log('GAPI client available:', !!this.gapi);
            console.log('GAPI client.client available:', !!(this.gapi && this.gapi.client));
            console.log('Access token available:', !!this.accessToken);
            console.log('Is authenticated:', this.isAuthenticated);
            console.log('Token check result:', this.checkStoredToken());

            // Ensure gapi client is available
            if (!this.gapi || !this.gapi.client) {
                throw new Error('Google API client not initialized');
            }

            // Generate K8LVT submission ID
            const submissionNumber = Math.floor(Math.random() * 90000) + 10000; // 5-digit number
            const submissionId = `K8LVT${submissionNumber}`;
            
            // Get India time (IST)
            const indiaTime = new Date().toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });

            // Determine SPOC Type based on selection
            let spocType = '';
            if (visitData.spocSelection === 'AddNewSpoc') {
                spocType = 'New SPOC';
            } else if (visitData.spocSelection && visitData.spocSelection !== 'AddNewSpoc') {
                spocType = 'Existing SPOC';
            }

            // Prepare the row data according to the sheet structure
            const rowData = [
                indiaTime, // Timestamp (India Time)
                submissionId, // Submission ID (K8LVT format)
                visitData.location?.latitude || visitData.latitude || '', // Latitude
                visitData.location?.longitude || visitData.longitude || '', // Longitude
                visitData.location?.address || visitData.location_address || '', // Location Address
                visitData.userEmail || '', // User Email
                visitData.rmEmail || '', // RM Email
                visitData.zmEmail || '', // ZM Email
                visitData.state || '', // State
                visitData.district || '', // District
                visitData.school || '', // School
                visitData.meetingOutcome || '', // Meeting Outcome
                Array.isArray(visitData.selectedSkus) ? visitData.selectedSkus.join(', ') : (visitData.selectedSkus || ''), // Selected SKUs
                spocType, // SPOC Type
                visitData.spocDesignation || '', // SPOC Designation
                visitData.spocName || '', // SPOC Name
                visitData.spocPhone || '', // SPOC Phone
                visitData.spocEmail || '', // SPOC Email
                visitData.coVisitor1 || '', // Co-Visitor 1
                visitData.coVisitor2 || '', // Co-Visitor 2
                visitData.remarks || '', // Remarks
                visitData.imageUrl || '', // Image URL
                visitData.followUpDate || '' // Follow-up Date
            ];

            // Use authenticated request for Sheets API
            const response = await this.gapi.client.request({
                path: `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.GOOGLE_SHEETS.RESPONSE_SPREADSHEET_ID}/values/${CONFIG.GOOGLE_SHEETS.RESPONSE_TAB_NAME}!A:W:append`,
                method: 'POST',
                params: {
                    valueInputOption: 'RAW',
                    insertDataOption: 'INSERT_ROWS'
                },
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify({
                    values: [rowData]
                })
            });
            
            console.log('Visit data submitted to Sheets successfully:', response);
            return response;

        } catch (error) {
            console.error('Error submitting to Sheets:', error);
            throw error;
        }
    }

    // Generate unique submission ID
    generateSubmissionId() {
        return 'LVT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Complete submission flow: upload image + submit to sheets
    async completeSubmission(visitData, imageBlob) {
        try {
            console.log('Starting complete submission flow...');
            
            let imageUrl = '';
            
            // Upload image if provided
            if (imageBlob) {
                const fileName = `visit_${visitData.submissionId || this.generateSubmissionId()}_${Date.now()}.jpg`;
                imageUrl = await this.uploadImageToDrive(imageBlob, fileName);
                console.log('Image uploaded, URL:', imageUrl);
            }

            // Add image URL to visit data
            visitData.imageUrl = imageUrl;

            // Submit to sheets
            const result = await this.submitVisitToSheets(visitData);
            
            console.log('Complete submission successful:', result);
            return {
                success: true,
                imageUrl: imageUrl,
                submissionId: visitData.submissionId || this.generateSubmissionId(),
                sheetsResult: result
            };

        } catch (error) {
            console.error('Complete submission failed:', error);
            throw error;
        }
    }

    // Convert base64 data URL to blob
    async base64ToBlob(base64Data) {
        try {
            // Remove data URL prefix if present
            const base64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
            
            // Convert base64 to binary
            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type: 'image/jpeg' });
        } catch (error) {
            console.error('Error converting base64 to blob:', error);
            throw error;
        }
    }

    // Sign out
    signOut() {
        this.clearStoredToken();
        if (window.google && window.google.accounts.oauth2) {
            window.google.accounts.oauth2.revoke();
        }
        console.log('User signed out');
    }
}

// Create global instance
try {
    console.log('CONFIG available:', typeof CONFIG !== 'undefined');
    console.log('CONFIG.GOOGLE:', typeof CONFIG !== 'undefined' ? CONFIG.GOOGLE : 'undefined');
    
    const googleSheetsService = new GoogleSheetsService();
    
    // Make available globally
    window.googleSheetsService = googleSheetsService;
    console.log('Google Sheets service created and available globally:', !!window.googleSheetsService);
} catch (error) {
    console.error('Error creating Google Sheets service:', error);
    window.googleSheetsService = null;
}

console.log('google-sheets.js loaded successfully');