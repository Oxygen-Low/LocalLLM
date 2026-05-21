
## `input` Class Issue (Characters Page)
- Encountered missing `.input` CSS class reference in `characters.page.ts`.
- The application intentionally does not define `.input` globally in `styles.css`.
- Resolved by adopting inline TailwindCSS utility classes (`w-full px-4 py-2 rounded-lg border border-secondary-200 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-all`) to maintain consistency and accessibility across form fields.
- Also, updated the `<button>` tags on the same page to explicitly include `type="button"` to ensure correct accessibility constraints and prevent default `submit` behaviors.
