# G1-W∞-48 Management 员工管理 真实数据深页密度 densify (MPC-10)

- slice: `G1-R-MANAGEMENT-EMPLOYEES-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; 员工管理 真实数据深页密度 toward Meituan merchant PC)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 W∞-45(订单·评价·营销) / W∞-46(顾客·会员) / W∞-47(商品·套餐入口) 真实数据深页密度，本刀补上 **MPC-10 组织/员工（员工管理，`/m/organization-employees`）** 的真实数据分布洞察，全部由已抓取的真实 Organization/Merchant/Employee/Invitation 档案行现场推导，禁止假 BI：

- **`/m/organization-employees`(员工管理，MPC-10)**：新增白卡分布面板 `aria-label="员工分布"`，宽度百分比由真实行 `b.value/total` 推导，空数据「暂无记录」——
  - 员工状态分布(按 `employee.status`：在岗 active / 已离岗/停用 other)；
  - 组织员工分布(按员工 `organization_id` 归属组织名，未归属组织兜底「未归属组织」，按 `data.employees.length` 比例)；
  - 待办负载分布(按真实 `open_task_count` 分桶：无待办 0 / 轻负载 1-5 / 重负载 6+)；
  - 客户负载分布(按真实 `active_customer_count` 分桶：无客户 0 / 少量客户 1-10 / 大量客户 11+)；
  - 待接受邀请分布(按邀请 `organization_id` 归属组织名，按 `data.invitations.length` 比例)。
- **`page.module.css`**：新增 `.distribution / .panelBlock / .bars / .barRow / .barTrack / .barFill / .barValue / .barLabel / .barEmpty / .honest`，灰底白卡 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 单列堆叠(与 W∞-45 `_commerce.module.css` / W∞-46/47 共享同一视觉语言)。

诚实边界全保留：全部指标派生自既有 `source=local` 组织/员工档案行，新增 honest 底注「以上分布全部由已抓取的真实组织与员工档案行现场推导(source=local)：不接美团/抖音实时人事或绩效、不伪造第三方评分或成交、不包含本平台收款、非本平台下单」；工具身份眉标(`推广员工具 · 员工管理`) + heroCard + summaryStrip + loading/forbidden/error 全状态 + 既有创建组织/商户/门店/创建邀请/办理离职交互全继承，`不另造第二套 API` / `租户工具授权范围` 诚实字句保留。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/management-web/app/m/organization-employees/page.tsx`(新增员工状态/组织/待办负载/客户负载/待接受邀请分布 + 真实数据推导)
- `apps/management-web/app/m/organization-employees/page.module.css`(新增 distribution/panel/bar 样式 + ≤900px 堆叠)
- `tests/g1-winf48-management-employees-deep.test.mjs`(新,4/4) — 验证分布面板/真实数据公式/CSS/诚实边界与既有 IA

## Verify

```text
node --test --test-concurrency=1 tests/g1-winf48-management-employees-deep.test.mjs  # 4/4
node --test --test-concurrency=1 tests/g1-winf*.test.mjs      # 144/144
pnpm --filter @oneday/management-web typecheck                  # PASS
pnpm --filter @oneday/management-web build                     # PASS (routes 含 /m/organization-employees)
pnpm build                                                      # 20/20
pnpm test:unit                                                  # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                      # clean
npx prettier --check <changed files>                            # clean
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-48 无关(clean 基线复现一致，同 W∞-44/45/46/47 记录)。
> `PROJECT_STATE/*` 与 `CHANGELOG.md` 沿用既有的单行长条目样式；`prettier --check` 会提议把这些既有单行条目重排换行，属全仓既有风格（先于 W∞-48 已存在，W∞-47 观测一致），非本次改动引入，故不重排历史。代码/测试文件 `g1-winf48` + `page.tsx` + `page.module.css` prettier clean。

## Gates

- typecheck PASS；build PASS；`pnpm build` 20/20；
- `g1-winf48` 4/4；`g1-winf*.test.mjs` 144/144；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有组织/员工档案行推导，禁止假 BI；不碰钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
