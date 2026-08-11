# G1-W∞-51 Management 入口页装修 真实数据深页密度 densify (MPC-11)

- slice: `G1-R-MANAGEMENT-PAGE-BUILDER-DEEP`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering densify; 入口页装修 真实数据深页密度 toward Meituan merchant PC)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 W∞-45(订单·评价·营销) / W∞-46(顾客·会员) / W∞-47(商品·套餐入口) / W∞-48(员工管理) / W∞-49(角色权限) / W∞-50(营销内容) 真实数据深页密度，本刀补上 **MPC-11 入口页装修（`/m/page-builder`）** 的真实数据分布洞察，全部由已抓取的门店模板档案行（templates: `target` / `industry_config.family` / `live_version_id` / `published_version_id` / `store_name`）现场推导，禁止假 BI：

- **`/m/page-builder`(入口页装修，MPC-11)**：新增白卡分布面板 `aria-label="入口页装修分布"`，宽度百分比由真实行 `b.value/total` 推导，空数据「暂无记录」——
  - 模板目标分布(按真实 `template.target` 映射：消费者 / 员工 / 管理)；
  - 发布状态分布(由真实 `live_version_id` / `published_version_id` 推导：数字门店已发布 / 模板已发布未绑定 / 尚未发布)；
  - 行业模板分布(按真实 `industry_config.family` 映射：餐饮 / 美业 / 零售 / 未配置兜底「通用」，频次降序)；
  - 发布数字门店分布(仅统计有 `live_version_id` 的模板，按 `store_name`，未绑定门店兜底，按 `storeTotal` 比例)。
- **`page.module.css`**：新增 `.distribution / .panelBlock / .bars / .barRow / .barTrack / .barFill / .barValue / .barLabel / .barEmpty / .honest`，灰底白卡 + 黄渐变色条(线性 `#ffd100→#f0a500`)，≤900px 单列堆叠(与 W∞-45 `_commerce.module.css` / W∞-46/47/48/49/50 共享同一视觉语言)。

诚实边界全保留：全部指标派生自既有 `source=local` 门店模板档案行，新增 honest 底注「以上分布全部由已抓取的门店模板真实档案行现场推导(source=local)：模板目标、发布状态、行业模板与已发布数字门店；不接美团/抖音实时投放、不包含本平台收款、非本平台下单」；工具身份眉标(`推广员工具 · 入口页装修`) + heroCard + summaryStrip + loading/forbidden/error 全状态 + 既有进入装修 / 创建装修草稿 / 保存草稿 / 生成手机/PC 预览 / 发布 / 回滚交互全继承。无 schema/DB/API 变更，不复活 consumer_orders / 本平台下单/收单。

## Files

- `apps/management-web/app/m/page-builder/page.tsx`(新增模板目标/发布状态/行业模板/发布数字门店分布 + 真实数据推导)
- `apps/management-web/app/m/page-builder/page.module.css`(新增 distribution/panel/bar 样式 + ≤900px 堆叠)
- `tests/g1-winf51-management-page-builder-deep.test.mjs`(新,4/4) — 验证分布面板/真实数据公式/CSS/诚实边界与既有 IA

## Verify

```text
node --test --test-concurrency=1 tests/g1-winf51-management-page-builder-deep.test.mjs  # 4/4
node --test --test-concurrency=1 tests/g1-winf*.test.mjs      # 156/156
pnpm --filter @oneday/management-web typecheck                  # PASS
pnpm --filter @oneday/management-web build                     # PASS (routes 含 /m/page-builder)
pnpm build                                                      # 20/20
pnpm test:unit                                                  # 47 passed (2 pre-existing token baseline failures 照旧)
npx eslint <changed files>                                      # clean
npx prettier --check <changed files>                            # clean (page.tsx / page.module.css / g1-winf51)
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个 token 断言为既有基线失败，与 W∞-51 无关(clean 基线复现一致，同 W∞-44~50 记录)。
> `PROJECT_STATE/*` 与 `CHANGELOG.md` 沿用既有的单行长条目样式；`prettier --check` 会提议把这些既有单行条目重排换行，属全仓既有风格(先于 W∞-51 已存在)，非本次改动引入，故不重排历史。代码/测试文件 `g1-winf51` + `page.tsx` + `page.module.css` prettier clean。

## Gates

- typecheck PASS；build PASS；`pnpm build` 20/20；
- `g1-winf51` 4/4；`g1-winf*.test.mjs` 156/156；
- vitest 47 passed(2 pre-existing token 失败照旧)；eslint + prettier clean；
- 真实数据深页密度全部由既有门店模板档案行推导，禁止假 BI；不碰钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
