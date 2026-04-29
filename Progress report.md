# Jan-Awaaj Progress Report

**Last updated:** 2026-04-29  
**Project stage:** MVP implemented (citizen-facing flows complete), authority-facing product surfaces partially complete.

## 1. What has been completed

### 1.1 Repository and project structure
- Monorepo-style layout with:
  - `backend/` (Express + MongoDB API)
  - `mobile/` (Expo React Native app)
  - `docs/` (PRD/TRD/compliance/privacy/terms)
- Root-level project documentation added and organized.

### 1.2 Backend (Express + MongoDB)
- Core server bootstrapped with:
  - `helmet`, `cors`, `morgan`, JSON parsing
  - `/api/health` endpoint
  - static upload serving via `/uploads`
- Complaint lifecycle APIs implemented:
  - `POST /api/complaints` (multipart + validation)
  - `GET /api/complaints/:complaintId`
  - `GET /api/complaints` (authority protected)
  - `PUT /api/complaints/:complaintId` (authority protected + timeline updates)
- Community feed APIs implemented:
  - `GET /api/posts?nearby=lat,lon&radiusKm=...` (geo query with `$geoNear`)
  - `POST /api/posts/:postId/vote`
  - `POST /api/posts/:postId/comments`
  - `GET /api/posts/by-complaint/:complaintId`
- Authority authentication implemented:
  - API key guard (`x-api-key`) for protected authority routes
  - optional JWT-based auth (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/token`)
- Data models completed:
  - `Complaint` (status, updates timeline, geo fields, privacy-first fields)
  - `Post` (geo point, vote counts, comments)
  - `User` (authority role for JWT flow)
- File upload support implemented (complaint photo + authority proof with multer, 8MB limit).

### 1.3 Mobile app (Expo React Native)
- App shell with bottom tabs completed:
  - Home
  - File Complaint
  - Tracking
  - Profile
- `File Complaint` flow completed:
  - category selection, description, optional photo
  - location capture with `expo-location`
  - share toggle (`sharePublic`)
  - multipart submit and acknowledgement handling
- `Tracking` flow completed:
  - local complaint ID persistence
  - active/completed segmentation
  - progress bar and stage checklist
  - status timeline rendering
  - manual complaint ID tracking
- `Home` feed completed:
  - location permission + nearby query
  - post rendering with complaint status
  - upvote/downvote actions
- `Profile` completed:
  - backend URL save/update on device
  - local complaint IDs management
  - notification placeholder section
- API/storage helper modules created:
  - `backendFetch`, backend URL storage
  - complaint ID persistence utilities.

### 1.4 Product and governance documentation
- `docs/PRD.md` created (product requirements and acceptance criteria).
- `docs/TRD.md` created (architecture, data models, contracts).
- `docs/COMPLIANCE.md` created (security/compliance plan).
- `docs/PRIVACY.md` and `docs/TERMS_OF_USE.md` drafted.
- `docs/README.md` and root `README.md` include setup + run guidance.

## 2. Theoretical completion summary

1. **Core MVP foundation**
   - Project is structured into backend (`Express + MongoDB`), mobile (`Expo React Native`), and documentation modules.
   - Development setup and run flow are established.

2. **Citizen-side complaint lifecycle**
   - Complaint filing supports category, description, optional photo, GPS capture, and optional public sharing.
   - Submission returns a unique complaint ID and acknowledgement.
   - Tracking supports active/completed grouping, progress representation, and status timeline.

3. **Community participation layer**
   - Nearby public grievance feed is implemented through geospatial querying.
   - Upvote/downvote and comments APIs are implemented.

4. **Authority-side backend capability**
   - Protected authority endpoints are implemented for listing and updating complaints.
   - Complaint status changes are logged to an audit-style timeline with optional proof attachment.
   - Authority auth supports API key mode (MVP) and optional JWT registration/login flow.

5. **Data and API architecture**
   - Core models (`Complaint`, `Post`, `User`) are implemented with key MVP fields.
   - REST endpoints for complaint create/read/update and feed interactions are in place.

6. **Security, privacy, and compliance direction**
   - Baseline security middleware and request validation are implemented.
   - Privacy-first intent is reflected in data model and documentation.
   - PRD/TRD/privacy/terms/compliance docs are prepared.

7. **Known practical constraints still pending**
   - No full authority dashboard UI yet.
   - Notifications and analytics remain future scope.
   - Automated tests/CI and production hardening are still pending.

## 3. Current known gaps / pending work

- Authority dashboard UI (requests management + analytics views) is not yet implemented in app surfaces.
- Push notifications are still placeholder-level.
- Automated tests and CI workflows are not present yet.
- Production hardening items are pending (rate limiting, stricter CORS policy, cloud media storage, data retention implementation).
- Some docs reference `backend/.env.example`; confirm/add this file if missing in the current workspace state.

## 4. Recent runtime issue observed (Expo Go)

- Observed error on device: `java.io.IOException: Failed to download remote update`.
- Working resolution path identified:
  - start Expo with tunnel + cache clear (`npx expo start --tunnel -c`)
  - ensure firewall allows Expo/Node
  - update Expo Go app
  - use machine LAN IP for backend URL in mobile profile (not `localhost` on physical phone).

## 5. Recommended tracking format for future updates

For each new change, append:
1. **Date**
2. **Area** (Backend / Mobile / Docs / Infra)
3. **Change summary**
4. **Endpoints/screens/files affected**
5. **Status** (Done / In progress / Blocked)

---

This report captures progress in the current Jan-Awaaj codebase snapshot and can be incrementally updated as new features or fixes are added.
