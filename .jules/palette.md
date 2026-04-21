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

## 2026-04-11 - [Accessibility] Added missing aria-expanded and aria-haspopup on mobile navbar
**Learning:** Interactive menu toggle buttons must include `[attr.aria-expanded]` to reflect their open/closed state and `aria-haspopup` to indicate they open a menu to screen readers. Failing to do so prevents visually impaired users from knowing the menu state.
**Action:** Applied `[attr.aria-expanded]="mobileMenuOpen()"` and `aria-haspopup="menu"` to the mobile menu button in `navbar.component.ts` to guarantee compliance with custom interactive elements guidelines.

## 2026-04-15 - [Accessibility] Added missing aria-pressed to custom toggle buttons
**Learning:** Custom toggle buttons and selector tabs that use `ngClass` to visually indicate their active state do not automatically announce their state to screen readers. This makes it impossible for visually impaired users to know which option is currently selected.
**Action:** Always ensure that custom button controls acting as toggles or segmented tabs have an `[attr.aria-pressed]="condition"` attribute alongside their `ngClass` visual updates so screen readers correctly announce them as pressed/selected.

## 2024-05-15 - [Accessibility] Added missing aria-pressed to activeTab and showAgentTerminal toggle buttons
**Learning:** In `coding-agent.page.ts`, tab toggle buttons (like "Editor", "Terminal", "Preview") and other toggle buttons (like "Agent Terminal", "Memories") were using `ngClass` to visually indicate their active state, but lacked the `[attr.aria-pressed]` attribute, failing to communicate their state to screen readers.
**Action:** Applied `[attr.aria-pressed]` to the relevant buttons alongside their visual `ngClass` toggles so screen readers will announce their currently pressed state correctly.

## 2024-05-20 - [Accessibility] Added missing type="button" attributes to interactive buttons
**Learning:** By default, HTML `<button>` elements have a `type` of `"submit"`. If these buttons are ever nested within a form or if the DOM structure changes to include one, clicking them will inadvertently trigger a form submission, leading to unexpected page reloads or broken state. This was observed across multiple custom components like `language-selector.component.ts`, `app-card.component.ts`, and `navbar.component.ts`.
**Action:** Always explicitly declare `type="button"` on all interactive button elements that are meant to trigger JavaScript actions (e.g., toggling a dropdown or navigating) rather than submitting a form.
