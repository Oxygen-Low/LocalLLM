## 2026-04-04 - [Accessibility] Focus visible on opacity-0 elements
**Learning:** Elements hidden using `opacity-0 group-hover:opacity-100` are completely invisible to keyboard users who navigate via the Tab key because focusing on them does not trigger the hover state. This is an accessibility issue pattern specific to list actions or hidden settings in this app's components.
**Action:** When creating or modifying elements that appear on hover via `opacity-0`, always apply `focus-visible:opacity-100` alongside existing focus styling (e.g. `focus-visible:underline` or `focus-visible:ring-2`) to guarantee keyboard accessibility. Additionally, ensure they have proper ARIA attributes if they are icon-only buttons.

## 2026-04-05 - [Accessibility] ARIA State Attributes for Custom Dropdowns and Toggles
**Learning:** Custom interactive elements like dropdown triggers and toggle buttons (often styled with `ngClass` for visual states) in complex interfaces like the Coding Agent toolbar are announced merely as "buttons" by screen readers, failing to convey their dynamic state (expanded/collapsed or pressed/unpressed). This is a reusable UX pattern required across the application's design system wherever native `<select>` or `<input type="checkbox">` elements cannot be used.
**Action:** Always apply `[attr.aria-expanded]="stateVariable"` and `aria-haspopup="listbox" | "menu"` to custom dropdown toggle buttons. Apply `[attr.aria-pressed]="stateVariable"` to custom toggle buttons that retain state. This ensures screen readers announce the exact current state of these interactive components without relying on visual cues.

## 2024-04-09 - [Added missing aria-label to close buttons in datasets list]
**Learning:** Icon-only close buttons (like the `✕` character used in the datasets page to delete a row) often miss an `aria-label` which causes screen readers to either read them as 'multiplication sign' or nothing at all, breaking accessibility.
**Action:** Always ensure that icon-only buttons (`<button>` tags with no text content, including those that just use SVG or a single character like `✕`) have an explicit `[attr.aria-label]` attribute to make their function clear to assistive technologies.

## 2026-04-10 - [Accessibility] ARIA pressed states for list filters and tabs
**Learning:** Custom tabs and list filters that visually update (using `ngClass` to change backgrounds or text colors when selected) but aren't native `<input type="radio">` or `<button role="tab">` do not inherently announce their active state to screen readers. This makes it impossible for visually impaired users to know which filter or tab is currently applied.
**Action:** Always ensure that custom button controls acting as toggles or segmented tabs have an `[attr.aria-pressed]="currentState === 'value'"` attribute alongside their `ngClass` visual updates so screen readers correctly announce them as pressed/selected.
