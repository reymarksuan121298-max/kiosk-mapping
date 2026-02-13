# Time Window Restrictions

## ⏰ Overview

The attendance system enforces strict time windows for clocking in and out to ensure employees record their attendance during designated hours.

---

## 🕐 Time Restrictions

### **Time In Window**
- **Allowed**: 6:00 AM - 9:00 AM
- **Duration**: 3 hours
- **Purpose**: Morning shift start time

### **Time Out Window**
- **Allowed**: 8:30 PM - 9:15 PM
- **Duration**: 45 minutes
- **Purpose**: Evening shift end time

---

## 📋 Business Rules

### **Time In (6:00 AM - 9:00 AM)**

✅ **Allowed Times**:
- 6:00 AM ← Earliest
- 7:00 AM
- 8:00 AM
- 9:00 AM ← Latest

❌ **Rejected Times**:
- 5:59 AM ← Too early
- 9:01 AM ← Too late
- Any time after 9:00 AM

**Error Message**: 
```
"Time In is only allowed between 6:00 AM and 9:00 AM"
```

### **Time Out (8:30 PM - 9:15 PM)**

✅ **Allowed Times**:
- 8:30 PM (20:30) ← Earliest
- 8:45 PM (20:45)
- 9:00 PM (21:00)
- 9:15 PM (21:15) ← Latest

❌ **Rejected Times**:
- 8:29 PM ← Too early
- 9:16 PM ← Too late
- Any time before 8:30 PM or after 9:15 PM

**Error Message**:
```
"Time Out is only allowed between 8:30 PM and 9:15 PM"
```

---

## 🔧 Technical Implementation

### **Backend Validation** (`routes/attendance.js`)

```javascript
// Time Window Validation
const SKIP_TIME_VALIDATION = process.env.SKIP_TIME_VALIDATION === 'true';

if (!SKIP_TIME_VALIDATION) {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTimeInMinutes = hour * 60 + minute;

    if (type === 'Time In') {
        const startLimit = 6 * 60;      // 06:00 AM = 360 minutes
        const endLimit = 9 * 60;        // 09:00 AM = 540 minutes
        
        if (currentTimeInMinutes < startLimit || currentTimeInMinutes > endLimit) {
            return res.status(403).json({
                error: "Time In is only allowed between 6:00 AM and 9:00 AM"
            });
        }
    } else if (type === 'Time Out') {
        const startLimit = 20 * 60 + 30; // 08:30 PM = 1230 minutes
        const endLimit = 21 * 60 + 15;   // 09:15 PM = 1275 minutes
        
        if (currentTimeInMinutes < startLimit || currentTimeInMinutes > endLimit) {
            return res.status(403).json({
                error: "Time Out is only allowed between 8:30 PM and 9:15 PM"
            });
        }
    }
}
```

---

## 🎯 Use Cases

### **Scenario 1: On-Time Clock In**
- **Time**: 7:30 AM
- **Action**: Employee scans QR code
- **Result**: ✅ **Time IN Successful**
- **Reason**: Within 6:00-9:00 AM window

### **Scenario 2: Late Clock In**
- **Time**: 9:30 AM
- **Action**: Employee scans QR code
- **Result**: ❌ **Error: "Time In is only allowed between 6:00 AM and 9:00 AM"**
- **Reason**: After 9:00 AM cutoff

### **Scenario 3: Early Clock Out**
- **Time**: 8:00 PM
- **Action**: Employee scans QR code
- **Result**: ❌ **Error: "Time Out is only allowed between 8:30 PM and 9:15 PM"**
- **Reason**: Before 8:30 PM start

### **Scenario 4: On-Time Clock Out**
- **Time**: 9:00 PM
- **Action**: Employee scans QR code
- **Result**: ✅ **Time OUT Successful**
- **Reason**: Within 8:30-9:15 PM window

### **Scenario 5: Late Clock Out**
- **Time**: 9:30 PM
- **Action**: Employee scans QR code
- **Result**: ❌ **Error: "Time Out is only allowed between 8:30 PM and 9:15 PM"**
- **Reason**: After 9:15 PM cutoff

---

## 🔐 Environment Configuration

### **Production Mode** (Time Validation ENABLED)

Set in Vercel environment variables:
```
SKIP_TIME_VALIDATION=false
```
or remove the variable entirely (defaults to enabled)

### **Testing Mode** (Time Validation DISABLED)

Set in Vercel environment variables:
```
SKIP_TIME_VALIDATION=true
```

**⚠️ Warning**: Only use testing mode during development. Always enable validation in production!

---

## 📊 Time Calculation

