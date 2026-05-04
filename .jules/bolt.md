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

## Race Condition Fix - Synchronized Archive Operations

- **Issue:** While the re-read after `await` in `performArchiveRepo`, `performUnarchiveRepo`, and dataset archive/unarchive endpoints mitigated some race conditions, multiple concurrent requests could still re-read the metadata file before any of them wrote their updates, leading to lost writes.
- **Fix:** Implemented per-user in-process mutexes (`withUserReposLock` and `withUserDatasetsLock`) that serialize the read-modify-write window after the async tar operations complete. These locks ensure that only one request at a time can re-read, modify, and write the metadata files for a given user's repos or datasets. The implementation follows the same pattern as the existing `withModelsLock` mutex used for model registry operations.
- **Implementation Details:**
  - Added `_userReposLocks` and `_userDatasetsLocks` Map structures keyed by username
  - Each lock serializes the critical section: re-read metadata → modify state → write metadata
  - Locks are acquired immediately before re-reading after the tar command completes
  - Pattern ensures that concurrent archive/unarchive operations for the same user execute their metadata updates sequentially
- **Limitations:** This solution provides in-process synchronization suitable for single-instance deployments. For multi-process or distributed deployments, consider using file locks (flock), distributed locks (Redis), or a proper database with atomic transactions.
- **Impact:** Eliminates lost writes during concurrent archive/unarchive operations while maintaining the async performance benefits.
- **Verification:** Code review confirmed proper lock acquisition and release patterns matching existing mutex implementations.
