# Test Plan: Recruiter-Applicant Job Flow

## Test Prerequisites
1. Backend running on `http://localhost:8000`
2. Frontend running on `http://localhost:3001`
3. Database migration completed (CSV jobs now use 'seed' platform)
4. Two test accounts:
   - Recruiter account: username/email for recruiter
   - Applicant account: username/email for applicant

## Test Scenario 1: Recruiter Posts a Job

### Steps:
1. **Login as Recruiter**
   - Navigate to `/login`
   - Login with recruiter credentials
   - Should redirect to recruiter dashboard

2. **Post a New Job**
   - Navigate to "Jobs" section
   - Click "Post New Job" or "Create Job"
   - Fill in job details:
     - Title: "Senior Full Stack Developer"
     - Company: "Test Company Inc"
     - Description: "We are looking for an experienced full stack developer..."
     - Location: "Bangalore, India"
     - Employment Type: "Full-time"
     - Experience Level: "Senior"
     - Required Skills: ["React", "Node.js", "MongoDB"]
     - Salary: Min 1500000, Max 2500000 INR
   - Click "Post Job"
   - **Expected**: Success message, job appears in recruiter's job list
   - **Expected**: Job saved with `source.platform = 'manual'`

3. **Verify Job in Recruiter Dashboard**
   - Check "My Jobs" section
   - **Expected**: Posted job appears with status "Active"
   - **Expected**: Job shows correct details

## Test Scenario 2: Applicant Views Jobs

### Steps:
1. **Login as Applicant**
   - Navigate to `/login`
   - Login with applicant credentials
   - Upload resume if not already uploaded

2. **Check Dashboard**
   - Navigate to `/dashboard`
   - Look at "Live Job Roles" section
   - **Expected**: Shows CSV/seed platform jobs (from jobs.csv)
   - **Expected**: Does NOT show recruiter-posted job here

3. **Check Recruiter Posted Section**
   - Scroll to "Recruiter posted roles" section on dashboard
   - **Expected**: Shows the job posted by recruiter
   - **Expected**: Job has "Apply" button (not external link)
   - **Expected**: Shows job details correctly

4. **Check Jobs Listing Page**
   - Navigate to `/jobs`
   - **Expected**: Can see all jobs including recruiter-posted
   - **Expected**: Each job has correct "Apply" button

## Test Scenario 3: Apply for Recruiter Job

### Steps:
1. **Apply from Dashboard**
   - In "Recruiter posted roles", click "Apply" button on recruiter job
   - **Expected**: Success toast message
   - **Expected**: Button changes to "Applied"
   - **Expected**: Application recorded in database

2. **Verify Application**
   - Navigate to `/applications`
   - **Expected**: Application appears in pipeline
   - **Expected**: Shows status "Applied"
   - **Expected**: Shows job details

## Test Scenario 4: Recruiter Views Applications

### Steps:
1. **Switch to Recruiter Account**
   - Logout from applicant
   - Login as recruiter

2. **Check Applications**
   - Navigate to recruiter dashboard
   - Go to "Applications" section
   - **Expected**: See application from test applicant
   - **Expected**: Can view applicant's resume
   - **Expected**: Can change application status

3. **Shortlist Candidate**
   - Click on application
   - Change status to "Shortlisted"
   - **Expected**: Status updates successfully
   - **Expected**: Applicant receives notification (if enabled)

## Test Scenario 5: Full Pipeline Test

### Steps:
1. **Recruiter Actions**
   - Schedule interview for applicant
   - **Expected**: Interview appears in calendar
   - Move candidate to "Interview Scheduled"
   - **Expected**: Status updates correctly

2. **Applicant Actions**
   - Login as applicant
   - Check `/interviews` page
   - **Expected**: See scheduled interview
   - **Expected**: Can view interview details

3. **Recruiter Final Steps**
   - Mark interview as completed
   - Extend offer to candidate
   - **Expected**: Offer details saved
   - **Expected**: Status = "Offer Extended"

4. **Applicant Offer Response**
   - View offer in applications
   - Accept or decline offer
   - **Expected**: Offer response recorded

## Expected Database States

### Jobs Collection:
```javascript
// CSV Job (seed platform) - in marketplace
{
  jobId: "file_0",
  title: "Software Engineer",
  source: { platform: "seed" },
  status: "active"
}

// Recruiter Job (manual platform) - in recruiter section
{
  jobId: "job_1234567890_abc",
  title: "Senior Full Stack Developer",
  source: { platform: "manual" },
  organizationId: ObjectId("..."),
  postedBy: ObjectId("..."),
  status: "active"
}
```

### Job Source Platform Mapping:
- **`seed`**: CSV jobs → "Live Job Roles" marketplace
- **`manual`**: Recruiter-posted jobs → "Recruiter posted roles"
- **`direct`**: Direct employer posts → "Recruiter posted roles"
- **`linkedin`/`indeed`/`real`**: Scraped jobs → "Live Job Roles" marketplace

## Verification Checklist

### Backend:
- [ ] POST `/api/recruiter/:orgSlug/jobs` creates job with `platform: 'manual'`
- [ ] GET `/api/jobs/recruiter` returns only recruiter's jobs
- [ ] GET `/api/jobs/match/:resumeId` excludes manual/direct platform jobs
- [ ] GET `/api/jobs/all` with `sourcePlatform` filter works
- [ ] POST `/api/jobs/:jobId/apply` creates application successfully
- [ ] Application pipeline endpoints work correctly

### Frontend:
- [ ] Dashboard separates seed jobs (marketplace) from manual jobs (recruiter)
- [ ] No console errors on dashboard
- [ ] No duplicate key warnings
- [ ] Apply button shows for all job types
- [ ] Application status updates correctly
- [ ] Recruiter can see applications to their jobs

## Common Issues and Solutions

### Issue: Jobs not showing in recruiter section
**Solution**: Check job's `source.platform` - should be 'manual' or 'direct'

### Issue: CSV jobs appearing in recruiter section
**Solution**: Run migration script to update CSV jobs to 'seed' platform

### Issue: Cannot apply to recruiter job
**Solution**: Check if job has organizationId - recruiter jobs should have it

### Issue: Application not visible to recruiter
**Solution**: Verify JobApplication has correct jobId and userId references

## Test Results Template

```
Date: ___________
Tester: ___________

Scenario 1: Recruiter Posts Job
[ ] PASS / [ ] FAIL
Notes: _________________

Scenario 2: Applicant Views Jobs
[ ] PASS / [ ] FAIL
Notes: _________________

Scenario 3: Apply for Job
[ ] PASS / [ ] FAIL
Notes: _________________

Scenario 4: Recruiter Views Applications
[ ] PASS / [ ] FAIL
Notes: _________________

Scenario 5: Full Pipeline
[ ] PASS / [ ] FAIL
Notes: _________________
```
