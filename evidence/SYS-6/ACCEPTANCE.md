# evidence/SYS-6

- result: SYS_6_SCAFFOLD_PASS
- endpoint: `GET /api/v1/me/menu?product=management`
- unit: `tests/menu-dto.vitest.ts` 3/3
- contract: `tests/sys-6-menu-dto.test.mjs` 1/1
- acceptance: `PROJECT_STATE/SYS_6_ACCEPTANCE.md`
- note: Management shell only. Other products + role homes remain. Not 全部商用.
