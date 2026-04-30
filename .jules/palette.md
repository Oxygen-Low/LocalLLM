## Accessibility Optimizations - Icon Buttons

- **Issue:** The "remove relationship" buttons (✖) in `src/app/pages/admin.page.ts` lacked proper accessibility attributes (`type="button"`, `aria-label`, and `title`) which makes them difficult to use for screen readers and users who navigate by keyboard, as they also lacked explicit focus states.
- **Fix:** Added `type="button"`, `aria-label="Remove relationship"`, `title="Remove relationship"`, and keyboard focus classes (`outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded px-1`) to the buttons.
- **Impact:** Improved accessibility for screen readers and keyboard users, preventing accidental form submissions and providing clear interactive feedback.
- **Verification:** Verified code changes are correctly rendered via file inspection and ensured frontend tests passed.
- **Issue:** Hundreds of interactive `<button>` elements across the Angular frontend lacked the `type="button"` attribute, which could lead to unintended form submissions or other side effects when placed inside or near forms.
- **Fix:** Added `type="button"` to all relevant buttons throughout the `src/app/` directory to ensure they strictly behave as interactive UI triggers without submitting forms.
- **Impact:** Prevented accidental form submissions, aligning the frontend's button implementations with robust accessibility and functional best practices.
- **Verification:** Used `git diff` to verify all affected elements correctly incorporated the `type="button"` attribute and passed `pnpm test --watch=false`.
