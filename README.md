# Live Visit Tracker (LVT)

A modern web application for tracking live visits, built with HTML, CSS, JavaScript, and integrated with Supabase and Google Sheets.

## 🚀 Features

- **User Authentication**: Email-based login with Supabase
- **School Management**: Dynamic school selection from database
- **Co-Visitor System**: Smart co-visitor selection based on organizational hierarchy
- **Image Capture**: Photo capture with compression and upload to Google Drive
- **Data Submission**: Automatic submission to Google Sheets with proper formatting
- **Location Services**: GPS location capture and reverse geocoding
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **APIs**: Google Sheets API, Google Drive API, Google Maps API
- **Authentication**: Google Identity Services (GIS)
- **Deployment**: Vercel/Netlify ready

## 📁 Project Structure

```
LVT/
├── app.html                 # Main application
├── index.html              # Entry point
├── launch.html             # Launch page
├── js/
│   ├── app.js              # Main application logic
│   ├── config.js           # Configuration and API keys
│   ├── google-sheets.js    # Google APIs integration
│   └── supabase-client.js  # Database client
├── database/
│   └── schema.sql          # Database schema
├── vercel.json             # Vercel deployment config
├── netlify.toml            # Netlify deployment config
└── DEPLOYMENT.md           # Deployment guide
```

## 🚀 Quick Start

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/live-visit-tracker.git
   cd live-visit-tracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Open your browser:**
   - Local: `http://localhost:8080`
   - Main App: `http://localhost:8080/app.html`

### Cloud Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

#### Quick Deploy to Vercel:
1. Push to GitHub
2. Connect to Vercel
3. Deploy automatically

## ⚙️ Configuration

### Required API Keys

Update `js/config.js` with your API keys:

```javascript
const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'your-supabase-url',
    SUPABASE_ANON_KEY: 'your-supabase-anon-key',
    
    // Google API Configuration
    GOOGLE: {
        CLIENT_ID: 'your-google-client-id',
        API_KEY: 'your-google-maps-api-key',
        // ... other settings
    },
    
    // Google Sheets Configuration
    GOOGLE_SHEETS: {
        RESPONSE_SPREADSHEET_ID: 'your-google-sheet-id',
        RESPONSE_TAB_NAME: 'Form Responses',
        IMAGE_FOLDER_ID: 'your-google-drive-folder-id'
    }
};
```

### Database Setup

1. Create a Supabase project
2. Run the SQL schema from `database/schema.sql`
3. Update the configuration with your Supabase credentials

## 📊 Database Schema

### Tables

- **`lvt_universe_data`**: School information
- **`emp_record`**: Employee records with hierarchy

### Key Fields

- Employee management with reporting relationships
- School data with SPOC information
- Co-visitor logic based on zonal manager hierarchy

## 🔧 Development

### Adding Features

1. **Frontend**: Modify `app.html` and `js/app.js`
2. **Database**: Update `js/supabase-client.js`
3. **APIs**: Modify `js/google-sheets.js`

### Testing

1. Use the local development server
2. Test all form submissions
3. Verify Google Sheets integration
4. Check image upload functionality

## 📱 Mobile Support

- Responsive design for all screen sizes
- Touch-friendly interface
- Camera integration for image capture
- GPS location services

## 🔒 Security

- Client-side validation
- Secure API key handling
- CORS configuration
- Input sanitization

## 🚀 Deployment

### Supported Platforms

- **Vercel** (Recommended)
- **Netlify**
- **GitHub Pages**
- **Any static hosting service**

### Post-Deployment

1. Update Google OAuth settings with your domain
2. Test all functionality
3. Configure custom domain (optional)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [DEPLOYMENT.md](./DEPLOYMENT.md) guide
- Review browser console for errors
- Verify API configurations
- Test with different browsers

## 🔄 Updates

- **v1.0.0**: Initial release with core functionality
- Future updates will include additional features and improvements

---

**Built with ❤️ for efficient visit tracking**