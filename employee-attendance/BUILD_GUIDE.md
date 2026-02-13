# GeoTagging App - Build Configuration

## 📱 App Information

**App Name**: GeoTagging
**Package Name**: com.lordshin123.geotagging
**Version**: 1.0.0
**Platform**: Android

---

## ✅ Configuration Changes Made

### 1. App Display Name
- **Before**: "employee-attendance"
- **After**: "GeoTagging"
- Users will see "GeoTagging" on their phone home screen

### 2. Package Name
- **Before**: com.lordshin123.employeeattendance
- **After**: com.lordshin123.geotagging
- This is the unique identifier for your app

### 3. Build Configuration
- **Build Type**: APK (Android Package)
- **Distribution**: Internal
- **Profile**: preview

---

## 🔨 Building the APK

### Command to Build
```bash
cd c:\Users\HP\kiosk-mapping\employee-attendance
npx eas build --platform android --profile preview
```

### What Happens During Build
1. EAS will build your app in the cloud
2. The build will include all your latest changes:
   - Production API URL: `https://backend-rho-ashen-76.vercel.app/api`
   - App name: "GeoTagging"
   - Updated features (GPS coordinates, employee name display, etc.)

### Download the APK
After the build completes:
1. You'll get a download link from EAS
2. The file will be named: `geotagging-[build-id].apk`
3. You can rename it to `GeoTagging.apk` after downloading

---

## 📥 Renaming the Downloaded APK

### Option 1: Manual Rename (Windows)
1. Download the APK from EAS
2. Right-click the file → Rename
3. Change to: `GeoTagging.apk`

### Option 2: Command Line
```bash
# After downloading to Downloads folder
cd C:\Users\HP\Downloads
ren geotagging-*.apk GeoTagging.apk
```

---

## 📋 Updated Files

### app.json
```json
{
  "expo": {
    "name": "GeoTagging",
    "slug": "geotagging",
    "android": {
      "package": "com.lordshin123.geotagging"
    }
  }
}
```

### eas.json
```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    }
  }
}
```

### src/config.ts
```typescript
export const API_URL = 'https://backend-rho-ashen-76.vercel.app/api';
```

---

## 🎯 App Features Included

✅ **QR Code Scanning** - Scan employee QR codes for attendance
✅ **GPS Tracking** - Live GPS coordinate display and verification
✅ **Time In/Out** - Record employee attendance with timestamps
✅ **Geofence Validation** - Verify employees are within allowed radius
✅ **Employee Details** - Display employee name on successful scan
✅ **Error Feedback** - Detailed distance information on failures
✅ **Production Backend** - Connected to live Vercel deployment

---

## 📱 Installation Instructions

### For Testing
1. Download `GeoTagging.apk` from EAS
2. Transfer to Android device
3. Enable "Install from Unknown Sources" in device settings
4. Tap the APK file to install
5. Open "GeoTagging" app
6. Grant Camera and Location permissions

### Permissions Required
- **Camera**: To scan QR codes
- **Location**: To track attendance location

---

## 🔄 Update Process

To build a new version with updates:

1. Make your code changes
2. Update version in `app.json`:
   ```json
   "version": "1.0.1"
   ```
3. Run build command:
   ```bash
   npx eas build --platform android --profile preview
   ```
4. Download and rename the new APK

---

## 📞 Build Information

**EAS Project ID**: fca620b4-eb54-415b-96e5-e05920ec6048
**Owner**: lordshin123
**Build Profile**: preview
**Output**: APK file for direct installation

---

**Last Updated**: 2026-02-03 14:11 PHT
**Status**: ✅ Ready to Build
