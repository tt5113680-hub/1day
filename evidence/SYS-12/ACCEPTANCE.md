# SYS-12 evidence

- task: SYS-12 Condition branch flow
- result: PASS (local engineering slice)
- unit: `node --test tests/sys-12-condition-branch-flow.test.mjs` → 1/1
- browser: `pnpm exec playwright test --config=playwright.sys-12-condition-branch-flow.config.ts` → 1/1
- screenshot: `condition-branch-flow.png`
- notes: Linear take/skip preview via `@oneday/workflows`. Not free-form graph. Not 全部商用. Not Tencent Cloud.
