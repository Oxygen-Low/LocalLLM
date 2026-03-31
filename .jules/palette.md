## 2026-03-31 - Missing ARIA Labels on Icon-Only Buttons in Complex Pages
**Learning:** Found multiple icon-only buttons (like dropdown toggles, delete buttons, send message buttons) lacking `aria-label` attributes on complex, dynamic pages like `coding-agent.page.ts`.
**Action:** Always verify icon-only buttons for accessibility, especially when they represent interactive actions in dropdowns, lists, or input fields. Ensure both `aria-label` and `title` attributes are set for screen reader and hover tooltip support.
