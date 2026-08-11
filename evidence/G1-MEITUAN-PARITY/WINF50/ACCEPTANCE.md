# G1-W∞-50 Management 营销内容 真实数据深页密度 densify (MPC-11)

- slice: `G1-R-MANAGEMENT-CONTENT-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; 营销内容 真实数据深页密度 toward Meituan merchant PC)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 W∞-45(订单·评价·营销) / W∞-46(顾客·会员) / W∞-47(商品·套餐入口) / W∞-48(员工管理) / W∞-49(角色权限) 真实数据深页密度，本刀补上 **MPC-11 营销内容（`/m/content`）** 的真实数据分布洞察，全部由已抓取的真实内容档案行（items: `status` / `kind` / `channels[]`）与门店投放行（`placements[].storeName`）现场推导，禁止假 BI：

- **`/m/content`(营销内容，MPC-11)**：新增白卡分布面板 `aria-label="营销内容分布"`，宽度百分比由真实行 `b.value/total` 推导，空数据「暂无记录 / 暂无登记 / 暂无投放」——
  - 内容状态分布(按真实 `item.status`：已审批 / 草稿 / 已发布)；
  - 内容类型分布(按真实 `item.kind`：图文 / 公告 / 未分类)；
  - 渠道分发登记分布(跨全部内容统计每个分发渠道 code 被登记次数，按 `channelLabel` 映射中文名，频次降序，按 `channelTotal` 比例)；
  - 投放门店分布(跨全部内容统计每个 `placements[].storeName` 的投放次数，未绑定门店兜底，按 `storeTotal` 比例)。
- **`page.module.css`**：新增 `.distribution / .panelBlock / .bars / .barRow / .barTrack / .barFill / .barValue / .barLabel / .barEmpty / .honest`，灰底白卡 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 单列堆叠(与 W∞-45 `_commerce.module.css` / W∞-46/47/48/49 共享同一视觉语言)。

诚实边界全保留：全部指标派生自既有 `source=local` 内容/投放档案行，新增 honest 底注「以上分布全部由已抓取的真实内容、渠道登记与门店投放档案行现场推导(source=local)：渠道分发仅登记待授权请求，未经第三方授权不伪造发送；不接美团/抖音实时投放、不包含本平台收款、非本平台下单」；工具身份眉标(`推广员工具 · 营销内容`) + heroCard + summaryStrip + loading/forbidden/error 全状态 + 既有创建草稿 / 审批 / 登记渠道 / 投放到消费者门店交互全继承。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/management-web/app/m/content/page.tsx`(新增内容状态/类型/渠道分发登记/投放门店分布 + 真实数据推导)
- `apps/management-web/app/m/content/page.module.css`(新增 distribution/panel/bar 样式 + ≤900px 堆叠)
- `tests/g1-winf50-management-content-deep.test.mjs`(新,4/4) — 验证分布面板/真实数据公式/CSS/诚实边界与既有 IA

## Verify

```text
node --test --test-concurrency=1 tests/g1-winf50-management-content-deep.test.mjs  # 4/4
node --test --test-concurrency=1 tests/g1-winf*.test.mjs      # 152/152
pnpm --filter @oneday/management-web typecheck                  # PASS
pnpm --filter @oneday/management-web build                     # PASS (routes 含 /m/content)
pnpm build                                                      # 20/20
pnpm test:unit                                                  # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                      # clean
npx prettier --check <changed files>                            # clean
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-50 无关(clean 基线复现一致，同 W∞-44/45/46/47/48/49 记录)。
> `PROJECT_STATE/*` 与 `CHANGELOG.md` 沿用既有的单行长条目样式；`prettier --check` 会提议把这些既有单行条目重排换行，属全仓既有风格(先于 W∞-50 已存在)，非本次改动引入，故不重排历史。代码/测试文件 `g1-winf50` + `page.tsx` + `page.module.css` prettier clean。

## Gates

- typecheck PASS；build PASS；`pnpm build` 20/20；
- `g1-winf50` 4/4；`g1-winf*.test.mjs` 152/152；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有内容/投放档案行推导，禁止假 BI；不碰钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
