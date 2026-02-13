# ⏰ Time Restrictions - Quick Reference

## 📋 Allowed Time Windows

### **TIME IN**
```
🕕 6:00 AM ────────────────────► 🕘 9:00 AM
   (Earliest)                      (Latest)
   
   Duration: 3 hours
```

### **TIME OUT**
```
🕣 8:30 PM ────────► 🕘 9:15 PM
   (Earliest)         (Latest)
   
   Duration: 45 minutes
```

---

## ✅ Valid Examples

| Action | Time | Status |
|--------|------|--------|
| Time IN | 6:00 AM | ✅ Valid |
| Time IN | 7:30 AM | ✅ Valid |
| Time IN | 9:00 AM | ✅ Valid |
| Time OUT | 8:30 PM | ✅ Valid |
| Time OUT | 9:00 PM | ✅ Valid |
| Time OUT | 9:15 PM | ✅ Valid |

---

## ❌ Invalid Examples

| Action | Time | Status | Reason |
|--------|------|--------|--------|
| Time IN | 5:59 AM | ❌ Too Early | Before 6:00 AM |
| Time IN | 9:01 AM | ❌ Too Late | After 9:00 AM |
| Time OUT | 8:29 PM | ❌ Too Early | Before 8:30 PM |
| Time OUT | 9:16 PM | ❌ Too Late | After 9:15 PM |

---

## 🔧 Configuration

### Enable Validation (Production)
```bash
# In Vercel Dashboard → Environment Variables
SKIP_TIME_VALIDATION=false
# or remove the variable
```

### Disable Validation (Testing)
```bash
# In Vercel Dashboard → Environment Variables
SKIP_TIME_VALIDATION=true
```

---

## 📱 Error Messages

**Time In Error:**
```
Time In is only allowed between 6:00 AM and 9:00 AM
```

**Time Out Error:**
```
Time Out is only allowed between 8:30 PM and 9:15 PM
```

---

## 🎯 Current Status

- ✅ **Deployed**: https://backend-rho-ashen-76.vercel.app
- ⚙️ **Validation**: Configurable via environment variable
- 📊 **Monitoring**: Check Vercel logs for violations

---

**Last Updated**: 2026-02-03 16:25 PHT
