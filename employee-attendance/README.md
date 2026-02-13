# Employee Attendance App

A mobile attendance tracking system built with Expo Go that uses QR code scanning for employee time in/out tracking.

## Features

- 📱 **No Login Required** - Direct access to scanner
- 📷 **QR Code Scanning** - Scan employee ID QR codes
- ⏰ **Time IN/OUT** - Easy clock in and clock out
- 📍 **GPS Tracking** - Automatic location capture
- ⏱️ **Real-time Clock** - Live date and time display
- ✅ **Instant Feedback** - Success/error notifications

## Prerequisites

- Node.js installed
- Expo Go app on your mobile device ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) | [iOS](https://apps.apple.com/app/expo-go/id982107779))
- Backend API server running (see Backend Requirements below)

## Installation

1. Navigate to the project directory:
```bash
cd employee-attendance
```

2. Install dependencies (already done):
```bash
npm install
```

3. Configure your backend API URL:
   - Open `src/config.ts`
   - Update `API_URL` to point to your backend server
   - For physical device: Use your computer's local IP (e.g., `http://192.168.1.8:5000/api`)
   - For Android Emulator: Use `http://10.0.2.2:5000/api`
   - For iOS Simulator: Use `http://localhost:5000/api`

## Running the App

1. Start the Expo development server:
```bash
npm start
```

2. Scan the QR code with Expo Go app on your mobile device

3. Grant camera and location permissions when prompted

## Usage

1. **Open App** - Scanner appears immediately (no login required)
2. **Scan QR Code** - Point camera at employee QR code
3. **Select Action** - Choose Time IN or Time OUT
4. **Confirmation** - View success message with timestamp
5. **Auto Reset** - Scanner resets automatically for next employee

## Backend Requirements

Your backend API should have the following endpoint:

### POST `/api/attendance/clock`

**Request Body:**
```json
{
  "employeeId": "string",
  "action": "IN" | "OUT",
  "latitude": number,
  "longitude": number,
  "timestamp": "ISO 8601 string"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Attendance recorded",
  "data": {
    "employeeId": "string",
    "action": "IN" | "OUT",
    "timestamp": "ISO 8601 string"
  }
}
```

**Error Response (400/500):**
```json
{
  "error": "Error message"
}
```

## QR Code Format

The app can scan QR codes in the following formats:
- Plain employee ID: `EMP001`
- Formatted: `ID: EMP001`

## Troubleshooting

### Camera not working
- Ensure camera permissions are granted
- Check if another app is using the camera
- Restart the Expo Go app

### GPS not active
- Enable location services on your device
- Grant location permissions to Expo Go
- Tap "Refresh GPS" button

### Cannot connect to backend
- Verify backend server is running
- Check `API_URL` in `src/config.ts`
- Ensure your device can reach the server (same network)
- For physical device, use your computer's local IP address

### App crashes on scan
- Check backend API is responding correctly
- View console logs for error details
- Ensure QR code contains valid employee ID

## Project Structure

```
employee-attendance/
├── App.tsx                          # Main app entry point
├── src/
│   ├── config.ts                    # API configuration
│   ├── screens/
│   │   └── AttendanceScreen.tsx     # Main scanner screen
│   └── services/
│       └── api.ts                   # API service layer
├── app.json                         # Expo configuration
└── package.json                     # Dependencies
```

## Technologies Used

- **Expo** - React Native framework
- **expo-camera** - QR code scanning
- **expo-location** - GPS tracking
- **axios** - HTTP client
- **lucide-react-native** - Icons
- **TypeScript** - Type safety

## Development

To modify the app:

1. **Change API URL**: Edit `src/config.ts`
2. **Modify UI**: Edit `src/screens/AttendanceScreen.tsx`
3. **Update API calls**: Edit `src/services/api.ts`

## Support

For issues or questions:
1. Check the troubleshooting section
2. Verify backend API is working
3. Check Expo Go console for errors
4. Ensure all permissions are granted
