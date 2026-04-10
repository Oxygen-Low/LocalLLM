# Security Policy

This document describes the information security practices implemented by Local.LLM, aligned with **ISO 27001:2022** Annex A controls and **SOC 2** Trust Service Criteria.

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly by opening a private security advisory through our GitHub repository rather than a public issue. We will acknowledge your report within 72 hours and aim to provide a fix within 30 days.

## SOC 2 Trust Service Criteria Mapping

### CC6 – Logical and Physical Access Controls

| Criteria | Description | Implementation |
| -------- | ----------- | -------------- |
| CC6.1 | Logical access security | Server-side session tokens (UUID v4) issued on login/signup; `requireSession` middleware validates `Authorization: Bearer` headers on all protected endpoints; HTTP interceptor automatically attaches tokens to requests; server-side password hash format validation (SHA-256 hex) |
| CC6.2 | Access credentials | PBKDF2-hashed passwords (100 000 iterations, 32-byte key, per-user 16-byte salt); cryptographically random session tokens via `crypto.randomUUID()`; admin passwords generated with 192-bit entropy via `crypto.randomBytes(24)` |
| CC6.3 | Access removal | `POST /api/auth/logout` invalidates server-side sessions; `invalidateUserSessions()` revokes all tokens on account deletion; 24-hour session expiry; 30-minute inactivity auto-logout |
| CC6.6 | Restricting access | Role-based access control (admin/user); `authGuard` and `adminGuard` route guards; protected endpoints derive identity from session token (not client-provided) |
| CC6.7 | Data in transit | HTTPS-only transport with TLS certificates; Content Security Policy headers; `Strict-Transport-Security` with `includeSubDomains` |
| CC6.8 | Unauthorized access prevention | Server-side account lockout after 5 failed attempts (15-minute lockout); client-side rate limiting; Express rate limiter (10 auth requests / 15 minutes per IP); timing-safe password comparison via `crypto.timingSafeEqual` |

### CC7 – System Operations

| Criteria | Description | Implementation |
| -------- | ----------- | -------------- |
| CC7.1 | Infrastructure monitoring | `GET /api/health` endpoint for availability monitoring; structured JSON audit log entries enable SIEM integration; `X-Request-Id` UUID on every response for end-to-end request tracing |
| CC7.2 | Anomaly detection | Audit log captures all authentication events (success/failure), admin actions, and account changes with timestamps, request IDs, usernames, and source IPs |
| CC7.4 | Incident response | Private security advisory process for vulnerability reporting; 72-hour acknowledgment and 30-day remediation targets |

### CC8 – Change Management

| Criteria | Description | Implementation |
| -------- | ----------- | -------------- |
| CC8.1 | Authorized changes | Server-side input validation on all endpoints; username format/length validation; password hash format validation; request body size limits (1 MB) to prevent DoS |

### A1 – Availability

| Criteria | Description | Implementation |
| -------- | ----------- | -------------- |
| A1.1 | Processing capacity | `GET /api/health` endpoint for monitoring; rate limiting prevents resource exhaustion (100 general / 10 auth requests per 15 minutes); request body size limit (1 MB); graceful shutdown with data persistence on SIGTERM/SIGINT |
| A1.2 | Environmental protections | SSRF protection with IP-range blocking, DNS validation, and hostname allowlist; Helmet security headers |

### PI1 – Processing Integrity

| Criteria | Description | Implementation |
| -------- | ----------- | -------------- |
| PI1.1 | Input validation | Server-side username validation (3–30 chars, alphanumeric/hyphen/underscore); password hash format validation (64-char hex); JSON body size limit (1 MB); supported language code whitelist |

### C1 – Confidentiality

| Criteria | Description | Implementation |
| -------- | ----------- | -------------- |
| C1.1 | Confidential information protection | Passwords hashed with PBKDF2 (never stored or transmitted in plaintext); session data in `sessionStorage` (cleared on tab close); `Cache-Control: no-store` on all API responses; `Permissions-Policy` restricts browser APIs |
| C1.2 | Confidential information disposal | Account deletion permanently removes all user data; audit logs automatically rotated at 10 MB; expired sessions automatically cleaned up hourly |

## ISO 27001:2022 Control Mapping

### A.5 – Organisational Controls

| Control | Description | Implementation |
| ------- | ----------- | -------------- |
| A.5.1 | Policies for information security | This document; privacy policy (`/privacy`); terms of service (`/terms`) |
| A.5.15 | Access control | Role-based access (admin/user); `authGuard` and `adminGuard` route guards; server-side session token validation |
| A.5.17 | Authentication information | PBKDF2-hashed passwords (100 000 iterations, 32-byte key, per-user salt); client-side SHA-256 pre-hashing; forced password reset support |
| A.5.23 | Information security for cloud services | HTTPS-only transport; CSP headers; SSRF protection for outbound requests |
| A.5.34 | Privacy and protection of PII | UK GDPR-compliant privacy policy; minimal data collection; account deletion |

### A.8 – Technological Controls

