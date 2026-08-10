# SYS-8 evidence

- recorded_at: 2026-08-10 Asia/Shanghai
- result: PASS (local)
- api_test: `node --test tests/sys-8-member-resume.test.mjs` → 1/1
- browser_test: `pnpm exec playwright test --config=playwright.sys-8-member-resume.config.ts` → 1/1
- screenshots:
  - `member-resume-anonymous.png` — 「我的」anonymous with resume card
  - `member-resume-ready.png` — after resume, member proof visible
- notes: No SMS OTP; phone + memberCode + consent only. Not 全部商用. Not Tencent Cloud.
