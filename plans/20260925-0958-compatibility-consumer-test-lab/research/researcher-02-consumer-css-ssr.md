# Consumer CSS & SSR Testing Report

## 1. Detect CSS Leak by Code (Not Just Visual)

**Conclusion:** Use `getComputedStyle` snapshots pre/post library import; Playwright's CDP API can read cascade layers but jsdom cannot evaluate styles within `@layer`.

**Pattern (Playwright):**
```javascript
// Capture baseline before library import
const baseline = new Map();
for (const el of document.querySelectorAll('[data-test]')) {
  baseline.set(el, {
    bg: getComputedStyle(el).backgroundColor,
    color: getComputedStyle(el).color,
    cssText: getComputedStyle(el).cssText
  });
}

// Import library CSS, re-measure
document.head.appendChild(styleTag);
for (const [el, orig] of baseline.entries()) {
  const current = getComputedStyle(el);
  if (current.backgroundColor !== orig.bg) {
    console.error(`CSS leak: ${el.id} background changed`);
  }
}
```

**CDP Access:** `CSS.getComputedStyleForNode(nodeId)` returns full resolved cascade via DevTools Protocol, but requires explicit nodeId lookup. Playwright doesn't expose raw CDP for CSS inspection - use `page.evaluate()` instead [[Reference: Playwright issue #20321](https://github.com/microsoft/playwright/issues/20321)].

**@layer Assertion Limit:** jsdom's CSSOM cannot read styles inside `@layer` via `getComputedStyle` [[Reference: giinrecord issue #498](https://github.com/uonoko1/giinrecord/issues/498)] - only workaround is headless Chromium (`test-real-styles` npm package).

---

## 2. Next.js App Router: 'use client' Rules

**Conclusion:** Library MUST have `'use client'` only if it directly uses hooks/browser APIs. Consumer wrapping is NOT sufficient - it wraps the import, not the module's internal hooks.

**Official Rule:** Add `'use client'` at **module entry** if component uses:
- React hooks: `useState`, `useEffect`, `useContext`, custom hooks built on these
- Event handlers: `onClick`, `onChange`, etc.
- Browser APIs: `window`, `localStorage`, browser-only packages

**Typical Error (No 'use client'):**
```
Error: Client component requires 'use client': 
"use client" directive must be at top of file @radix-ui/react-accordion uses useState internally
```

**Hydration Mismatch Signal:** React logs `"Hydration failed because server rendered HTML didn't match the client"` - indicates library renders different content on server vs client without `useEffect` guard [[Reference: Next.js docs](https://nextjs.org/docs/app/api-reference/directives/use-client)].

---

## 3. Visual Regression: macOS vs Linux Container

**Conclusion:** Baseline MUST be captured INSIDE container. Playwright's `maxDiffPixelRatio` + `threshold` + Docker image fix font rendering.

**Stable Config:**
```javascript
expect(page).toHaveScreenshot('component.png', {
  maxDiffPixelRatio: 0.05,  // Allow 5% pixel variance
  threshold: 0.2,           // Color diff tolerance (YIQ space)
  animations: 'disabled',   // Critical: disable animations
  mask: [page.locator('[data-flaky-animation]')]  // Mask flaky areas
});
```

**Docker Setup:**
- Baseline: `docker run -it mcr.microsoft.com/playwright && pnpm test:update-snapshots`
- CI: Same Docker image for consistency. Fonts, antialiasing, and rendering are deterministic inside container [[Reference: Playwright visual testing guide](https://qaskills.sh/blog/playwright-visual-regression-testing-guide)].

**Limit:** Individual font metrics still vary slightly - use `maxDiffPixelRatio` instead of strict pixel matching for cross-OS screenshots.

---

## 4. Test CSS When Consumer Has NO Tailwind

**Conclusion:** Assert via `getComputedStyle` that utilities are resolved; if missing, snapshot comparison fails. No automation for missing utility detection - requires explicit CSS property assertion.

**Pattern:**
```javascript
const el = page.locator('.component');
const computed = await el.evaluate(el => {
  const style = getComputedStyle(el);
  return {
    display: style.display,      // Should be 'flex' if @apply works
    padding: style.padding,      // Should resolve to actual value
    hasUnresolvedClass: el.className.includes('size-2')  // Tailwind class present?
  };
});

expect(computed.display).toBe('flex');  // Fails if @apply didn't run
```

**Alternative:** Use screenshot diff - if CSS utilities didn't compile, component renders unstyled, visual regression fails [[Reference: Playwright getComputedStyle docs](https://www.lambdatest.com/automation-testing-advisor/javascript/playwright-internal-getComputedStyle)].

**Limit:** Can't distinguish "CSS didn't load" from "utility compiled to same value as default" - need visual regression as safety net.

---

## 5. SSR Testing Lightweight (Node renderToString, Not Next)

**Conclusion:** `react-dom/server.renderToString()` catches window/DOM references immediately; run in Node, log stderr for references. NOT a full hydration test - Next.js adds state-sync validation that bare renderToString misses.

**Script:**
```javascript
import { renderToString } from 'react-dom/server';
import { Component } from './component.tsx';

try {
  const html = renderToString(<Component />);
  console.log('✓ SSR safe: no window/document errors');
} catch (err) {
  if (err.message.includes('window is not defined') || 
      err.message.includes('Cannot use hook')) {
    console.error('✗ SSR unsafe:', err.message);
    process.exit(1);
  }
}
```

**What It Catches:** Missing `useEffect` guards, direct `window`/`document` calls, browser-only imports at top level.

**What It Misses:** State mismatch between server render and client hydration, async state initialization, timing bugs. Full validation requires Next.js or Remix test harness [[Reference: React hydration guide](https://www.propelauth.com/post/understanding-hydration-errors)].

**Limit:** Passes non-interactive components (no hooks) but misses component lifecycle mismatches - use for smoke test, not comprehensive hydration validation.

---

## Summary: Automation Roadmap

| Issue | Detection | Tool | Limitation |
|-------|-----------|------|-----------|
| CSS leak | getComputedStyle snapshot | Playwright | Needs baseline capture |
| use client missing | Render Next.js app | Next.js test app | Requires full app |
| Visual flake | Baseline in Docker | Playwright Docker | Font metrics still vary |
| Missing Tailwind utilities | getComputedStyle + visual | Playwright | Can't distinguish "didn't load" vs "same value" |
| SSR unsafe | renderToString in Node | react-dom/server | Misses hydration state mismatch |

Sources:
- [Next.js 'use client' directive official](https://nextjs.org/docs/app/api-reference/directives/use-client)
- [Playwright issue #20321: CSS variable testing](https://github.com/microsoft/playwright/issues/20321)
- [giinrecord issue #498: @layer CSSOM limitation](https://github.com/uonoko1/giinrecord/issues/498)
- [Playwright visual regression guide 2026](https://qaskills.sh/blog/playwright-visual-regression-testing-guide)
- [React hydration mismatch debugging](https://www.propelauth.com/post/understanding-hydration-errors)
- [Playwright getComputedStyle reference](https://www.lambdatest.com/automation-testing-advisor/javascript/playwright-internal-getComputedStyle)
