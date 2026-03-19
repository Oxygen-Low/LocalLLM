# Security Policy

This document describes the information security practices implemented by Local.LLM, aligned with **ISO 27001:2022** Annex A controls.

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly by opening a private security advisory through our GitHub repository rather than a public issue. We will acknowledge your report within 72 hours and aim to provide a fix within 30 days.

## ISO 27001:2022 Control Mapping

### A.5 – Organisational Controls

| Control | Description | Implementation |
| ------- | ----------- | -------------- |
| A.5.1 | Policies for information security | This document; privacy policy (`/privacy`); terms of service (`/terms`) |
| A.5.15 | Access control | Role-based access (admin/user); `authGuard` and `adminGuard` route guards |
| A.5.17 | Authentication information | PBKDF2-hashed passwords (100 000 iterations, 32-byte key, per-user salt); client-side SHA-256 pre-hashing; forced password reset support |
| A.5.23 | Information security for cloud services | HTTPS-only transport; CSP headers; SSRF protection for outbound requests |
| A.5.34 | Privacy and protection of PII | UK GDPR-compliant privacy policy; minimal data collection; account deletion |

### A.8 – Technological Controls

| Control | Description | Implementation |
| ------- | ----------- | -------------- |
| A.8.5 | Secure authentication | Password complexity rules (≥8 chars, upper, lower, digit, special); account lockout after 5 failed attempts (15-min window); 30-min inactivity timeout |
| A.8.9 | Configuration management | Helmet security headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy); `Cache-Control: no-store` on API responses; `Permissions-Policy` restricting camera, microphone, geolocation, payment |
| A.8.12 | Data leakage prevention | Content Security Policy restricting resource origins; `object-src 'none'`; `base-uri 'self'` |
| A.8.15 | Logging | Persistent server-side audit log (`data/audit.log`) recording login success/failure, signup, password changes, account deletions, and admin actions with timestamps, request IDs, usernames, and source IPs; client-side security event logging via `SecurityLoggerService` |
| A.8.16 | Monitoring activities | Structured JSON audit log entries enable integration with SIEM tools; X-Request-Id header on every response for end-to-end request tracing |
| A.8.24 | Use of cryptography | PBKDF2 with SHA-256 for password storage; SHA-256 client-side pre-hashing; HTTPS with TLS certificates; `crypto.timingSafeEqual` for constant-time comparison |
| A.8.25 | Secure development lifecycle | Server-side input validation (username length/format); rate limiting on all API and auth endpoints; SSRF protection with IP-range blocking and DNS validation |
| A.8.26 | Application security requirements | Express Rate Limiter (100 req/15 min general, 10 req/15 min auth); timing-safe password comparison; no sensitive data in error responses |

## Cryptographic Standards

| Purpose | Algorithm | Parameters |
| ------- | --------- | ---------- |
| Password storage | PBKDF2 | SHA-256, 100 000 iterations, 32-byte derived key, 16-byte random salt |
| Client pre-hash | SHA-256 | Single pass before transmission over HTTPS |
| Session IDs | `crypto.randomUUID()` | UUID v4 via Node.js CSPRNG |
| Admin password generation | `crypto.randomBytes(24)` | 192-bit entropy, base64url-encoded |

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
| `LOGIN_FAILURE` | Failed authentication attempt |
| `SIGNUP_SUCCESS` | New account created |
| `SIGNUP_FAILURE` | Account creation rejected |
| `PASSWORD_CHANGED` | Password updated successfully |
| `PASSWORD_CHANGE_FAILURE` | Password change rejected |
| `ACCOUNT_DELETED` | Account removed |
| `ADMIN_LIST_USERS` | Admin viewed user list |
| `ADMIN_RESET_PASSWORD` | Admin flagged user for password reset |
| `ADMIN_DELETE_USER` | Admin deleted a user account |
| `ADMIN_AUTH_FAILURE` | Failed admin authentication |

## Rate Limiting

| Scope | Limit | Window |
| ----- | ----- | ------ |
| General API (`/api/*`) | 100 requests | 15 minutes |
| Auth endpoints (`/api/auth/*`) | 10 requests | 15 minutes |
| Client-side lockout | 5 failed attempts | 15-minute lockout |

## Data Protection

- Passwords are never stored in plain text or transmitted in plain text
- Session data uses `sessionStorage` (cleared on tab close)
- User data files are excluded from version control via `.gitignore`
- Account deletion permanently removes all user data from the server
- Audit logs are automatically rotated at 10 MB to prevent unbounded growth
