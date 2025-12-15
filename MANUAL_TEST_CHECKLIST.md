# Manual Test Checklist - Recruiter & Applicant Flow

## ✅ Pre-Test Setup
- [ ] Backend running on http://localhost:8000
- [ ] Frontend running on http://localhost:3001
- [ ] Database connected (check backend logs)
- [ ] Migration completed (CSV jobs = seed, recruiter jobs = manual)

---

## Test 1: Database Verification

### Check Job Platforms in MongoDB
```javascript
// Run in MongoDB shell or Compass
db.jobs.aggregate([
  { $group: { _id: "$source.platform", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

**Expected Result:**
- `seed`: 36-110 jobs (CSV)
- `manual`: 0-5 jobs (recruiter posts)
- `real`: 60-70 jobs (scraped)
- `linkedin`: 1-2 jobs

---

## Test 2: Recruiter Posts Job

### Steps:
1. **Register/Login as Recruiter**
   - Open http://localhost:3001/register
   - Email: `recruiter1@test.com`
   - Password: `Test@123`
   - Name: `Test Recruiter`
   - Role: Select "Recruiter"
   - Click Register

2. **Create Organization (if needed)**
   - May be prompted to create organization
   - Org Name: `Test Company Inc`
   - Fill required details

3. **Post a Job**
   - Navigate to Jobs section
   - Click "Create New Job" or "Post Job"
   - Fill in:
     ```
     Title: QA Automation Engineer
     Company: Test Company Inc
     Location: Bangalore, India
     Description: Looking for experienced QA automation engineer...
     Employment Type: Full-time
     Experience: Mid-level
     Skills: Selenium, Python, JavaScript, API Testing
     Salary: ₹800,000 - ₹1,500,000
     ```
   - Click "Post Job"

4. **Verify in Recruiter Dashboard**
   - Check "My Jobs" section
   - **Expected**: Job appears with status "Active"
   - Note the Job ID

---

## Test 3: Job Visibility Check

### API Test (Postman/Browser Console)
```javascript
// Check all jobs
fetch('http://localhost:8000/api/jobs/all?limit=100')
  .then(r => r.json())
  .then(data => {
    console.log('Total jobs:', data.jobs.length);
    const platforms = data.jobs.reduce((acc, j) => {
      acc[j.source.platform] = (acc[j.source.platform] || 0) + 1;
      return acc;
    }, {});
    console.log('Platforms:', platforms);
    
    // Find your test job
    const testJob = data.jobs.find(j => j.title.includes('QA Automation'));
    console.log('Test job:', testJob);
    console.log('Platform:', testJob?.source.platform); // Should be 'manual'
  });
