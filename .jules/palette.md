## 2026-03-30 - [A11y: Icon-only Button Enhancement]
**Learning:** Icon-only buttons (like delete, retry, edit) in interactive lists often lack ARIA labels, making them unusable for screen reader users. Additionally, using `opacity-0` for hover-only actions hides them from keyboard users who tab through the interface unless `focus-visible` classes are applied.
**Action:** Always add `aria-label` and `title` to icon-only buttons. Use `focus-visible:opacity-100` alongside `group-hover:opacity-100` to ensure interactive elements are discoverable via keyboard navigation.
