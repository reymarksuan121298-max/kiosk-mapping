# Employee Attendance App

A simple React Native app for employees to clock in by scanning their QR codes. No authentication required - just scan and go!

## Features

- ✅ **No Login Required** - Direct QR code scanning
- 📸 **QR Code Scanner** - Scan employee QR codes
- 📍 **GPS Location** - Automatic location tracking
- 👤 **Employee Info Display** - Shows employee details after scan
- ✨ **Beautiful UI** - Modern, clean interface
- 🎯 **Simple & Fast** - Quick clock-in process

## Prerequisites

- Node.js (v16 or higher)
- Expo CLI
- Android/iOS device or emulator

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API URL:**
   - Open `config.ts`
   - Update `API_URL` with your backend server address:
     - For Android Emulator: `http://10.0.2.2:5000/api`
     - For iOS Simulator: `http://localhost:5000/api`
     - For Physical Device: `http://YOUR_COMPUTER_IP:5000/api`

## Running the App

1. **Start the Expo development server:**
   ```bash
   npx expo start
   ```

2. **Run on device:**
   - **Android:** Press `a` or scan QR code with Expo Go app
   - **iOS:** Press `i` or scan QR code with Camera app

## How It Works

1. **Open the app** - Camera permission will be requested
2. **Allow GPS** - Location permission will be requested
3. **Scan QR code** - Point camera at employee QR code
4. **Clock in** - Attendance is recorded automatically
5. **View confirmation** - Employee info and success message displayed

## App Flow

```
Launch App
    ↓
Request Permissions (Camera + GPS)
    ↓
Show Scanner Screen
    ↓
Scan Employee QR Code
    ↓
Send to Backend API
    ↓
Display Success/Error
    ↓
Auto-reset after 4 seconds
```

## API Endpoint

The app uses the public attendance endpoint:

**POST** `/api/attendance/clock-in`

**Request Body:**
```json
{
  "employeeId": "GFG-LDN-00001",
  "latitude": 14.599500,
  "longitude": 120.984200
}
```

**Response:**
```json
{
  "message": "Clock-in successful",
  "employee": {
    "id": "uuid",
    "employeeId": "GFG-LDN-00001",
    "fullName": "John Doe",
    "role": "Agent",
    "franchise": "Glowing Fortune Gaming OPC",
    "area": "LDN",
    "spvr": "SPVR-001",
    "photoUrl": "https://..."
  },
  "attendance": { ... },
  "alert": null,
  "distance": 50
}
```

## Permissions

The app requires:
- **Camera** - To scan QR codes
- **Location** - To record GPS coordinates

## Customization

### Change Colors
Edit the `styles` object in `App.tsx`:
- Primary color: `#10b981` (green)
- Error color: `#ef4444` (red)
- Background: `rgba(0, 0, 0, 0.7)` (dark overlay)

### Adjust Auto-Reset Time
In `App.tsx`, find:
```typescript
setTimeout(() => resetScanner(), 4000); // 4 seconds
```

### Modify Scanner Frame Size
In `App.tsx`, find:
```typescript
scannerBox: {
  width: 250,
  height: 250,
}
```

## Troubleshooting

### Camera Not Working
- Ensure camera permissions are granted
- Restart the app
- Check device camera functionality

### GPS Not Active
- Enable location services on device
- Grant location permissions
- Wait a few seconds for GPS fix

### Network Error
- Check API_URL in `config.ts`
- Ensure backend server is running
- Verify device is on same network as server
- Check firewall settings

### QR Code Not Scanning
- Ensure good lighting
- Hold device steady
- Position QR code within frame
- Make sure QR code is clear and not damaged

## Backend Requirements

The backend must have:
- `/api/attendance/clock-in` endpoint
- No authentication required
- CORS enabled for mobile app
- Employee records in database

## Security Notes

⚠️ **Important:** This app has no authentication for quick employee access. Consider:
- Using this app only on trusted devices
- Implementing device registration if needed
- Adding PIN/password for sensitive environments
- Monitoring attendance logs for suspicious activity

## Building for Production

### Android APK
```bash
npx expo build:android
```

### iOS IPA
```bash
npx expo build:ios
```

## Tech Stack

- **React Native** - Mobile framework
- **Expo** - Development platform
- **expo-camera** - QR code scanning
- **expo-location** - GPS tracking
- **axios** - HTTP requests
- **TypeScript** - Type safety

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review backend logs
3. Verify API endpoint is accessible
4. Check device permissions

## License

MIT License - Free to use and modify

---

**Made with ❤️ for easy employee attendance tracking**
