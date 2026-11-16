# Persist trader orders, positions, and KYC

## User-facing outcome
- Orders placed in the terminal, resulting open positions, and submitted KYC details remain available after refresh and sign-in.
- Trading orders remain simulated practice orders; this change does not connect to a broker or place live market trades.
- KYC documents are uploaded to private storage and only the signed-in trader can access their own files.

## Implementation
1. Extend the existing authenticated API and private document store with owner-scoped order and position reads/writes. Validate order inputs on the server and update a trader’s aggregated position when a simulated market order executes.
2. Replace sample records on the terminal, orders, and positions screens with records loaded from and saved to the API; provide clear empty/loading/error states.
3. Connect KYC form loading and submission to the existing user profile persistence. Upload selected documents to a private bucket with storage access restricted to each signed-in user’s folder, and persist document names/paths with KYC data.
4. Add focused tests for order validation and user ownership, update the roadmap and architecture notes, then verify build and tests.

## Technical details
- Keep the existing `public.docs` server-only document store; add no new application table and do not expose service-role access to the browser.
- Enforce ownership using the authenticated user resolved from the bearer token, never a client-supplied user ID.
- The reported `src/pages/Index.tsx` TypeScript diagnostic is not a source target in this migrated repository; avoid unrelated edits unless the current checker reproduces it.