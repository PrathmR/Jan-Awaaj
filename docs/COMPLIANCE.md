# Compliance & Security Plan (MVP)

## 1. Security Goals
- Protect complaint data and authority operations with role-based access controls (RBAC).
- Ensure secure API usage with TLS/HTTPS in production.
- Maintain an audit trail for complaint lifecycle events.

## 2. MVP Security Controls (implemented / planned)
### Implemented in backend
- Security middleware: `helmet`
- Input validation for complaint creation via `zod`
- Authority authorization guard:
  - MVP uses a shared secret header: `x-api-key`
  - Optional JWT support exists if `AUTH_JWT_SECRET` is set
- Audit trail (MVP):
  - Every status update appends to `Complaint.updates[]`
- Media handling:
  - Photo/proof uploads are stored as files and served from `/uploads/...` in dev

### Planned for production (not fully implemented in MVP)
- Encrypt data at rest (MongoDB encryption / disk encryption)
- Enforce jurisdiction/department scoping for authorities (department-based filters)
- Centralized logging/monitoring with retention policies
- Rate limiting + spam mitigation (AI verification module later)

## 3. Privacy & Legal Compliance Hooks
- Data minimization (store only phone + geo-coordinates; avoid names/addresses)
- Provide a mechanism for data subject requests (deletion/export) in later versions
- Document access rights and retention schedules in Privacy Policy

## 4. Accessibility Compliance Target
- UI should target WCAG 2.1 Level AA:
  - sufficient color contrast
  - descriptive labels and focus order
  - screen reader support for interactive elements

