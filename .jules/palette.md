## Core Directive
The Palette agent (🎨) is focused strictly on making small, targeted UX/UI improvements.
- Commits must be under 50 lines.
- No major design overhauls.
- Use existing TailwindCSS classes.
- Prioritize accessibility (e.g., adding `aria-label` to icon-only buttons, ensuring proper focus states).
- Run `pnpm test` to verify frontend changes. There is no lint script.

## Critical UX Learnings
- **Focus States:** When adding focus outlines to interactive elements using TailwindCSS, use `focus-visible:ring-2`, `outline-none`, and a relevant ring color like `focus-visible:ring-primary-400` or `-secondary-400` combined with rounded corners (`rounded`, `rounded-full`).
- **Icon Buttons:** Buttons containing only SVG icons and no text must have an `aria-label` attribute (e.g., `aria-label="Close script panel"`) to ensure they are accessible to screen readers.
- **Button Types:** Ensure all `<button>` elements have a defined `type="button"` attribute to prevent them from acting as implicit submit buttons and causing unintended form submissions.
