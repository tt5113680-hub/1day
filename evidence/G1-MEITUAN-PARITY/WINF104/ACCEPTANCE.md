# W∞-104 Portal Page Builder (Employee H5 + Management PC)

## Scope
- `portal_bindings` + `portal_preview_tokens` (migration `061_portal_bindings`)
- Page-builder publish/preview for `target=employee|management`
- Employee `/e/workbench` and Management `/` read published layout modules
- Human-pilot seed: default employee + management portal templates

## Verify
```powershell
node tests/g1-winf104-portal-page-builder.test.mjs
pnpm typecheck
pnpm build
# after migrate + seed on human-pilot DB:
# Management → /m/page-builder → employee/management template → 生成预览
# Employee → /e/workbench (published layout)
# Management → / (published layout)
```

## Acceptance paths (human pilot)
| Step | Path |
|------|------|
| 装修入口 | Management PC `/m/page-builder` |
| 员工预览 | 选 employee 模板 → 生成预览 → Employee H5 `/e/workbench?preview=…` |
| 管理预览 | 选 management 模板 → 生成预览 → Management PC `/?preview=…` |
| 发布后 | 员工/管理首页按 module 顺序渲染 hero / KPI / 队列等 |

## Evidence
- typecheck 20/20 PASS
- build 20/20 PASS
- g1-winf104-portal-page-builder 7/7 PASS
