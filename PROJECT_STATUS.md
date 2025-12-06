# Project Status & Product Flow Report

_Last updated: December 4, 2025_

This document consolidates the current end-to-end flow, implemented capabilities, outstanding gaps, and known risks for the **Resume Genie** ATS platform (both candidate and recruiter experiences).

---

## 1. System Overview

| Layer | Description | Key Files |
| --- | --- | --- |
| Frontend | React + Vite single-page app with shared UI kit (Navbar, Button, Card, Modal). Candidate surfaces (Applications, Interviews, Offers) redesigned with a minimal “chip” system for filters/status.
| `frontend/src/pages/*.jsx`, `frontend/src/services/api.js`, `frontend/src/components/ui/*`
| Backend | Express API backed by MongoDB/Mongoose. Routes split by concern (`applications`, `interviews`, `recruiter`). Auth middleware hydrates the full user record.
| `backend/src/routes/*.js`, `backend/src/models/*`, `backend/src/middleware/authMiddleware.js`
| AI/ML Services | Python microservices (classification, embeddings, NER) invoked via backend service layer for resume intelligence (not part of this report’s scope but referenced in job matching & parsing).
| `backend/python/*`

---

## 2. End-to-End Flow

### 2.1 Candidate Journey

1. **Onboarding & Resume Upload**
   - `/upload` route posts to `/api/resume/upload`, triggers Gemini/HF parsing, persists to MongoDB.
   - Dashboard highlights parsed skills, job recommendations, and quick links.

2. **Job Discovery**
   - Browse and AI-match jobs (`frontend/src/pages/JobsPage.jsx`, `backend/src/routes/job.routes.js`).
   - Save roles, add notes, mark as applied.

3. **Apply**
   - `POST /api/applications/apply/:jobId` handles submission (resume + cover letter + metadata + subscription credit tracking).
   - Applications summarized via `GET /api/applications` with filters, sort, pagination, stats.
   - Timeline modal pulls `GET /api/applications/:id` for recruiter actions, interviews, offers.
   - Withdraw via `PUT /api/applications/:id/withdraw` (with optional note).

4. **Interviews**
   - Candidate view hits `/api/interviews` & `/api/interviews/:id`.
   - Respond/reschedule using `PUT /api/interviews/:id/respond`; UI prompts for reasons & alternate slots.

5. **Offers**
   - `GET /api/applications/offers` groups data by status (active / accepted / declined).
   - `PUT /api/applications/:id/offer/respond` for acceptance/decline + optional note.

### 2.2 Recruiter Journey

1. **Organization Dashboard**
   - `/api/recruiter/:orgSlug/dashboard` summarizes job counts, pipeline stats, recent applications, upcoming interviews.

2. **Job Management**
   - CRUD endpoints: create (`POST /jobs`), list (`GET /jobs`), detail (`GET /jobs/:jobId`), update (`PUT`), close (`DELETE`), clone (`POST /clone`).

3. **Applicant Tracking**
   - Filter/search applications (`GET /applications`).
   - Inspect full record (`GET /applications/:applicationId`) including resume, AI analysis, timeline, notes.
   - Update status with audit trail (`PUT /applications/:applicationId/status`).
   - Bulk operations for status and rejection (`POST /applications/bulk-status`, `/bulk-reject`).
   - Recruiter notes (`POST /applications/:applicationId/notes`).

4. **Interviews & Offers**
   - Schedule: `POST /applications/:applicationId/interview`.
   - Update existing interview: `PUT /interviews/:interviewId`.
   - Send offers: `POST /applications/:applicationId/offer` (ties directly into candidate offer UI).

5. **Candidate Search**
   - `GET /candidates/search` (basic list today). Requires enhancement for filters/security.

---

## 3. Feature Inventory

### 3.1 Candidate-Facing

| Pillar | Capabilities | Status |
| --- | --- | --- |
| Profile & Resume | Multi-resume upload, AI parsing, activation, avatar management, stats. | ✅ Stable |
| Job Discovery | Browse, semantic match, filter, save jobs, add notes/tags, reminders. | ✅ Mature |
| Applications | Apply, view pipeline, stats, timelines, withdraw, match score visualization. | ✅ Freshly redesigned |
| Interviews | Filtered list, confirm/reschedule, panel details, notes. | ✅ Freshly redesigned |
| Offers | Grouped by status, accept/decline with modal, compensation breakdown. | ✅ Freshly redesigned |
| Notifications | Model + endpoints exist; triggers for applications/interviews partially wired. | ⚠️ Partial |
| Skill Development | Quizzes, badges, roadmaps, verification feed. | ✅ Existing |

### 3.2 Recruiter-Facing

| Pillar | Capabilities | Status |
| --- | --- | --- |
| Dashboard | Counts, pipeline stats, upcoming interviews, recent apps. | ✅ Good foundation |
| Job Management | Create/list/filter/edit/close/clone job posts. | ✅ Completed this sprint |
| Applications | Detailed view, status updates, notes, bulk actions, schedule interviews. | ✅ Completed this sprint |
| Offers | Send offers + embed details in JobApplication. | ✅ Completed this sprint |
| Candidate Search | Basic resume list. | ⚠️ Needs richer filters + permissions |
| Communication | Recruiter notes only. | ❌ Missing two-way messaging & email templates |
| Analytics | Basic counts only. | ❌ Needs advanced metrics (time-to-fill etc.) |

---

## 4. Newly Added Work (Dec 2025)

