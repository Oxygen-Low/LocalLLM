## 2026-03-30 - SSRF via Git Clone URLs
**Vulnerability:** Server-Side Request Forgery (SSRF) allowed probing internal services and cloud metadata by supplying `https://127.0.0.1` or `https://169.254.169.254` as a git `cloneUrl`.
**Learning:** Manual regex-based URL validation (`/^https:\/\/.../`) is often insufficient to prevent SSRF because it doesn't account for hostname resolution to private IP addresses.
**Prevention:** Always use a robust SSRF validation utility (like the existing `ssrfSafeUrlValidation` in this project) that performs DNS lookup and checks resolved IPs against a blocklist of private/reserved ranges before making outbound requests.
