# Fix sign-in, page loading glitches, and speed

The pasted TypeScript errors point at files that don't exist in this project (src/pages/Index.tsx), so they are stale and need no change.

## 1. Sign-in not working (admin + traders)
- Reproduce in a test browser at your screen size: fill email/password, click Sign in, capture console and network.
- Likely causes to check (diagnosis not yet confirmed): Sign in button not submitting on mobile width, errors swallowed without a message, or the session not being picked up before redirect to dashboard/admin.
- Fix whatever the reproduction shows, and always show a clear error message ("wrong password", "confirm your email", etc.) and a loading state on the button.
- Create the admin account with a strong password you choose, give it the admin role, and confirm it opens the admin panel.
- Verify trader sign-up then sign-in end to end.

## 2. Home page glitch (reviews show first, rest loads later)
- Render the home page sections on first load so the page doesn't appear in pieces; add fixed-height placeholders for sections that load data (plans, traders) so content doesn't jump.
- Stop the reviews/traders strip from flashing before the hero.

## 3. Old page stays 1-2 seconds on navigation
- Show the new page immediately with a small loading state instead of waiting for data, and preload pages when hovering/tapping menu links.
- Scroll to top on page change.

## 4. Our Traders in place of certificates
- Already done; confirm the certificate section is gone from home and Our Traders shows there.

## 5. Speed
- Lazy-load heavy parts (admin, dashboard, video players), defer video embeds until clicked, cache plans/settings data.

## Technical details
- Files: src/views/Login.jsx, src/context/AuthContext.jsx, src/views/Home.jsx, src/routes/__root.tsx / src/router.tsx (defaultPendingMs, preload: "intent"), src/lib/router-compat.
- Verify each fix with Playwright at 502x674 before finishing.