| Control | Description | Implementation |
| ------- | ----------- | -------------- |
| A.8.5 | Secure authentication | Password complexity rules (≥8 chars, upper, lower, digit, special); server-side account lockout after 5 failed attempts (15-min window); 30-min inactivity timeout; server-side session tokens |
| A.8.9 | Configuration management | Helmet security headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy); `Cache-Control: no-store` on API responses; `Permissions-Policy` restricting camera, microphone, geolocation, payment |
| A.8.12 | Data leakage prevention | Content Security Policy restricting resource origins; `object-src 'none'`; `base-uri 'self'` |
| A.8.15 | Logging | Persistent server-side audit log (`data/audit.log`) recording login success/failure, signup, password changes, account deletions, logout, and admin actions with timestamps, request IDs, usernames, and source IPs; client-side security event logging via `SecurityLoggerService` |
| A.8.16 | Monitoring activities | Structured JSON audit log entries enable integration with SIEM tools; X-Request-Id header on every response for end-to-end request tracing; `GET /api/health` endpoint for availability monitoring |
| A.8.24 | Use of cryptography | PBKDF2 with SHA-256 for password storage; SHA-256 client-side pre-hashing; AES-256-GCM for API key encryption at rest; HTTPS with TLS certificates; `crypto.timingSafeEqual` for constant-time comparison; `crypto.randomUUID()` for session tokens |
| A.8.25 | Secure development lifecycle | Server-side input validation (username length/format, password hash format); rate limiting on all API and auth endpoints; SSRF protection with IP-range blocking and DNS validation; request body size limits |
| A.8.26 | Application security requirements | Express Rate Limiter (100 req/15 min general, 10 req/15 min auth); server-side account lockout (5 failures / 15-min lockout); timing-safe password comparison; no sensitive data in error responses |

## Session Management

Server-side session tokens are issued on successful login or signup:

- **Token format**: UUID v4 via Node.js `crypto.randomUUID()` (CSPRNG)
- **Token lifetime**: 24 hours (configurable via `SESSION_MAX_AGE_MS`)
- **Storage**: Server-side in-memory session store with automatic hourly cleanup
- **Client delivery**: Returned in the login/signup JSON response and stored in `sessionStorage`
- **Transmission**: Attached to all API requests via `Authorization: Bearer <token>` header (Angular HTTP interceptor)
- **Invalidation**: `POST /api/auth/logout` removes the token server-side; account deletion revokes all user sessions
- **Protected endpoints**: All authenticated API endpoints are session-protected, including endpoints for authentication management (`/api/auth/*`), user settings and language (`/api/user/*`), personas, chats, roleplay sessions, datasets, repositories, coding agent containers, model training, web SEO, local fix sessions, and admin operations

## Cryptographic Standards

| Purpose | Algorithm | Parameters |
| ------- | --------- | ---------- |
| Password storage | PBKDF2 | SHA-256, 100 000 iterations, 32-byte derived key, 16-byte random salt |
| Client pre-hash | SHA-256 | Single pass before transmission over HTTPS |
| Session tokens | `crypto.randomUUID()` | UUID v4 via Node.js CSPRNG |
| Admin password generation | `crypto.randomBytes(24)` | 192-bit entropy, base64url-encoded |
| API key encryption | AES-256-GCM | Per-user key derived via PBKDF2 from 256-bit master key; IV + auth tag + ciphertext stored in `data/apikeys_<user>.enc` |
| Encryption master key | `crypto.randomBytes(32)` | 256-bit key stored in `data/encryption.key` with mode 0600 |

## Security Headers

All API responses include the following security headers:

- `Content-Security-Policy` – restricts resource loading to `'self'` with minimal exceptions
- `Strict-Transport-Security` – enforces HTTPS with `max-age` and `includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-Request-Id` – unique UUID for request correlation and audit trail
- `Cache-Control: no-store, no-cache, must-revalidate` – prevents caching of sensitive API data
- `Pragma: no-cache`
- `Permissions-Policy` – disables camera, microphone, geolocation, and payment APIs
- `Referrer-Policy: no-referrer`
- `X-Permitted-Cross-Domain-Policies: none`

## Audit Log Format

Each line in `data/audit.log` is a self-contained JSON object:

```json
{
  "timestamp": "2026-03-19T12:00:00.000Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "LOGIN_SUCCESS",
  "username": "admin",
  "ip": "192.168.1.100",
  "message": "User logged in"
}
```

### Logged Event Types

