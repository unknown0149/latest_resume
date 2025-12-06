# 🚀 INTEGRATION GUIDE

## Quick Start - 3 Steps to Deploy

### Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install joi@^17.13.3

# Frontend  
cd frontend
npm install json2csv@^6.0.0
```

### Step 2: Update Server Configuration

**File**: `backend/src/server.js`

Add these imports at the top:
```javascript
import { errorHandler, notFoundHandler } from './utils/errorHandler.js';
import { initializeNotificationListeners } from './utils/notificationEmitter.js';
import Notification from './models/Notification.js';
import User from './models/User.js';
```

After database connection, initialize notification system:
```javascript
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Initialize notification event listeners
    initializeNotificationListeners(Notification, User);
    console.log('Notification listeners initialized');
  })
  .catch(err => console.error('MongoDB connection error:', err));
```

Before `app.listen()`, add error handlers (must be LAST):
```javascript
// All your routes here...
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
// ... etc

// Add these at the very end, AFTER all routes
app.use(notFoundHandler);  // Catch 404s
app.use(errorHandler);     // Global error handler
```

### Step 3: Update Frontend API Client

**File**: `frontend/src/services/api.js`

Add import at top:
```javascript
import { setupTokenRefreshInterceptor } from '../utils/apiHelpers';
```

After creating the axios instance, add:
```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

// Setup token refresh interceptor
setupTokenRefreshInterceptor(api);
```

---

## Optional Enhancements

### A. Add Retry Logic to API Calls

Wrap critical API calls with retry:

```javascript
import { withRetry, formatApiError } from '../utils/apiHelpers';

// Example in applicationsAPI
getAllApplications: async () => {
  try {
    const response = await withRetry(() => api.get('/applications'));
    return response.data;
  } catch (error) {
    const { message, details } = formatApiError(error);
    throw new Error(`${message}${details ? ': ' + details : ''}`);
  }
},
```

### B. Add Export Button to Recruiter Pages

**Example**: Add to Applications page

```jsx
import { exportApplicationsToCSV, downloadCSV } from '../utils/exportUtils';

