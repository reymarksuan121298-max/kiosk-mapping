# Kiosk Monitoring App

This is the mobile application for Kiosk Supervisors to monitor employee attendance at kiosks.

## Features
- **Admin Login**: Secure login for supervisors.
- **QR Code Scanner**: Scan employee ID QR codes.
- **GPS Verification**: verify that the scan is happening at the correct location.
- **Real-time Feedback**: Instant success/error messages.

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Backend**:
   - Open `src/config.ts`.
   - Ensure `API_URL` points to your backend server IP address.
     - Example: `http://192.168.1.X:5000/api`
   - **Crucial**: Your phone must be on the same Wi-Fi network as your computer.

3. **Run the App**:
   ```bash
   npx expo start
   ```

4. **Test on Device**:
   - Install **Expo Go** app from App Store / Play Store.
   - Scan the QR code shown in the terminal.

## Troubleshooting
- **Network Error**: Ensure Firewall allows connections to port 5000 on your PC.
- **Camera/Location Permissions**: If denied, go to App Settings on your phone and enable them for Expo Go.
