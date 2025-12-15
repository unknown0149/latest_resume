# Applicant-Recruiter Pipeline Fixes

## Issues Fixed

### 1. ✅ DollarSign Icon Import Error
**Problem:** `ReferenceError: DollarSign is not defined` in JobsListingPage
**Solution:** Added missing `DollarSign` import from `lucide-react`
**File:** `frontend/src/pages/JobsListingPage.jsx`

### 2. ✅ Duplicate Key Warning
**Problem:** React warning about duplicate keys `recruiter-693ba16b1b798e749e4fa85e`
**Solution:** Enhanced key generation to use more unique identifiers with timestamp fallback
**File:** `frontend/src/pages/DashboardPage.jsx`
```javascript
const uniqueKey = job.job?._id || job.job?.jobId || job.jobId || `recruiter-fallback-${index}-${Date.now()}`
```

### 3. ✅ Missing Apply Button on Recruiter Posts
**Problem:** Recruiter-posted jobs showed external link instead of Apply button
**Solution:** 
- Added `isRecruiterPosted` flag to identify jobs with `source.platform === 'manual'` or `'direct'`
- Changed logic to show Apply button for all recruiter-posted jobs
- External link only shown for truly external jobs (not recruiter-owned)
**File:** `frontend/src/pages/JobsListingPage.jsx`

### 4. ✅ Jobs.csv Mixed with Recruiter Posts
**Problem:** CSV live jobs appearing in "Recruiter posted roles" section
**Solution:** 
- Changed CSV import platform from `'manual'` to `'seed'`
- Updated file job service to map file sources to `'seed'` platform
- Added `sourcePlatform` query parameter to `/jobs/all` endpoint
- Frontend now filters recruiter jobs to exclude `'seed'` platform
**Files:**
- `backend/src/services/csvJobImportService.js`
- `backend/src/services/fileJobService.js`
- `backend/src/routes/job.routes.js`
- `frontend/src/pages/DashboardPage.jsx`

## Job Source Platform Architecture

### Platform Types:
- **`seed`** - CSV imported jobs (jobs.csv) → Shows in "Live Job Roles" marketplace
- **`manual`** - Recruiter-posted jobs → Shows in "Recruiter posted roles"
- **`direct`** - Direct employer posts → Shows in "Recruiter posted roles"
- **`linkedin`/`indeed`/`glassdoor`** - Web-scraped jobs → Shows in marketplace
- **`api`** - Job portal aggregated jobs → Shows in marketplace

### Filtering Logic:
```javascript
// Frontend - Get only recruiter-posted jobs
sourcePlatform: 'manual,direct'

// Backend - Filter by platform
query['source.platform'] = { $in: ['manual', 'direct'] }
```

## API Changes

### `/api/jobs/all` Endpoint Enhancement
Added `sourcePlatform` query parameter to filter jobs by source:
```javascript
GET /api/jobs/all?sourcePlatform=manual,direct&limit=20&status=active
```

## Testing Checklist

### Applicant Side:
- [ ] No console errors on Dashboard
- [ ] CSV jobs appear in "Live Job Roles" with Apply button
- [ ] Recruiter-posted jobs appear in "Recruiter posted roles" with Apply button
- [ ] No duplicate key warnings in console
- [ ] Apply button works for all job types
- [ ] Already applied jobs show "Applied" badge

### Recruiter Side:
- [ ] Can create new job posts
- [ ] Posted jobs only appear in recruiter section (not mixed with CSV jobs)
- [ ] Can view applications to their posts
- [ ] Dashboard loads without errors
- [ ] Job management (edit/delete) works

## File Changes Summary

### Frontend:
1. `frontend/src/pages/JobsListingPage.jsx` - Added DollarSign import, fixed Apply button logic
2. `frontend/src/pages/DashboardPage.jsx` - Fixed duplicate keys, separated job sources

### Backend:
1. `backend/src/services/csvJobImportService.js` - Changed platform to 'seed'
2. `backend/src/services/fileJobService.js` - Map file sources to 'seed'
3. `backend/src/routes/job.routes.js` - Added sourcePlatform filter

## Next Steps

1. **Restart servers** to apply changes
2. **Reimport jobs.csv** using `/api/admin/reload-file-jobs` endpoint to update platform tags
3. **Test end-to-end flow**:
   - Upload resume as applicant
   - View jobs in marketplace (should see CSV jobs)
   - View recruiter section (should see only manual/direct posts)
   - Apply to jobs (both types should work)
4. **Test recruiter flow**:
   - Create new job post
   - Verify it appears in recruiter section only
   - Check applications pipeline

## Migration Note

Existing jobs in database with `source.platform === 'manual'` that were imported from CSV will need to be updated:
```javascript
// Run in MongoDB or via API
db.jobs.updateMany(
  { 'source.platform': 'manual', jobId: /^(file_|csv_)/ },
  { $set: { 'source.platform': 'seed' } }
)
```
