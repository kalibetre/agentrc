# Performance review questions

Flag only what you can reason about with a cost estimate; "might be slow" is not
a finding.

## Database and I/O
- N+1: a query inside a loop over query results.
- New filter, sort or join without a supporting index.
- Unbounded `SELECT` or list endpoint without pagination or a limit.
- Slow or network work inside a transaction or lock.
- Whole files or large payloads loaded into memory instead of streamed.

## Algorithms and memory
- O(n^2) or worse on input that can grow, especially in a hot path.
- Allocation or regex compilation inside a hot loop.
- Unbounded caches, queues, listeners or timers (leaks); missing cleanup.

## Concurrency
- Blocking calls on an async or request path.
- Sequential awaits that are independent and could run in parallel.
- Missing timeouts; retries without backoff or a cap.

## Frontend
- Needless re-renders, large bundles, unoptimised images, layout shift,
  unvirtualised long lists.

## Evidence
- Say how to measure it (benchmark, profile, query plan) and give a rough cost.
