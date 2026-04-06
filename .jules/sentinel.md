## $(date +%Y-%m-%d) - [Sentinel] Fix Command Injection in Web SEO App Cloning
**Vulnerability:** A command injection vulnerability existed in `POST /api/web-seo/check/:id` due to the use of string interpolation with user input (`appEntry.cloneUrl`) directly in a shell command. Even though the URL was verified against SSRF, shell metacharacters like `$()` were able to pass through the validation.
**Learning:** Checking for valid URLs and SSRF does not mean the URL is safe for execution via a shell. Shell metacharacters (`$`, ``` ` ```) inside double quotes are interpreted by `bash`. Enclosing variables in double quotes (`"..."`) is insufficient protection against command injection inside `bash -c`.
**Prevention:** Always use safe methods like base64 encoding/decoding when interpolating user-controlled strings into shell execution scripts (e.g. `$(echo '<b64>' | base64 -d)`), or avoid shell execution entirely.

## 2024-05-18 - Fix command injection in container file upload
**Vulnerability:** Command injection in `PUT /api/coding-agent/containers/:id/file` endpoint where `filePath` was directly interpolated into a `bash -c` command used with `execFileSync`. An attacker could break out of the string context and execute arbitrary shell commands inside the Docker container.
**Learning:** Even when the file content is safely passed via Base64 decoding, interpolating the target file path directly into the bash command string is still vulnerable to command injection.
**Prevention:** Always Base64-encode all user-controlled variables (including file paths) in Node.js before interpolating them into `bash -c` strings, and dynamically decode them within the bash script using `$(echo '${b64Var}' | base64 -d)`.
