# Live Visit Tracker - Server Setup Guide

## 🚀 Quick Start (Choose One Method)

### Method 1: Using Live-Server (Recommended)

**For Windows:**
```bash
# Double-click start-server.bat
# OR run in Command Prompt:
start-server.bat
```

**For Mac/Linux:**
```bash
# Run in Terminal:
./start-server.sh
# OR:
bash start-server.sh
```

**Manual Installation:**
```bash
# Install live-server globally
npm install -g live-server

# Start server
live-server --port=3000 --open=/index.html --cors
```

### Method 2: Using Node.js HTTP Server

```bash
# Install dependencies
npm install

# Start server
node start-server.js
```

### Method 3: Using Python (if Node.js not available)

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

### Method 4: Using PHP (if available)

```bash
php -S localhost:8000
```

## 📱 Testing on Mobile Devices

1. **Find your computer's IP address:**
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` or `ip addr`

2. **Access from mobile:**
   - Open browser on your phone
   - Go to `http://[YOUR_IP]:3000`
   - Example: `http://192.168.1.100:3000`

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Kill process using port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID [PID_NUMBER] /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9
```

### CORS Issues
- Make sure you're using `--cors` flag with live-server
- Check browser console for CORS errors
- Try different browser

### Supabase Connection Issues
- Check your internet connection
- Verify Supabase URL and API key in `js/config.js`
- Check browser console for errors

## 📁 File Structure
```
LVT/
├── index.html              # Main application
├── test-connection.html    # Supabase connection test
├── test-data-flow.html     # Data flow test
├── test-simple.html        # Simple connection test
├── js/
│   ├── config.js          # Configuration
│   ├── supabase-client.js # Supabase operations
│   ├── google-sheets.js   # Google APIs
│   └── app.js             # Main app logic
├── package.json           # Dependencies
├── start-server.js        # Node.js server
├── start-server.bat       # Windows batch file
├── start-server.sh        # Mac/Linux shell script
└── SETUP.md              # This file
```

## 🌐 Access URLs

Once server is running, you can access:

- **Main App**: http://localhost:3000
- **Connection Test**: http://localhost:3000/test-connection.html
- **Data Flow Test**: http://localhost:3000/test-data-flow.html
- **Simple Test**: http://localhost:3000/test-simple.html

## 📱 Mobile Testing

1. **Start server** using any method above
2. **Find your IP address**:
   - Windows: `ipconfig | findstr IPv4`
   - Mac/Linux: `ifconfig | grep inet`
3. **Access from phone**: `http://[YOUR_IP]:3000`

## 🔍 Debugging

### Check Browser Console (F12)
- Look for JavaScript errors
- Check network requests
- Verify Supabase connection

### Test Supabase Connection
1. Open `test-simple.html`
2. Click "Test Supabase Connection"
3. Should show success with sample data

### Test Main App
1. Open `index.html`
2. Try logging in with an email from your database
3. Check if schools load correctly

## 🚀 Production Deployment

For production, consider:
- **Netlify**: Drag and drop your folder
- **Vercel**: Connect your GitHub repo
- **GitHub Pages**: Push to GitHub and enable Pages
- **Firebase Hosting**: Use Firebase CLI
- **AWS S3**: Upload files to S3 bucket

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify your Supabase configuration
3. Test with `test-simple.html` first
4. Check network connectivity

