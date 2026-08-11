# 美团 PC / H5 复刻清单（施工权威）

- created_at: 2026-08-10 23:30 Asia/Shanghai
- updated_at: 2026-08-10 23:53 Asia/Shanghai
- authority: 主人裁决 — **不做美团产品**；学习成熟管理系统/人员/代理/指标/开店链路（客户熟悉→上手快）；底盘仍为 ONEDAY；仅工作流整合页自研差异
- strategy: `PRODUCT_DUAL_TRACK_STRATEGY.md`
- rule: **对成熟场景施工**。禁止自创陌生管理 IA；也禁止宣称「已是美团」。

---

## 0. 四套面对齐（学习源 · 2026-08-11 澄清）

> **不做美团产品。** 下列是「成熟场景学习源」：管理系统型、人员、代理、指标、开店链路 — 与 ONEDAY 业务重复、客户（美团/抖音/饿了么合伙经验）上手快。底盘仍是 ONEDAY。

| ONEDAY 终端 | 学习对象（成熟场景） | 形态 |
| ----------- | -------------------- | ---- |
| `consumer-web` | 美团 App 等到店浏览习惯 | H5 |
| `employee-web` | 美团商家端人员作业习惯 | H5 |
| `management-web` | 美团商家端 PC 管理型 | PC |
| `platform-web`（含 `/ch` `/bc`） | 美团平台/代理：层级、开通、归属 | PC |

---

## 0.1 执行原则

1. **源真相 = 上表成熟场景**，用来降低自创管理难度与客户适应成本；不是做成美团本体。
2. 每一页验收：导航分区、主操作、列表/筛/详、指标口径、开通链路是否贴近客户已熟悉习惯。
3. **唯一例外：** Management `/m/workflows`（工作流整合页）→ ONEDAY 定制。
4. 诚实边界：不宣称已接美团实时库存/价格 API；数据可用本地试点。
5. 状态列 `GAP` / `PARTIAL` / `PARITY` / `CUSTOM`（PARITY = 场景同构，非「已是美团」）。

---

## 1. 美团商家端 PC（管理/老板）— 目标信息架构

> 命名按美团商家常见能力归类；施工时以现网菜单文案为准微调，**不得用 ONEDAY 自创一级菜单替代整棵树**。

| ID | 美团对标模块（PC） | ONEDAY 现路由（若有） | 状态 | 备注 |
| -- | ----------------- | --------------------- | ---- | ---- |
| MPC-01 | 工作台 / 首页概览 | `/m/dashboard` | PARTIAL | 仅密度近似，须升格为美团工作台 1:1 |
| MPC-02 | 门店管理 | `/m/stores` | GAP | 须按美团门店列表/详情/营业配置同构 |
| MPC-03 | 商品 / 菜品 / 套餐 | `/m/offers` 等 | GAP | 对标美团商品库，不自创「套餐叙事」替代 |
| MPC-04 | 订单中心 | — | GAP | 本地试点可先订单壳+状态机；UI 必须美团订单 |
| MPC-05 | 评价管理 | — | GAP | |
| MPC-06 | 顾客 / CRM | `/m/customers` | PARTIAL | 能力在，IA/密度须美团化 |
| MPC-07 | 营销中心（券/活动） | — / 部分 content | GAP | |
| MPC-08 | 会员 | `/m/memberships` | PARTIAL | |
| MPC-09 | 数据 / 经营分析 | 分散 metric | GAP | 禁止假 BI；先美团常见经营日报密度 |
| MPC-10 | 员工 / 权限 | `/m/organization-employees`, `/m/roles-permissions` | PARTIAL | |
| MPC-11 | 店铺装修 / 展示 | `/m/page-builder`, `/m/content` | PARTIAL | **壳跟美团**；内容数据仍走 ONEDAY 发布链 |
| MPC-12 | 设置 | `/m/settings` | PARTIAL | |
| MPC-13 | 消息 / 通知 | — | GAP | |
| MPC-99 | **工作流整合** | `/m/workflows` | **CUSTOM** | **唯一不复刻美团的定制页** |

### PC 现有但须降级/改挂的 ONEDAY 页

下列页保留能力，但 **不得继续以「自创一级产品」名义占主导航**；整改时并入美团对应模块或收入「更多/设置」，避免和美团树打架：

| 现路由 | 处置 |
| ------ | ---- |
| `/m/attribution` | 并入顾客/经营分析美团同构区 |
| `/m/ai-suggestions` | 并入工作台建议或设置；禁止独立「AI 产品首页」感 |
| `/m/connectors` | 设置/对接意图；诚实边界 |
| `/m/external-actions` | 外链动作 → 美团「外链/活动」同类入口 |
| `/m/permission-audit` | 设置/安全审计 |
| `/m/employee-process-performance` | 员工绩效 → 美团人力/门店员工区 |
| `/m/funnels/[id]` | 并入顾客漏斗/经营 |

---

## 2. 美团 H5 — 消费者（§A–§C 语义）

