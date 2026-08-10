# SYS-16 evidence

- task: SYS-16 Linear flow JSON export
- result: PASS (local engineering slice)
- unit: `node --test tests/sys-16-linear-flow-export.test.mjs` → 1/1
- browser: `pnpm exec playwright test --config=playwright.sys-16-linear-flow-export.config.ts` → 1/1
- screenshot: `linear-flow-export.png`
- notes: Honest linear JSON export. Not free-form graph. Not 全部商用. Not Tencent Cloud.
