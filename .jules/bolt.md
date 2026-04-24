## Performance Optimizations - ChangeDetectionStrategy.OnPush

- **Issue:** Angular's default change detection strategy checks the entire component tree on every browser event, which can lead to unnecessary DOM re-renders and poor performance, especially for presentational or static pages (e.g., documentation, terms, privacy).
- **Fix:** Applied `ChangeDetectionStrategy.OnPush` to 15 unoptimized Angular components (including `App` component and various Docs pages). This instructs Angular to only run change detection when a component's inputs change or an event is triggered from within the component itself.
- **Impact:** Significantly reduces the number of change detection cycles triggered by global events or unrelated component updates, leading to faster rendering and a more responsive UI.
- **Verification:** Ensured all frontend tests passed (`pnpm test --watch=false`) after applying the optimization.
