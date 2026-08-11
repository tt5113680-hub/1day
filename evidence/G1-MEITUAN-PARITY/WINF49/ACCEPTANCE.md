# G1-W∞-49 Management 角色权限 真实数据深页密度 densify (MPC-10)

- slice: `G1-R-MANAGEMENT-ROLES-PERMISSIONS-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; 角色权限 真实数据深页密度 toward Meituan merchant PC)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 W∞-45(订单·评价·营销) / W∞-46(顾客·会员) / W∞-47(商品·套餐入口) / W∞-48(员工管理) 真实数据深页密度，本刀补上 **MPC-10 角色权限（`/m/roles-permissions`）** 的真实数据分布洞察，全部由已抓取的真实 Role 档案行（roles: `member_count` / `permissions[]`，permissions: `{code}`）现场推导，禁止假 BI：

- **`/m/roles-permissions`(角色权限，MPC-10)**：新增白卡分布面板 `aria-label="角色权限分布"`，宽度百分比由真实行 `b.value/total` 推导，空数据「暂无记录」——
  - 成员负载分布(按真实 `role.member_count` 分桶：无成员 0 / 轻量 1-5 / 活跃 6+)；
  - 权限规模分布(按真实 `role.permissions.length` 分桶：无权限 0 / 基础 1-5 / 中等 6-10 / 全量 11+)；
  - 权限项分布(跨全部角色统计每个权限 code 被引用次数，按 `permissionNames` 映射中文名，频次降序，按 `permissionTotal` 比例)；
  - 高风险权限持有分布(仅统计 `sensitive` 集合内权限在各角色中的持有数，按 `sensitiveTotal` 比例)。
- **`page.module.css`**：新增 `.distribution / .panelBlock / .bars / .barRow / .barTrack / .barFill / .barValue / .barLabel / .barEmpty / .honest`，灰底白卡 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 单列堆叠(与 W∞-45 `_commerce.module.css` / W∞-46/47/48 共享同一视觉语言)。

诚实边界全保留：全部指标派生自既有 `source=local` 角色/权限档案行，新增 honest 底注「以上分布全部由已抓取的真实角色与权限档案行现场推导(source=local)：不接美团/抖音实时人事或绩效、不伪造第三方评分或成交、不包含本平台收款、非本平台下单」；工具身份眉标(`推广员工具 · 角色权限`) + heroCard + summaryStrip + loading/forbidden/error 全状态 + 既有创建角色 / 查看与变更 / 高风险二次确认 / 审计写入交互全继承。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/management-web/app/m/roles-permissions/page.tsx`(新增成员负载/权限规模/权限项/高风险权限持有分布 + 真实数据推导)
- `apps/management-web/app/m/roles-permissions/page.module.css`(新增 distribution/panel/bar 样式 + ≤900px 堆叠)
- `tests/g1-winf49-management-roles-permissions-deep.test.mjs`(新,4/4) — 验证分布面板/真实数据公式/CSS/诚实边界与既有 IA

## Verify

```text
node --test --test-concurrency=1 tests/g1-winf49-management-roles-permissions-deep.test.mjs  # 4/4
node --test --test-concurrency=1 tests/g1-winf*.test.mjs      # 148/148
pnpm --filter @oneday/management-web typecheck                  # PASS
pnpm --filter @oneday/management-web build                     # PASS (routes 含 /m/roles-permissions)
pnpm build                                                      # 20/20
pnpm test:unit                                                  # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                      # clean
npx prettier --check <changed files>                            # clean
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-49 无关(clean 基线复现一致，同 W∞-44/45/46/47/48 记录)。
> `PROJECT_STATE/*` 与 `CHANGELOG.md` 沿用既有的单行长条目样式；`prettier --check` 会提议把这些既有单行条目重排换行，属全仓既有风格(先于 W∞-49 已存在)，非本次改动引入，故不重排历史。代码/测试文件 `g1-winf49` + `page.tsx` + `page.module.css` prettier clean。

## Gates

- typecheck PASS；build PASS；`pnpm build` 20/20；
- `g1-winf49` 4/4；`g1-winf*.test.mjs` 148/148；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有角色/权限档案行推导，禁止假 BI；不碰钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
