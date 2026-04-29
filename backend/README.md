# Backend (Express + MongoDB)

## MongoDB setup
1. Use MongoDB Atlas (recommended) or run local MongoDB.
2. Copy `.env.example` to `.env` and set:
   - `MONGODB_URI`
   - `AUTH_API_KEY` (for authority endpoints)

## Run
```sh
npm install
npm run dev
```

## API (MVP)
- `POST /api/complaints` (multipart/form-data; optional `photo`)
  - body fields: `category`, `description`, `sharePublic` (true/false), `citizenPhone` (optional), `lat`, `lon`
  - returns: `{ complaintId, ackMessage, postId? }`

- `GET /api/complaints/:complaintId` (public)

- `PUT /api/complaints/:complaintId` (authority; multipart; optional `proof`)
  - body fields: `status`, `note` (optional)

- `GET /api/posts?nearby=lat,lon&radiusKm=3` (public feed)

- `POST /api/posts/:postId/vote`
  - body: `{ value: "up" | "down" }`

- `POST /api/posts/:postId/comments`
  - body: `{ text }`

## Authority authentication (MVP)
Send header `x-api-key: <AUTH_API_KEY>` for:
- `GET /api/complaints`
- `PUT /api/complaints/:complaintId`

### Authority self-registration (JWT)
If `AUTH_JWT_SECRET` is set, authorities can also self-register + login:
- `POST /api/auth/register`
  - JSON body: `{ phone, departmentId, password }`
- `POST /api/auth/login`
  - JSON body: `{ phone, password }`
  - response: `{ token }`

Then call protected endpoints with:
- `Authorization: Bearer <token>`