### **How It Works**

1. Get current time: `new Date()`
2. Extract hours and minutes
3. Convert to total minutes since midnight:
   ```javascript
   currentTimeInMinutes = hour * 60 + minute
   ```

### **Examples**

| Time | Hours | Minutes | Total Minutes | Calculation |
|------|-------|---------|---------------|-------------|
| 6:00 AM | 6 | 0 | 360 | 6×60 + 0 = 360 |
| 9:00 AM | 9 | 0 | 540 | 9×60 + 0 = 540 |
| 8:30 PM | 20 | 30 | 1230 | 20×60 + 30 = 1230 |
| 9:15 PM | 21 | 15 | 1275 | 21×60 + 15 = 1275 |

### **Validation Logic**

**Time In**:
```
360 ≤ currentTimeInMinutes ≤ 540
(6:00 AM)              (9:00 AM)
```

**Time Out**:
```
1230 ≤ currentTimeInMinutes ≤ 1275
(8:30 PM)               (9:15 PM)
```

---

## 🌍 Timezone Considerations

- **Server Time**: Uses server's local time (Vercel uses UTC)
- **Important**: Ensure server timezone matches your business location
- **Recommendation**: Use environment variables for timezone configuration if needed

---

## 📱 Mobile App Behavior

When time validation fails:

1. **Backend Returns**: HTTP 403 Forbidden
2. **Error Message**: Specific time window restriction
3. **App Displays**: Error card with message
4. **Auto-Reset**: Scanner resets after 5 seconds
5. **User Action**: Employee must wait for valid time window

---

## 🔄 Workflow Integration

### **With Auto Time In/Out**

1. Employee scans QR code
2. System checks last attendance (determines IN or OUT)
3. **Time validation occurs here** ⏰
4. If valid → Record attendance
5. If invalid → Show error with time restriction

### **Error Flow**

```
Scan QR → Auto-Detect Action → Check Time Window
                                      ↓
                              ┌───────┴────────┐
                              │                │
                          ✅ Valid         ❌ Invalid
                              │                │
                      Record Attendance    Show Error
                              │                │
                         Show Success     Auto-Reset
```

---

## 📋 Testing Checklist

### **Time In Tests**

- [ ] 5:59 AM → Should fail
- [ ] 6:00 AM → Should succeed
- [ ] 7:30 AM → Should succeed
- [ ] 9:00 AM → Should succeed
- [ ] 9:01 AM → Should fail

### **Time Out Tests**

- [ ] 8:29 PM → Should fail
- [ ] 8:30 PM → Should succeed
- [ ] 9:00 PM → Should succeed
- [ ] 9:15 PM → Should succeed
- [ ] 9:16 PM → Should fail

---

## 🛠️ Enabling/Disabling Validation

### **To Enable in Production**

1. Go to Vercel Dashboard
2. Select `backend` project
3. Go to Settings → Environment Variables
4. Remove `SKIP_TIME_VALIDATION` or set to `false`
5. Redeploy backend

### **To Disable for Testing**

1. Go to Vercel Dashboard
2. Select `backend` project
3. Go to Settings → Environment Variables
4. Set `SKIP_TIME_VALIDATION=true`
5. Redeploy backend

---

## 📊 Monitoring & Logs

When time validation fails, the backend logs:

```
⏰ Time validation failed: Current time 9:30 is outside 6:00-9:00 AM window
```

or

```
⏰ Time validation failed: Current time 22:00 is outside 8:30-9:15 PM window
```

Check Vercel logs to monitor validation failures.

---

## 🎯 Benefits

### **For Business**
- ✅ Enforces work schedule compliance
- ✅ Prevents early/late clock-ins
- ✅ Ensures accurate attendance records
- ✅ Reduces time theft

### **For Employees**
- ✅ Clear expectations for clock-in times
- ✅ Immediate feedback if outside window
- ✅ Prevents accidental early/late scans

### **For System**
- ✅ Automated validation
- ✅ Consistent enforcement
- ✅ Audit trail in logs
- ✅ Configurable for testing

---

## 📞 Support

If employees are blocked from clocking in/out:

1. **Check Current Time**: Verify it's within allowed window
2. **Check Server Time**: Ensure server timezone is correct
3. **Check Validation Status**: Verify `SKIP_TIME_VALIDATION` setting
4. **Review Logs**: Check Vercel logs for validation errors

---

**Last Updated**: 2026-02-03 16:25 PHT
**Feature Version**: v2.2.0
**Status**: ✅ Deployed to Production
**Time Validation**: ⚙️ Configurable (Currently set via environment variable)