| Event | Trigger |
| ----- | ------- |
| `LOGIN_SUCCESS` | Successful authentication |
| `LOGIN_FAILURE` | Failed authentication attempt (includes lockout events) |
| `SIGNUP_SUCCESS` | New account created |
| `SIGNUP_FAILURE` | Account creation rejected |
| `PASSWORD_CHANGED` | Password updated successfully |
| `PASSWORD_CHANGE_FAILURE` | Password change rejected |
| `USERNAME_CHANGED` | Username updated successfully |
| `ACCOUNT_DELETED` | Account removed |
| `LOGOUT` | User logged out (server-side session invalidated) |
| `API_KEY_SET` | User saved an API key for a provider |
| `API_KEY_REMOVED` | User removed an API key for a provider |
| `GITHUB_TOKEN_SET` | User saved a GitHub integration token |
| `GITHUB_TOKEN_REMOVED` | User removed a GitHub integration token |
| `HF_TOKEN_SET` | User saved a HuggingFace integration token |
| `HF_TOKEN_REMOVED` | User removed a HuggingFace integration token |
| `PERSONA_CREATED` | User created a persona |
| `PERSONA_UPDATED` | User updated a persona |
| `PERSONA_DELETED` | User deleted a persona |
| `DATASET_GENERATED` | User generated a dataset with AI |
| `DATASET_CREATED` | User created or saved a dataset |
| `DATASET_UPDATED` | User updated a dataset |
| `DATASET_DELETED` | User deleted a dataset |
| `DATASET_ARCHIVED` | User archived a dataset |
| `DATASET_UNARCHIVED` | User unarchived a dataset |
| `DATASET_IMPORTED` | User imported a dataset from HuggingFace |
| `DATASET_REFINED` | User refined a dataset with AI |
| `REPO_CREATED` | User created a repository |
| `REPO_DELETED` | User deleted a repository |
| `REPO_ARCHIVED` | User archived a repository |
| `REPO_UNARCHIVED` | User unarchived a repository |
| `REPO_IMPORTED` | User imported a repository from GitHub |
| `REPO_EXPORTED` | User exported a repository to GitHub |
| `REPO_KEY_REGENERATED` | User regenerated a repository key |
| `CONTAINER_CREATED` | Coding agent container created |
| `CONTAINER_STARTED` | Coding agent container started |
| `CONTAINER_STOPPED` | Coding agent container stopped |
| `CONTAINER_REMOVED` | Coding agent container removed |
| `TRAINING_STARTED` | Model training job started |
| `TRAINING_CANCELLED` | Model training job cancelled |
| `TRAINING_DELETED` | Model training job deleted |
| `LOCAL_FIX_SESSION_CREATED` | Local fix session created |
| `LOCAL_FIX_SESSION_REMOVED` | Local fix session removed |
| `LOCAL_FIX_COMMAND_APPROVED` | Local fix command approved for execution |
| `LOCAL_FIX_COMMAND_REJECTED` | Local fix command rejected |
| `LOCAL_FIX_FILE_WRITE` | Local fix wrote a file |
| `SEO_APP_CREATED` | User created a web SEO app |
| `ADMIN_LIST_USERS` | Admin viewed user list |
| `ADMIN_RESET_PASSWORD` | Admin flagged user for password reset |
| `ADMIN_DELETE_USER` | Admin deleted a user account |
| `ADMIN_AUTH_FAILURE` | Failed admin authentication |
| `ADMIN_SET_KOBOLD` | Admin toggled Kobold.cpp integration |
| `ADMIN_SET_OLLAMA` | Admin toggled Ollama integration |
| `ADMIN_SET_RISKY_APPS` | Admin toggled risky apps setting |
| `ADMIN_SET_AUTO_SYNC` | Admin toggled auto-sync setting |
| `ADMIN_SET_DATASET_TOKEN_LIMIT` | Admin set dataset token limit |
| `ADMIN_UPLOAD_MODEL` | Admin uploaded a GGUF model |
| `ADMIN_DOWNLOAD_MODEL` | Admin downloaded a model from HuggingFace |
| `ADMIN_DELETE_MODEL` | Admin deleted a local model |
| `ADMIN_CREATE_UNIVERSE` | Admin created a character universe |
| `ADMIN_UPDATE_UNIVERSE` | Admin updated a character universe |
| `ADMIN_DELETE_UNIVERSE` | Admin deleted a character universe |
| `ADMIN_CREATE_CHARACTER` | Admin created a character |
| `ADMIN_UPDATE_CHARACTER` | Admin updated a character |
| `ADMIN_DELETE_CHARACTER` | Admin deleted a character |
| `ADMIN_AUTO_SYNC_TRIGGER` | Auto-sync backup triggered |
| `ADMIN_AUTO_SYNC_IMPORT` | Auto-sync import triggered |

## Rate Limiting

| Scope | Limit | Window |
| ----- | ----- | ------ |
| General API (`/api/*`) | 100 requests | 15 minutes |
| Auth endpoints (`/api/auth/*`) | 10 requests | 15 minutes |
| Server-side account lockout | 5 failed attempts | 15-minute lockout |
| Client-side lockout | 5 failed attempts | 15-minute lockout |

## Data Protection

- Passwords are never stored in plain text or transmitted in plain text
- Server-side session tokens authenticate all protected API endpoints
- Session data uses `sessionStorage` (cleared on tab close)
- User data files are excluded from version control via `.gitignore`
- Account deletion permanently removes all user data and invalidates all sessions
- Audit logs are automatically rotated at 10 MB to prevent unbounded growth
- Request body size limited to 1 MB to prevent denial-of-service attacks
- Expired sessions are automatically cleaned up from server memory hourly
