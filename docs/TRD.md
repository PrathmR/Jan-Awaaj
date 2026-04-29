# Technical Requirements Document (TRD) - MVP

## 1. Architecture Overview
### Mobile (Expo / React Native)
- React Navigation bottom tabs
- Screens:
  - Home feed (geo-filtered community posts)
  - File Complaint (multipart submission + GPS)
  - Tracking (active/completed views + timeline)
  - Profile (backend URL storage on device)

### Backend (Express + MongoDB)
- REST JSON API
- MongoDB collections for:
  - `complaints`
  - `posts` (linked to complaints)
  - `users` (placeholder for authority role model in MVP)
- File uploads saved to local `backend/uploads/` for MVP.

## 2. Technology Stack
- Node.js, Express
- MongoDB with Mongoose
- Multer for multipart uploads (photo/proof)
- Expo Location (GPS) and Expo Image Picker (photo)

## 3. Data Model (MVP)
### Complaint
Fields:
- `complaintId` (UUID string; public tracking id)
- `citizenPhone` (optional, privacy-first MVP; no names/addresses)
- `lat`, `lon`
- `category`, `description`, `photoUrl`
- `status` enum: `new | acknowledged | assigned | in_progress | resolved`
- `resolvedAt`
- `updates[]` (timeline/audit trail):
  - `status`, `note`, `proofUrl`, `actorType`, `actorId`, timestamps
- `sharePublic` boolean (if true → appears in community feed)

### Post (Community Feed)
Fields:
- `postId` (UUID string)
- `complaintId` (link to complaint)
- `text` (complaint description in MVP)
- `photoUrl` (optional)
- geospatial `location` as GeoJSON `Point` with `[lon, lat]`
- `voteCounts { up, down }`
- `comments[]` (simple text list in MVP)

## 4. API Contracts (MVP)
### Citizens
- `POST /api/complaints`
  - `multipart/form-data`
  - fields:
    - `category`, `description`, `sharePublic`, `citizenPhone`(optional), `lat`, `lon`
    - optional file field: `photo`
  - response:
    - `{ complaintId, ackMessage, postId? }`

- `GET /api/complaints/:complaintId`
  - response includes complaint + `updates` timeline

### Community Feed
- `GET /api/posts?nearby=lat,lon&radiusKm=3`
  - returns posts linked to complaints where `complaint.sharePublic=true`
  - uses `$geoNear` geospatial query

- `POST /api/posts/:postId/vote`
  - body: `{ value: "up" | "down" }`

- `POST /api/posts/:postId/comments`
  - body: `{ text }`

### Authority (MVP auth guard)
- Header required:
  - `x-api-key: <AUTH_API_KEY>`
- `GET /api/complaints?status=&category=&createdAfter=`
  - protected
- `PUT /api/complaints/:complaintId` (multipart optional `proof`)
  - body fields:
    - `status`, `note`
  - updates `updates[]` timeline with `actorType=authority`

## 5. Security & Compliance Hooks
- Helmet + basic CORS
- Input validation:
  - Zod validation for complaint create payload
- Upload limits:
  - MVP limits photo/proof file size
- Audit trail:
  - each status change appends to `Complaint.updates[]`

