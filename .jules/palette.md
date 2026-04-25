## Accessibility Optimizations - Icon Buttons

- **Issue:** The "remove relationship" buttons (✖) in `src/app/pages/admin.page.ts` lacked proper accessibility attributes (`type="button"`, `aria-label`, and `title`) which makes them difficult to use for screen readers and users who navigate by keyboard, as they also lacked explicit focus states.
- **Fix:** Added `type="button"`, `aria-label="Remove relationship"`, `title="Remove relationship"`, and keyboard focus classes (`outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded px-1`) to the buttons.
- **Impact:** Improved accessibility for screen readers and keyboard users, preventing accidental form submissions and providing clear interactive feedback.
- **Verification:** Verified code changes are correctly rendered via file inspection and ensured frontend tests passed.
