# Bolt's Journal - Critical Learnings Only

## 2025-01-24 - Initializing Journal
**Learning:** Initializing the journal to track critical performance learnings.
**Action:** Keep this journal updated with significant performance insights discovered during optimizations.

## 2025-01-24 - PBKDF2 as a synchronous bottleneck
**Learning:** In this Node.js backend, `crypto.pbkdf2Sync` with 100,000 iterations takes ~60ms. Since it is a synchronous operation, it blocks the event loop, severely limiting concurrency and increasing latency for every encrypted operation (API keys, chats).
**Action:** Implement in-memory caching for derived keys (`Map`). Ensure cache invalidation on username changes and account deletions to maintain correctness.
