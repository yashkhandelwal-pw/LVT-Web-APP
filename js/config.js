// Configuration file for Live Visit Tracker
const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'https://kfkcohosbpaeuzxuohrm.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtma2NvaG9zYnBhZXV6eHVvaHJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMDgyODgsImV4cCI6MjA2OTc4NDI4OH0.0f5ux3Z1B2Y8acpn7ZC40HiLeW3QhZcvZkr758ySivk',
    
    // Google API Configuration
    GOOGLE: {
        CLIENT_ID: '1003068401933-cuavbgj55nteckl759gve9n9p95rf1as.apps.googleusercontent.com',
        API_KEY: 'AIzaSyCIKzlXJxwS3gcaB9jgzbDkjhetqoRe6t0',
        DISCOVERY_DOCS: [
            'https://sheets.googleapis.com/$discovery/rest?version=v4',
            'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
        ],
        SCOPES: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/calendar'
        ]
    },
    
    // Google Sheets Configuration
    GOOGLE_SHEETS: {
        SOURCE_SPREADSHEET_ID: '1EVy-Nt5Dr-WK_AHHlwggF7jXxUqOq74Wnj7DUImtZLg',
        RESPONSE_SPREADSHEET_ID: '1Ur1uRo2jg959JCLh0a2cB0vMZ9N0-3rnjYKiPPl6yPY',
        RESPONSE_TAB_NAME: 'Form Responses',
        IMAGE_FOLDER_ID: '1RH5RsTzzxlQNePY1SnmIFzbUQONom7vG'
    },
    
    // Google Calendar Configuration
    CALENDAR: {
        SECONDARY_CALENDAR_ID: 'PASTE_YOUR_CALENDAR_ID_HERE' // Replace with your calendar ID
    },
    
    // Application Settings
    APP: {
        COMPANY_EMAIL_DOMAIN: '@pw.live',
        CACHE_DURATION: 300, // 5 minutes in seconds
        SUBMISSION_TIMEOUT: 15000, // 15 seconds
        IMAGE_COMPRESSION: {
            MAX_WIDTH: 1024,
            MAX_HEIGHT: 1024,
            QUALITY: 0.7
        }
    },
    
    // API Endpoints
    API: {
        GOOGLE_SHEETS_API: 'https://sheets.googleapis.com/v4/spreadsheets',
        GOOGLE_DRIVE_API: 'https://www.googleapis.com/drive/v3',
        GOOGLE_CALENDAR_API: 'https://www.googleapis.com/calendar/v3'
    }
};

// Make CONFIG available globally
window.CONFIG = CONFIG;
