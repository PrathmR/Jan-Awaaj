# Product Requirements Document (PRD) - Citizen Grievance MVP

## 1. Purpose
Build a cross-platform complaint app (Expo/React Native) with two roles:
- Citizens: submit complaints with optional login/registration
- Government Authorities: review requests, update status, attach proof, and see basic analytics

## 2. Personas
1. **Citizen (unregistered or registered)**: wants to file and track complaints quickly with minimal data.
2. **Authority Officer (logged in)**: wants to view new complaints, update status, and attach proof.

## 3. Core User Stories
### Citizen
1. Open app → optional registration.
2. Tap **File Complaint**.
3. Choose **Category/Ministry**.
4. Enter **Description** and optionally attach a **Photo**.
5. Auto-capture **Location (GPS lat/lon)**.
6. Optionally enable **Share publicly** to post on community feed.
7. Submit → receive **unique complaint ID** and instant acknowledgement.
8. Go to **Tracking**:
   - **Active** and **Completed** tabs
   - Progress bar + checklist (ACK → Assignment → Action → Resolution)
   - Timeline of updates
9. View **Home feed**:
   - Like/upvote and dislike/downvote
   - Leave comments

### Authority
1. Authenticate (MVP: `x-api-key`).
2. Open **Requests**:
   - New / Completed filtering
3. Update complaint status (e.g. `acknowledged`, `assigned`, `in_progress`, `resolved`).
4. Attach proof via `PUT /api/complaints/:complaintId`.
5. (Future) Receive notifications and view analytics dashboards.

## 4. MVP Feature List (implemented)
- Citizen
  - `File Complaint` form (category, description, optional photo, GPS, share toggle)
  - `Tracking` with progress + timeline
  - `Home/Feed` with geo-filtered posts and voting + comments
  - `Profile` to store backend URL on-device (MVP dev convenience)
- Backend
  - Complaints create/read/update with timeline (audit trail for MVP)
  - Public community feed using geospatial query
  - Authority auth guard via `x-api-key`

## 5. Non-Functional Requirements
- Privacy-first data minimization:
  - Complaint stores only phone (optional) and geo-coordinates, not names/addresses.
  - Feed does not display user identity.
- Accessibility (target): WCAG 2.1 Level AA (design for contrast, labels, and screen-reader support).
- Security (target):
  - HTTPS in production
  - Role-based access control for authority routes
  - Audit trail stored per complaint update

## 6. Acceptance Criteria (MVP)
1. Submitting a complaint returns a **complaintId** and acknowledgement message.
2. Tracking shows:
   - Complaint list in Active/Completed tabs based on status
   - Progress bar and checklist derived from status history
   - Timeline of updates
3. Feed shows only `sharePublic=true` complaints within the requested radius.
4. Voting and comments update the feed post data.
5. Authority endpoints require `x-api-key` and deny unauthorized requests.

