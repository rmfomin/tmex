# Style SCSS Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `public/style.css` to SCSS without changing runtime behavior, while preserving `dist/style.css` as the generated asset consumed by the new tab page.

**Architecture:** Keep the page contract unchanged: [public/newtab.html](/Users/romanfomin/rmfomin-projects/tmex/public/newtab.html#L7) must continue to load `style.css`. Introduce an SCSS compilation step in webpack, generate `dist/style.css`, and split the existing stylesheet into partials incrementally without removing or renaming any selectors.

**Tech Stack:** Webpack 5, TypeScript, React 18, Sass (`sass`, `sass-loader`), copy-webpack-plugin, Jest, Node filesystem checks.

---

## Chunk 1: Build Pipeline

### Task 1: Add Sass toolchain dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the failing expectation to the plan notes**

Expectation: the repo currently has no `sass` or `sass-loader`, so webpack cannot compile `.scss`.

- [ ] **Step 2: Update dev dependencies**

Add:

```json
"sass": "^1.x",
"sass-loader": "^16.x"
```

Do not remove existing dependencies.

- [ ] **Step 3: Verify manifest and script surface remains unchanged**

Run: `cat package.json`
Expected: existing `build`, `watch`, and `watch2` scripts are unchanged except for added Sass dependencies.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "build: add sass toolchain dependencies"
```

### Task 2: Teach webpack to compile `public/style.scss` into `dist/style.css`

**Files:**
- Modify: `webpack/webpack.common.js`

- [ ] **Step 1: Write down the failing behavior**

Current behavior: `CopyPlugin` copies `public/style.css` directly to `dist/style.css`; no compilation path exists for SCSS.

- [ ] **Step 2: Add a webpack rule for `.scss` assets**

Use `sass-loader` in a targeted rule. Keep the implementation narrow and explicit so it only covers the stylesheet migration work.

Recommended shape:

```js
{
  test: /\.scss$/,
  type: "asset/resource",
  generator: {
    filename: "[name].css",
  },
  use: [
    {
      loader: "sass-loader",
      options: {
        sourceMap: false,
      },
    },
  ],
}
```

If the exact loader chain needs adjustment for webpack asset emission semantics, keep the output contract the same: `dist/style.css`.

- [ ] **Step 3: Add `style` as an explicit entry**

Add an entry that points to `public/style.scss` and emits `dist/style.css` while leaving existing `newtab` and `background` entries untouched.

- [ ] **Step 4: Stop copying the legacy CSS source as a static file**

Adjust `CopyPlugin` patterns so `public/style.css` is no longer copied once the compiled output is in place. Keep copying `fonts.css`, `canvas.css`, HTML, images, locale files, and manifests exactly as before.

- [ ] **Step 5: Run a development build**

Run: `npm run build`
Expected: success, with `dist/style.css` present and no duplicate asset conflict for `style.css`.

- [ ] **Step 6: Commit**

```bash
git add webpack/webpack.common.js package.json
git commit -m "build: compile newtab styles from scss"
```

## Chunk 2: Source Migration

### Task 3: Create the SCSS entrypoint and variables partial

**Files:**
- Create: `public/style.scss`
- Create: `public/scss/_variables.scss`

- [ ] **Step 1: Create the SCSS entrypoint**

Create `public/style.scss` as the single stylesheet source for the new tab page. At first it should only assemble partials in the same order they are migrated.

Low-risk starting point:

```scss
@import "./scss/variables";
@import "./scss/base";
@import "./scss/layout";
@import "./scss/components";
@import "./scss/modals";
```

Use `@import` for the first migration pass if needed to preserve global ordering with minimal semantic change. Converting to `@use` can be deferred to a later refactor.

- [ ] **Step 2: Extract the CSS custom property blocks**

Move the current `:root` block and `.dark-theme` block from `public/style.css` into `public/scss/_variables.scss` unchanged except for formatting.

- [ ] **Step 3: Leave all selectors and variable names untouched**

Do not rename CSS variables, class names, or reorder declarations inside the extracted blocks.

- [ ] **Step 4: Commit**

```bash
git add public/style.scss public/scss/_variables.scss
git commit -m "refactor: add scss entrypoint and variables partial"
```

### Task 4: Mechanically split the remaining stylesheet into partials

**Files:**
- Create: `public/scss/_base.scss`
- Create: `public/scss/_layout.scss`
- Create: `public/scss/_components.scss`
- Create: `public/scss/_modals.scss`
- Modify: `public/style.css`
- Modify: `public/style.scss`

- [ ] **Step 1: Partition the current stylesheet by contiguous sections**

Split the existing file mechanically, not conceptually. Preserve rule order by moving contiguous ranges into partials. Avoid interleaving selectors across files during the first pass.

Suggested mapping:
- `_base.scss`: `html`, `body`, resets, typography, helpers
- `_layout.scss`: `.app`, major containers, sidebar, top bar, bookmarks layout
- `_components.scss`: buttons, dropdowns, folder items, toolbar, canvas-adjacent UI
- `_modals.scss`: modal wrappers, import dialogs, settings dialogs

- [ ] **Step 2: Keep a temporary reference copy until the build passes**

Either:
- rename `public/style.css` to `public/style.legacy.css`, or
- keep it in place during the split but ensure webpack no longer uses it for output.

Do not delete the source until the generated SCSS output is verified to match behavior.

- [ ] **Step 3: Update the SCSS entrypoint imports in the same order as the original file**

Ordering matters because the original stylesheet is monolithic and may rely on later overrides.

- [ ] **Step 4: Run a build after each major chunk move**

Run: `npm run build`
Expected: success after each move; if a move introduces a build failure, revert only that chunk and re-split more narrowly.

- [ ] **Step 5: Finalize the migration state**

At the end of the task, either:
- remove `public/style.css`, or
- keep it as `public/style.legacy.css` for audit/reference if the team wants a safer immediate rollback path.

Recommendation: keep `public/style.legacy.css` for one transition cycle, then remove it in a later cleanup PR.

- [ ] **Step 6: Commit**

```bash
git add public/style.scss public/scss public/style.legacy.css
git commit -m "refactor: split style css into scss partials"
```

## Chunk 3: Regression Checks

### Task 5: Add a smoke test for emitted CSS asset

**Files:**
- Create: `src/__tests__/buildStyleAsset.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

Create a Jest test that asserts the generated asset path exists after a build:

```ts
import fs from "fs";
import path from "path";

describe("style build asset", () => {
  it("expects dist/style.css to exist after build", () => {
    const cssPath = path.join(__dirname, "../../dist/style.css");
    expect(fs.existsSync(cssPath)).toBe(true);
  });
});
```

- [ ] **Step 2: Make the test deterministic**

Add a dedicated script if needed, for example:

```json
"test:build-style": "npm run build && npx jest src/__tests__/buildStyleAsset.test.ts"
```

Do not change the default `test` script unless there is a clear need.

- [ ] **Step 3: Run the targeted test**

Run: `npm run test:build-style`
Expected: PASS, confirming that the SCSS pipeline emits `dist/style.css`.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/buildStyleAsset.test.ts package.json
git commit -m "test: verify compiled style asset is emitted"
```

### Task 6: Add a smoke test for critical selectors

**Files:**
- Create: `src/__tests__/styleSelectors.test.ts`

- [ ] **Step 1: Write the failing test**

Read `dist/style.css` and assert the presence of several critical selectors that cover major UI surfaces:

```ts
import fs from "fs";
import path from "path";

describe("compiled style selectors", () => {
  it("contains critical newtab selectors", () => {
    const css = fs.readFileSync(
      path.join(__dirname, "../../dist/style.css"),
      "utf8",
    );

    expect(css).toContain(".app");
    expect(css).toContain(".bookmarks-menu");
    expect(css).toContain(".sidebar");
    expect(css).toContain(".modal-wrapper");
  });
});
```

- [ ] **Step 2: Run the targeted test**

Run: `npm run build && npx jest src/__tests__/styleSelectors.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/styleSelectors.test.ts
git commit -m "test: verify critical selectors remain in compiled css"
```

## Chunk 4: Manual Verification

### Task 7: Verify extension behavior in both manifest modes

**Files:**
- No code changes expected

- [ ] **Step 1: Build the default override-newtab bundle**

Run: `npm run build`
Expected: success, with `dist/manifest.json` containing `chrome_url_overrides.newtab`.

- [ ] **Step 2: Build the overrideless bundle**

Run: `npx webpack --config webpack/webpack.dev.js --env BUILD_TYPE=overrideless`
Expected: success, with `dist/manifest.json` not containing `chrome_url_overrides`.

- [ ] **Step 3: Manual smoke check in Chrome**

Verify:
- new tab opens without missing styles
- spaces list and top bar render correctly
- sidebar layout is intact
- toolbar buttons still align correctly
- dropdowns and modal surfaces retain their styling

- [ ] **Step 4: Record any visual regressions before further refactoring**

If visual differences appear, fix only ordering or compilation issues. Do not clean up selectors or redesign styles in this migration.