```

**Expected Output:**
```javascript
{
  seed: 36-110,    // CSV jobs
  manual: 1-5,     // Including your test job
  real: 60-70,
  linkedin: 1-2
}
```

---

## Test 4: Applicant Views Jobs

### Steps:
1. **Logout from Recruiter** (or use incognito window)

2. **Register/Login as Applicant**
   - Email: `applicant1@test.com`
   - Password: `Test@123`
   - Name: `Test Applicant`
   - Role: Select "Job Seeker" or "Applicant"

3. **Upload Resume**
   - Navigate to `/upload`
   - Upload a sample resume (PDF/DOCX)
   - Wait for parsing to complete
   - **Expected**: Skills extracted, analysis shown

4. **Check Dashboard** (`/dashboard`)
   - **Live Job Roles Section**:
     - ✅ Should show CSV/seed jobs
     - ✅ Should NOT show your "QA Automation" job
     - ✅ Jobs have "Apply" buttons
   
   - **Recruiter Posted Roles Section**:
     - ✅ Should show "QA Automation" job
     - ✅ Should show "Apply" button (NOT external link)
     - ✅ Job details visible

5. **Check Jobs Page** (`/jobs`)
   - ✅ All jobs visible including recruiter posts
   - ✅ Filters work correctly
   - ✅ Apply button on all jobs

---

## Test 5: Apply for Recruiter Job

### Steps:
1. **From Dashboard** - In "Recruiter posted roles" section
   - Click "Apply" on "QA Automation Engineer" job
   - **Expected**: 
     - Toast message: "Application submitted!"
     - Button changes to "Applied"
     - Button is disabled

2. **Verify in Applications Page** (`/applications`)
   - Navigate to Applications
   - **Expected**:
     - Application shows in pipeline
     - Status: "Applied"
     - Job details visible
     - Date applied shown

3. **Check Browser Console**
   - ✅ No errors
   - ✅ No warnings about duplicate keys
   - ✅ No missing icon errors

---

## Test 6: Recruiter Views Application

### Steps:
1. **Switch Back to Recruiter Account**
   - Logout applicant, login recruiter

2. **Check Applications**
   - Navigate to Applications or Dashboard
   - Look for "QA Automation" job applications
   - **Expected**:
     - Applicant's application visible
     - Shows applicant name
     - Status: "Applied"
     - Can view resume

3. **Update Status**
   - Click on application
   - Change status to "Screening"
   - **Expected**: Status updates successfully

4. **Shortlist Candidate**
   - Change status to "Shortlisted"
   - **Expected**: 
     - Status updates
     - Applicant gets notification (if enabled)

---

## Test 7: Full Pipeline Test (Optional)

### Recruiter Actions:
1. **Schedule Interview**
   - Select application
   - Click "Schedule Interview"
   - Set date/time, add meeting link
   - **Expected**: Interview created

2. **Interview Management**
   - Check interviews section
   - **Expected**: Scheduled interview shows

### Applicant Actions:
1. **View Interview**
   - Login as applicant
   - Navigate to `/interviews`
   - **Expected**: Scheduled interview visible

2. **Join Interview**
   - Click meeting link
   - **Expected**: Opens in new tab

### Post-Interview:
1. **Recruiter: Extend Offer**
   - Mark interview complete
   - Click "Extend Offer"
   - Enter offer details
   - **Expected**: Offer sent

2. **Applicant: Respond to Offer**
   - View offer in applications
   - Accept/Decline
   - **Expected**: Response recorded

---

## ✅ Success Criteria

### Backend:
- [ ] Jobs created with `source.platform = 'manual'`
- [ ] `/jobs/recruiter` returns only recruiter's jobs
- [ ] `/jobs/all` returns all jobs
- [ ] `/jobs/match/:resumeId` excludes manual/direct jobs
- [ ] Applications created successfully
- [ ] Applications visible to recruiter

### Frontend:
- [ ] No console errors
- [ ] No duplicate key warnings
- [ ] Jobs separated correctly (seed vs manual)
- [ ] Apply button shows on all jobs
- [ ] Application status updates work
- [ ] Recruiter can manage applications

### Database:
- [ ] CSV jobs have `platform: 'seed'`
- [ ] Recruiter jobs have `platform: 'manual'`
- [ ] Applications reference correct job/user IDs

---

## Common Issues & Solutions

### Issue: Job not showing in recruiter dashboard
**Check:**
```javascript
// In MongoDB
db.jobs.findOne({ jobId: "YOUR_JOB_ID" })
// Verify: postedBy matches recruiter user ID
```

### Issue: Job showing in wrong section on applicant side
**Check:**
```javascript
// Verify platform
db.jobs.findOne({ jobId: "YOUR_JOB_ID" }, { "source.platform": 1 })
// Should be 'manual' for recruiter jobs
```

### Issue: Cannot apply to job
**Check:**
- Resume is uploaded and parsed
- User is authenticated
- Job status is 'active'
- Not already applied

### Issue: Application not visible to recruiter
**Check:**
```javascript
db.jobapplications.find({ jobId: ObjectId("JOB_OBJECT_ID") })
// Verify application exists with correct references
```

---

## Quick Debug Commands

### Check Job by ID:
```javascript
db.jobs.findOne({ jobId: "job_1234567890_abc" })
```

### Check All Recruiter Jobs:
```javascript
db.jobs.find({ 
  "source.platform": { $in: ["manual", "direct"] } 
}).pretty()
```

### Check Applications:
```javascript
db.jobapplications.find().sort({ createdAt: -1 }).limit(5).pretty()
```

### Update Job Platform (if needed):
```javascript
db.jobs.updateOne(
  { jobId: "YOUR_JOB_ID" },
  { $set: { "source.platform": "manual" } }
)
```

---

## Test Results

**Date:** ___________  
**Tester:** ___________

| Test | Pass | Fail | Notes |
|------|------|------|-------|
| Database verification | ☐ | ☐ | |
| Recruiter posts job | ☐ | ☐ | |
| Job visibility | ☐ | ☐ | |
| Applicant views jobs | ☐ | ☐ | |
| Apply for job | ☐ | ☐ | |
| Recruiter views application | ☐ | ☐ | |
| Full pipeline | ☐ | ☐ | |

**Overall Result:** ☐ PASS  ☐ FAIL

**Issues Found:**
_______________________________________
_______________________________________
_______________________________________