| ID | 成熟型（学习源） | ONEDAY 现路由 | 状态 | 备注 |
| -- | ---------------- | ------------- | ---- | ---- |
| MH5-01 | 美团 App 外卖 LBS 首页 → **附近** | `/c/discovery` | PARTIAL | 内容=开通客户商家（§B） |
| MH5-02 | 搜索 | `/c/search` | PARITY (首刀) | `/api/v1/consumer/search` 租户隔离检索 |
| MH5-03 | 美团商家门店页 → **商家消费者页** | `/c/stores/[id]` | PARTIAL | 第三方商品+多模板/装修（§A） |
| MH5-04 | 团购 / 套餐（外链聚合） | `/c/stores/[id]/group-buy` | PARTIAL | 美团/抖音/外链，非自有货架 |
| MH5-05 | 菜单 / 点单 | `/c/stores/[id]/menu` | PARTIAL | |
| MH5-06 | 商家详情 | `/c/stores/[id]/profile` | PARTIAL | |
| MH5-07 | 下单 / 提单 | — | GAP (外链 only) | **不做本平台成交**；统一走 `/c/actions` 确认后 hand-off |
| MH5-08 | 订单列表 / 详情 | — | GAP (外链 only) | **不做本平台订单履约**；第三方结果不回传则不写「已成交」 |
| MH5-09 | 我的 | `/c/profile` | PARTIAL | |
| MH5-10 | 会员 | `/c/stores/[id]/membership` | PARTIAL | |
| MH5-11 | 分享落地 | `/c/share/[code]`, `/c/one-code/[code]` | PARITY (首刀) | share landing densify; 见 WINF7 |
| MH5-12 | 服务 / 咨询 hand-off | `/c/services/[id]`, `/c/actions/[id]` | PARITY (首刀) | 确认页平台预览+诚实免责+jump_confirm；见 WINF3 |
| MH5-13 | 美团 App 首页型 → **商圈联盟首页** | `/c/circles`, discovery | PARITY (首刀) | 行业 chips+排序+双身份；见 WINF5 |

---

## 3. 美团商家移动 / 员工 H5（对标）

| ID | 美团对标 | ONEDAY 现路由 | 状态 |
| -- | -------- | ------------- | ---- |
| ME-01 | 商家 App 工作台 | `/e/workbench` | PARTIAL |
| ME-02 | 订单 / 待办 | `/e/tasks` | PARTIAL |
| ME-03 | 顾客 | `/e/customers` | PARTIAL |
| ME-04 | 门店 | `/e/store` | PARTIAL |
| ME-05 | 核销 / 会员 | `/e/memberships` | PARTIAL |
| ME-06 | 消息 | `/e/notifications` | PARTIAL |
| ME-07 | 我的 | `/e/profile` | PARTIAL |

---

## 4. 平台 / 渠道 PC（对标美团平台端 / 代理后台）

> 主人明确：除商家 PC 外，**PC 平台端也要复刻美团平台/代理**。

| ID | 美团对标 | ONEDAY 现路由 | 状态 |
| -- | -------- | ------------- | ---- |
| MP-01 | 省市区代理树 | `/p/channels`, `/ch/*` | GAP |
| MP-02 | 商户入驻开通 | `/p/tenants`, `/ch/merchants/new` | GAP |
| MP-03 | 代理商管理后台 | `/ch/dashboard` | GAP |
| MP-04 | 商圈 / 运营集合 | `/p/business-circles`, `/bc/*` | PARTIAL |

对应切片：`G1-R-CHANNEL-AGENT-GEO`（R5）。

---

## 5. 施工波次（禁止猜，按序复刻）

| Wave | 范围 | 目标 |
| ---- | ---- | ---- |
| **W0** | 本清单 + 主导航改挂规则 | **本文档 PASS** |
| **W1** | MPC-01 工作台 + 主导航美团化（Management PC） | **PASS** `evidence/G1-MEITUAN-PARITY/W1/` |
| **W2** | MH5-01 附近 + MH5-03 商家主页（Consumer H5） | **PASS** `evidence/G1-MEITUAN-PARITY/W2/` |
| **W3** | MPC-02 门店 + MPC-03 商品 | **PASS** (首刀 IA) `evidence/G1-MEITUAN-PARITY/W3/` |
| **W4** | ME-01～05 商家移动工作台 | **PASS** (首刀) `evidence/G1-MEITUAN-PARITY/W4/` |
| **W5** | MPC-04/05/07 订单·评价·营销（可本地数据） | **PASS** (首刀) `evidence/G1-MEITUAN-PARITY/W5/` |
| **W6** | R5 省市区代理（MP-01～03） | **PASS** (首刀) `evidence/G1-MEITUAN-PARITY/W6/` |
| **W∞** | 其余 GAP 逐页 | 直到主人签 G1 |

每波只做一个可验收切片；证据进 `evidence/G1-MEITUAN-PARITY/`。

---

## 6. 当前下一刀

**W6 省市区代理（MP-01~03）PASS. W∞-1（省市区代理深层运营：结算/配额/审批, MP-03 深层）PASS** `evidence/G1-MEITUAN-PARITY/WINF/ACCEPTANCE.md`. **W∞-2（Consumer H5 搜索, MH5-02）PASS** `evidence/G1-MEITUAN-PARITY/WINF2/ACCEPTANCE.md`.

**W∞-3（外链 hand-off 确认 densify, MH5-12）PASS** `evidence/G1-MEITUAN-PARITY/WINF3/ACCEPTANCE.md`。**W∞-4（Management attribution 深页）PASS** `evidence/G1-MEITUAN-PARITY/WINF4/ACCEPTANCE.md`。**W∞-5（商圈 C 端 densify, MH5-13）PASS** `evidence/G1-MEITUAN-PARITY/WINF5/ACCEPTANCE.md`。**W∞-6（渠道/代理后台 densify）PASS** `evidence/G1-MEITUAN-PARITY/WINF6/ACCEPTANCE.md`。**W∞-7（分享落地 densify, MH5-11）PASS** `evidence/G1-MEITUAN-PARITY/WINF7/ACCEPTANCE.md`。**W∞-8（员工分享工具 densify）PASS** `evidence/G1-MEITUAN-PARITY/WINF8/ACCEPTANCE.md`。**下一刀 W∞-9：** 体验对标细部（仍不做本平台下单）。MH5-07/08 保持外链 hand-off GAP。