1. **Backend**
   - `backend/src/routes/application.routes.js`: Full candidate endpoints (apply/list/details/withdraw/stats/offers/respond).
   - `backend/src/routes/interview.user.routes.js`: Candidate interview tracking (list/details/respond).
   - `backend/src/routes/recruiter.routes.js`: Added job detail/edit/close/clone, bulk status/reject, deduped routes.
   - `backend/src/services/applicationService.js` (if present) uses JobApplication timeline + interviews/offer helper methods.

2. **Frontend**
   - `frontend/src/pages/ApplicationsPage.jsx`, `InterviewsPage.jsx`, `OffersPage.jsx`: Rebuilt with shared layout, chips, status badges, consistent CTAs.
   - `frontend/src/services/api.js`: Introduced `applicationsAPI`, `interviewAPI`, full `recruiterAPI` with job CRUD + bulk operations.
   - `frontend/src/components/ui/Navbar.jsx`: Added Applications/Interviews/Offers links conditioned on auth.
   - `frontend/src/pages/DashboardPage.jsx`: Workflow shortcuts for candidate pipeline.
   - Shared styles updated (`index.css`) with `.chip` utility for cross-page cohesion.

---

## 5. Outstanding Gaps

### 5.1 High-Impact Missing Features

1. **Messaging / Communication Hub**
   - No real-time or asynchronous messaging between recruiters and candidates.
   - Email templates, audit logs, SMS notifications absent.

2. **Notification Triggers**
   - Infrastructure exists but lacks event emitters for application status changes, interview reminders, new job matches.

3. **Analytics & Insights**
   - Time-to-hire, source attribution, conversion funnels, recruiter productivity not exposed.

4. **Recruiter Candidate Search Enhancements**
   - Needs filtering (skills/experience/location), saved pools, tagging, permission-aware data (PII risk).

5. **Exports & Integrations**
   - No CSV/PDF export of applications.
   - Calendar sync (Google/Outlook) missing for interviews.

6. **Offer Negotiation Support**
   - No thread/notes per offer revision, no version history.

### 5.2 Medium/Low Priority

- Delete old resumes & share parsed resume link.
- Saved job alerts & job view history.
- Interview feedback templates/rating scorecards.
- Talent pool CRM (shortlists, nurture campaigns).

---

## 6. Known Issues & Risks

| Area | Issue | Impact | Recommendation |
| --- | --- | --- | --- |
| Recruiter Candidate Search | Returns entire resume documents without role-based field masking. | ⚠️ Potential PII exposure. | Restrict fields + add search filters + audit logging. |
| Validation | Recruiter job/application updates accept raw payloads without schema validation. | ⚠️ Bad data, possible runtime errors. | Introduce JOI/Zod validation or Mongoose validators with descriptive errors. |
| Error Handling | Frontend surfaces generic errors; limited retry/backoff. | ⚠️ Poor UX on flaky networks. | Standardize API error wrappers + toast copy. |
| Performance | Application/Interview list endpoints populate large subdocuments. | ⚠️ Slow queries at scale. | Use `.select`/`.lean()`, paginate nested arrays (timeline, notes). |
| Testing | No automated tests for new pages/routes. | ⚠️ Regression risk. | Add integration tests (backend) + component tests (frontend). |
| UI Consistency | Recruiter UI still on legacy styles while candidate UI redesigned. | ⚠️ Inconsistent brand experience. | Apply shared “chip + card-base” system to recruiter portal. |
| Authentication | Token refresh/expiration handling not visible; risk of silent logout. | ⚠️ Session issues. | Implement refresh token/renew logic on frontend. |

---

## 7. Recommended Next Steps

1. **Phase 5 Kickoff (Communications + Notifications)**
   - Messaging API & UI, email/SMS templates, notification triggers.
2. **Analytics Enhancements**
   - Extend recruiter dashboard with time-to-fill, stage conversions, source breakdowns.
3. **Security/Compliance Hardening**
   - Review candidate search, add field-level permissions, audit logs.
4. **Recruiter UI Refresh**
   - Reuse chip utility + card-base styles for recruiter dashboards/forms.
5. **Testing & Telemetry**
   - Add critical path tests (apply, interview respond, offer decision) and usage instrumentation.
6. **Exports & Integrations**
   - Offer CSV/PDF exports and calendar sync to close parity gaps with commercial ATS suites.

---

## 8. Quick Reference: Key Endpoints

```
Applications (Candidate)
POST /api/applications/apply/:jobId
GET  /api/applications
GET  /api/applications/:id
PUT  /api/applications/:id/withdraw
GET  /api/applications/user/stats
GET  /api/applications/offers
PUT  /api/applications/:id/offer/respond

Interviews (Candidate)
GET  /api/interviews
GET  /api/interviews/:id
PUT  /api/interviews/:id/respond

Recruiter Job Management
GET  /api/recruiter/:orgSlug/jobs/:jobId
PUT  /api/recruiter/:orgSlug/jobs/:jobId
DELETE /api/recruiter/:orgSlug/jobs/:jobId
POST /api/recruiter/:orgSlug/jobs/:jobId/clone

Recruiter Bulk Actions
POST /api/recruiter/:orgSlug/applications/bulk-status
POST /api/recruiter/:orgSlug/applications/bulk-reject
```

---

**Summary:** The ATS now delivers a cohesive candidate life cycle (apply → interview → offer) and robust recruiter tooling (job edits, bulk actions). The largest gaps center on communications, analytics, and enterprise-grade conveniences (notifications, exports, calendar integrations). Addressing those will move the product from “feature-complete” to “production-ready” for high-volume teams.
