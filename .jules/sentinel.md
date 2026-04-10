## $(date +%Y-%m-%d) - [Sentinel] Fix Command Injection in Web SEO App Cloning
**Vulnerability:** A command injection vulnerability existed in `POST /api/web-seo/check/:id` due to the use of string interpolation with user input (`appEntry.cloneUrl`) directly in a shell command. Even though the URL was verified against SSRF, shell metacharacters like `$()` were able to pass through the validation.
**Learning:** Checking for valid URLs and SSRF does not mean the URL is safe for execution via a shell. Shell metacharacters (`$`, ``` ` ```) inside double quotes are interpreted by `bash`. Enclosing variables in double quotes (`"..."`) is insufficient protection against command injection inside `bash -c`.
**Prevention:** Always use safe methods like base64 encoding/decoding when interpolating user-controlled strings into shell execution scripts (e.g. `$(echo '<b64>' | base64 -d)`), or avoid shell execution entirely.

## 2024-05-18 - Fix command injection in container file upload
**Vulnerability:** Command injection in `PUT /api/coding-agent/containers/:id/file` endpoint where `filePath` was directly interpolated into a `bash -c` command used with `execFileSync`. An attacker could break out of the string context and execute arbitrary shell commands inside the Docker container.
**Learning:** Even when the file content is safely passed via Base64 decoding, interpolating the target file path directly into the bash command string is still vulnerable to command injection.
**Prevention:** Always Base64-encode all user-controlled variables (including file paths) in Node.js before interpolating them into `bash -c` strings, and dynamically decode them within the bash script using `$(echo '${b64Var}' | base64 -d)`.
## 2026-04-07 - [Sentinel] Fix JS Injection in Playwright Script
**Vulnerability:** JavaScript code injection in the `POST /api/web-seo/check/:id` endpoint where the user-controlled `appEntry.url` (stored in `targetUrl`) was directly interpolated into a generated Playwright script (`await page.goto('${targetUrl}', ...)`).
**Learning:** Checking for valid URLs and SSRF does not mean the URL is safe to embed directly into a string literal within dynamically generated JavaScript. A URL can contain a single quote (`'`), which allows an attacker to break out of the string and execute arbitrary Node.js code within the container.
**Prevention:** Always Base64-encode user-controlled variables in the host Node.js process and decode them dynamically within the generated script (e.g., `Buffer.from('${targetUrlB64}', 'base64').toString('utf-8')`) to prevent code injection via unescaped string literals.

## 2026-04-10 - [Sentinel] Fix SSRF Bypass in isPrivateIP Filter
**Vulnerability:** The SSRF protection in `isPrivateIP` was bypassable using expanded IPv6 representations of loopback (e.g., `0:0:0:0:0:0:0:1`) and unspecified addresses, as well as certain IPv4-mapped IPv6 formats. The original filter only checked for the compact `::1` and `::` forms.
**Learning:** SSRF filters that rely on simple string matching for IP addresses are prone to bypasses via alternative representations (expanded vs compact IPv6, different IPv4 notations). A robust filter must account for the flexibility of IP address parsers.
**Prevention:** Use comprehensive regular expressions or address normalization to detect all valid representations of local/private ranges. Specifically, ensure IPv6 loopback and unspecified addresses are caught regardless of leading zeros or expansion, and robustly handle IPv4-mapped IPv6 addresses.
