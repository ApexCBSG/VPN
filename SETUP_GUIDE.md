# VPN Application - Setup Guide

This guide will help you set up and run both the backend and frontend of the VPN application.

---

## Prerequisites

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** - Local instance or MongoDB Atlas cloud connection
- **Android Studio** - For running the mobile app (Optional: alternately use Expo Go on physical device)

---

## Backend Setup

### 1. Navigate to Backend Directory
```bash
cd BACKEND
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the `BACKEND` directory with the following variables:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/vpn
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

### 4. Start the Backend Server
```bash
npm start
```
or for development with auto-reload:
```bash
npx nodemon index.js
```

The backend will start on `http://localhost:5000`

---

## Frontend Setup

### 1. Navigate to Frontend Directory
```bash
cd vpn-mobile-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run on Android Studio (Recommended)
```bash
npm run android
```

This will automatically launch the app in Android Studio emulator.

### Alternative: Run on Physical Device
Install **Expo Go** app on your Android phone, then:
```bash
npm start
```

Scan the QR code displayed in the terminal using Expo Go app.

### Alternative: Run on Web Browser
```bash
npm run web
```

The app will open at `http://localhost:8082`

---

## Verifying Everything Works

1. **Backend Running**: Visit `http://localhost:5000` in your browser (should show API endpoints)
2. **Frontend Running**: 
   - Check Android Studio emulator for app launch
   - Or visit `http://localhost:8082` if running on web
3. **Test API Connection**: The app should be able to make requests to the backend

---

## Troubleshooting

### Backend won't start
- Ensure MongoDB is running locally or MongoDB Atlas is accessible
- Check that port 5000 is not in use
- Verify `.env` file is properly configured

### Frontend won't start
- Install required web dependencies: `npx expo install react-dom react-native-web`
- Clear cache: `npm cache clean --force`
- If port 8082 is in use, Expo will automatically use the next available port

### AndroidStudio/Emulator issues
- Ensure Android Studio is installed and emulator is configured
- Check: `Help > About > Android Studio` version
- Run: `npm run android` from the frontend directory

---

## Project Structure

```
VPN/
├── BACKEND/          # Node.js Express API
├── vpn-mobile-app/   # React Native Expo app
└── SETUP_GUIDE.md    # This file
```

---

## Support

If you encounter any issues, check the console logs for detailed error messages and ensure all prerequisites are installed.
