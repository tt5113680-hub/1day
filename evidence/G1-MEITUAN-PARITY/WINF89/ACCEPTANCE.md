# G1-W∞-89 四端 PARITY 关断复核收束（可回归防护护栏）

- slice: `G1-R-FOUR-TERMINAL-PARITY-CLOSEOUT`
- recorded_at: 2026-08-12 Asia/Shanghai
- status: **PASS** (engineering engineering-parity closeout; 四端「美团成熟场景完整对标」在测试层落成可复跑守卫，防 densify 回退)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Delivered

承接 W∞-45~88 全部四端 densify 波，本刀把「商用前提 = 四端完整对标美团成熟场景（唯一例外 `/m/workflows` = ONEDAY 定制）」在**测试层**落成一条可复跑、可回归的**关断防护护栏** `tests/g1-winf89-four-terminal-parity-closeout.test.mjs`：逐一断言四端走完 W 波的主面仍完整携带「工具身份黄顶栏 / hero + 真实数据 `summaryStrip` / 分布 + 诚实边界」，防止后续视觉/IA densify 回退。**现有四端页面零改动**（仅新增 1 个 test 文件），无 schema/DB/API。

覆盖面（全部由已抓取真实主面档案行对应组件源码现场断言，禁止假 BI）：

- **Management MPC 22 主面**：工作台(`/m`, W87)、门店入口(W80)、商品/套餐入口(W86 概况条)、客户跟进(W88 概况条)、会员中心(W88 概况条)、订单痕迹(W45)、评价档案(W45)、营销档案(W45)、数据/经营分析(W44/81)、员工管理(W48)、角色权限(W49)、营销内容(W50)、入口页装修(W51)、工具设置(W82)、通知中心(W31/81)；零星面 来源归因(W85)、入口痕迹(W85)、连接配置(W84)、外链服务(W84)、作业建议(W84)、操作审计(W84)、商圈双身份(W85)。逐一断言 `推广员工具 · <label>` 黄顶栏 + `summaryStrip` + 诚实边界（`非本平台下单|不代替平台成交|非本平台成交|不包含本平台收款|不伪造第三方|不宣称已接入|source=local|保留审批和审计记录`）；并对 offers(4列)/customers(6列)/memberships(3列) 三页 `page.module.css` 宽度列数 + `@media(max-width:900px)` 两列堆叠断言。
- **Employee ME 8 主面**：工作台(W78)、任务收件箱(W64)、客户档案(W65)、门店入口(W66)、会员核销(W67)、执行提醒(W68)、我的(W69)、获客池(W79)。断言工具身份 mark + `summaryStrip`/`heroCard` + 诚实边界（`非本平台下单|不代履约美团|source=local|不包含本平台收款|非本平台成交`），并对客户档案/会员核销分布 aria-label 实时数据断言。
- **Consumer MH5 5 主面**：附近/发现(W73)、门店页(W74)、统一入口(W72)、我的(W75)、商圈联盟(W75)。断言推广员工具 mark + `summaryStrip`/分布 aria-label + 诚实边界（`非本平台下单|不在此下单`）。
- **Platform/Channel/Circle 13 主面**：平台总览(W61)、租户管理(W53)、渠道管理(W54)、省市区代理(W52)、商圈管理(W55)、Outbox 投递队列(W56)、安全审计(W57)、连接器(W58)、模板治理(W59)、商圈联盟(W60)、商圈成员治理(W63)、渠道代理(W62)、商户开通向导(W85)。断言 `推广员工具 · <label>` 黄顶栏 + `summaryStrip`/分布 + 诚实边界（`非本平台下单|不包含本平台收款|本地试点记录未接美团实时|未接美团`）。
- **`/m/workflows`**：仅断言保持 `工作流整合` 定制身份 + 推广员工具 mark —— 不复刻美团（唯一 CUSTOM 例外），不宣称美团对标。

诚实边界全保留：这是**工程对标断言**（IA/视觉/轨迹/诚实 copy 的完整性守门），**不等于** owner 已签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`、也不宣称已接美团实时数据、不复活 consumer_orders / 本平台下单/收单。四端页面源码本身全部保留既有 source=local / 非本平台下单 / 不碰钱·销售·管理边界。

## Files

- `tests/g1-winf89-four-terminal-parity-closeout.test.mjs`（新, 6/6）— 四端 PARITY 关断守卫：M 22 / E 8 / C 5 / P 13 主面层次 + 诚实边界 + offers/customers/memberships CSS 响应式断言 + `/m/workflows` CUSTOM 断言
- 四端现有页面：**零改动**（守护不依赖改源码）
- `PROJECT_STATE/MEITUAN_PC_H5_PARITY_INVENTORY.md`（§6 下一刀更新为 W∞-89 PASS）
- `PROJECT_STATE/TASK_QUEUE.md`、`PROJECT_STATE/CURRENT_STATE.md`、`PROJECT_STATE/LATEST_HANDOFF.md`、`CHANGELOG.md`（随动更新）

## Verify

```text
node --test tests/g1-winf89-four-terminal-parity-closeout.test.mjs  # 6/6
node --test --test-concurrency=1 tests/g1-winf*.test.mjs             # 322/322
pnpm typecheck                                                        # 20/20
pnpm build                                                            # 20/20
pnpm test:unit                                                        # 47 passed (2 pre-existing token/storefront-renderer baseline failures 照旧)
pnpm format:check  （新文件 prettier clean）
npx eslint tests/g1-winf89-four-terminal-parity-closeout.test.mjs   # clean（0 问题）
```

> `tests/tokens.vitest.ts` 与 `tests/storefront-renderer.vitest.ts` 的 2 个断言为既有基线失败，与 W∞-89 无关（同 W∞-44~88 记录）。库内其余 lint 报错均为既有文件历史问题、非本刀引入。

## Gates

- typecheck PASS（`pnpm typecheck` 20/20）；build PASS（`pnpm build` 20/20）；
- `g1-winf89` 6/6；`g1-winf*.test.mjs` 322/322；
- vitest 47 passed（2 pre-existing baseline 失败照旧）；新文件 eslint + prettier clean；
- 断言全部对应已实现真实主面，禁止假 BI；不碰钱/销/管店；不复活 consumer_orders / 本平台下单/收单。

Not an owner product-owner UI sign-off.
