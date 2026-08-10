# SYS-15 evidence

- task: SYS-15 Version panel linear reorder
- result: PASS (local engineering slice)
- unit: `node --test tests/sys-15-version-panel-reorder.test.mjs` → 1/1
- browser: `pnpm exec playwright test --config=playwright.sys-15-version-panel-reorder.config.ts` → 1/1
- screenshot: `version-panel-reorder.png`
- notes: Panel ↑↓ + clone-publish. Not free-form graph. Not 全部商用. Not Tencent Cloud.
