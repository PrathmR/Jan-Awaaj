# Privacy Policy (MVP Draft)

## 1. What data we collect
This MVP is privacy-first and collects only the minimum data necessary to submit and track grievances.

For complaints:
- `citizenPhone`: optional mobile number (no names/addresses)
- `lat`, `lon`: geo-coordinates captured at submission time
- `category`, `description`: text and categorization needed to understand the issue
- `photoUrl`: optional media reference (if a photo is uploaded)
- Complaint `updates[]`: status timeline (system/authority entries, plus optional notes/proof)

For community feed posts:
- Feed items are derived from complaints marked `sharePublic=true`
- No user identity is displayed; feed does not expose names or direct identifying details.

## 2. Why we collect it
- To route and process complaints by category/department.
- To provide tracking and transparency (audit trail).
- To show community feed items near a user’s location (approximate radius query).

## 3. Data retention
MVP does not define retention schedules (to be finalized for legal compliance).
In production, we will define and document retention for:
- complaints and timeline updates
- uploaded media
- deleted/expired records

## 4. Data security
- Communication should be secured with HTTPS/TLS in production.
- Uploads/media must be served via secure links and protected access controls.
- Future: encrypt data at rest.

## 5. User rights (future production requirement)
Users may be granted rights to:
- request deletion/export of their grievance data
- correct inaccuracies

## 6. Contact / accountability
This MVP draft is a starting point and must be reviewed by legal counsel before launch.