function ApplicationsPage() {
  const handleExport = () => {
    const csv = exportApplicationsToCSV(applications);
    const filename = `applications_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csv, filename);
  };
  
  return (
    <div>
      <Button onClick={handleExport} variant="outline">
        📊 Export to CSV
      </Button>
      {/* rest of component */}
    </div>
  );
}
```

### C. Create Refresh Token Endpoint

**File**: `backend/src/routes/auth.routes.js`

```javascript
/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }
    
    // Generate new access token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.json({
      success: true,
      token,
      expiresIn: 3600, // 1 hour in seconds
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
    });
  }
});
```

Don't forget to generate refresh tokens during login/signup:
```javascript
// In login/signup endpoint
const accessToken = jwt.sign({ id: user._id, email: user.email }, 
  process.env.JWT_SECRET, { expiresIn: '1h' });
  
const refreshToken = jwt.sign({ id: user._id }, 
  process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

res.json({
  success: true,
  token: accessToken,
  refreshToken,
  expiresIn: 3600,
});
```

**Frontend**: Store refresh token
```javascript
// In login handler
localStorage.setItem('auth_token', data.token);
localStorage.setItem('refresh_token', data.refreshToken);
localStorage.setItem('token_expiry', new Date(Date.now() + data.expiresIn * 1000).toISOString());
```

---

## Testing Checklist

### Backend Validation
- [ ] POST request with invalid data returns 400 with field-level errors
- [ ] Bulk operations validate array size (max 100)
- [ ] Job salary min/max validation works
- [ ] Interview scheduledAt must be future date

**Test Command**:
```bash
# Invalid status
curl -X PUT http://localhost:8000/api/recruiter/org-slug/applications/app-id/status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "invalid_status"}'

# Expected: 400 with validation errors
```

### Notification Events
- [ ] Status change creates notification in database
- [ ] Interview scheduled emits event
- [ ] Bulk operations create multiple notifications

**Test Command**:
```javascript
// In MongoDB shell or Compass
db.notifications.find().sort({ createdAt: -1 }).limit(5);
```

### Error Handling
- [ ] 404 returns consistent format: `{success: false, message, code: 'NOT_FOUND'}`
- [ ] Mongoose CastError (invalid ID) returns 400
- [ ] JWT expiry returns 401 with clear message

### Token Refresh
- [ ] Token auto-refreshes when < 5 min until expiry
- [ ] 401 triggers refresh and retries original request
- [ ] Multiple simultaneous requests queue properly

### Candidate Search Security
- [ ] Non-admin sees masked email/phone
- [ ] Owner/admin sees full PII
- [ ] Skill filter works: `?skills=javascript,react`
- [ ] Experience filter works: `?minExperience=3&maxExperience=7`

**Test Command**:
```bash
# As recruiter (should mask PII)
curl http://localhost:8000/api/recruiter/org-slug/candidates/search?skills=javascript \
  -H "Authorization: Bearer RECRUITER_TOKEN"

# Check response - email/phone should be excluded
```

### CSV Export
- [ ] Export downloads file with correct MIME type
- [ ] CSV contains all expected columns
- [ ] Date formatting is consistent
- [ ] Special characters are escaped

---

## Environment Variables

Add to `.env`:
```env
# Existing variables...

# JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your_access_token_secret_here
JWT_REFRESH_SECRET=your_refresh_token_secret_here

# Optional: Email/SMS for notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMS_API_KEY=your_sms_provider_api_key
```

---

## Performance Recommendations

### 1. Add Database Indexes
```javascript
// In backend/src/models/JobApplication.js
ApplicationSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
ApplicationSchema.index({ jobId: 1, status: 1 });
ApplicationSchema.index({ userId: 1, createdAt: -1 });
ApplicationSchema.index({ 'interviews.scheduledAt': 1, 'interviews.status': 1 });
```

Run index creation:
```bash
node -e "require('./src/models/JobApplication.js').syncIndexes()"
```

### 2. Use .lean() for List Endpoints
```javascript
// Before
const apps = await JobApplication.find(query).populate('userId jobId');

// After (3x faster for large datasets)
const apps = await JobApplication.find(query)
  .select('userId jobId status matchScore createdAt')
  .lean()
  .populate('userId', 'name email avatar')
  .populate('jobId', 'title company location');
```

### 3. Paginate Timeline/Interviews
```javascript
// Add to JobApplication model
ApplicationSchema.statics.getWithPaginatedTimeline = function(id, skip = 0, limit = 20) {
  return this.findById(id)
    .slice('timeline', [skip, limit])
    .populate('userId jobId');
};
```

---

## Troubleshooting

### "Cannot find module 'joi'"
```bash
cd backend
npm install joi
```

### Validation not working
Check import in recruiter.routes.js:
```javascript
import { validateApplicationStatus } from '../utils/validation.js';
```

### Notifications not appearing
1. Check `initializeNotificationListeners` is called after DB connection
2. Verify Notification model exists
3. Check MongoDB for notifications: `db.notifications.find()`

### Token refresh loop
Ensure JWT_REFRESH_SECRET is different from JWT_SECRET

### CSV export empty
Check if data is being passed correctly and json2csv is installed

---

## Next Steps

1. ✅ Complete Step 1-3 above
2. ⏳ Test all endpoints with validation
3. ⏳ Verify notifications are created
4. ⏳ Test token refresh flow
5. ⏳ Add export buttons to UI
6. ⏳ Create AuditLog model for search tracking
7. ⏳ Set up email/SMS service integration

---

**Estimated Integration Time**: 30-45 minutes  
**Priority**: HIGH - These are production-ready improvements

For questions or issues, refer to:
- `IMPLEMENTATION_SUMMARY.md` - Full technical details
- `PROJECT_STATUS.md` - System overview and architecture
