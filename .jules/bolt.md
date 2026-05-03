## Performance Optimizations - ChangeDetectionStrategy.OnPush

- **Issue:** Angular's default change detection strategy checks the entire component tree on every browser event, which can lead to unnecessary DOM re-renders and poor performance, especially for presentational or static pages (e.g., documentation, terms, privacy).
- **Fix:** Applied `ChangeDetectionStrategy.OnPush` to 15 unoptimized Angular components (including `App` component and various Docs pages). This instructs Angular to only run change detection when a component's inputs change or an event is triggered from within the component itself.
- **Impact:** Significantly reduces the number of change detection cycles triggered by global events or unrelated component updates, leading to faster rendering and a more responsive UI.
- **Verification:** Ensured all frontend tests passed (`pnpm test --watch=false`) after applying the optimization.

## Performance Optimizations - Asynchronous Archiving

- **Issue:** The backend `server.js` used synchronous `execFileSync` for heavy `tar` archiving operations when archiving datasets and repositories. This blocked the Node.js event loop for up to 3 minutes, halting all other server requests and causing severe performance degradation.
- **Fix:** Refactored `performArchiveRepo`, `performUnarchiveRepo`, and the `/api/datasets/:id/archive` and `/api/datasets/:id/unarchive` routes to use the asynchronous `runCommandAsync('tar', ...)`. Crucially, added re-read logic for the shared state (`datasets` and `repos` arrays) immediately after the `await` to prevent read-modify-write race conditions (data-loss) that can occur when the event loop is freed during long-running async operations.
- **Impact:** The event loop is no longer blocked during long archive operations, massively improving server responsiveness and throughput for concurrent requests without introducing data regressions.
- **Verification:** Ensured all backend tests passed (`NODE_ENV=test node --test server/server.test.js`) and Code Review verified the fix for race conditions.
