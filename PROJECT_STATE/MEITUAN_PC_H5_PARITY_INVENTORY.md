# 美团 PC / H5 复刻清单（施工权威）

- created_at: 2026-08-10 23:30 Asia/Shanghai
- updated_at: 2026-08-10 23:53 Asia/Shanghai
- authority: 主人裁决 — **不要猜怎么管理，直接复刻美团**；H5 = 美团 App + 商家端；PC = 商家 PC + **平台/代理 PC**；仅「工作流整合页」定制
- strategy: `PRODUCT_DUAL_TRACK_STRATEGY.md`
- rule: **对表施工**。未进本表的「自创管理 IA」一律不作最终产品方向。

---

## 0. 四套面对齐（主人 2026-08-10 23:53 确认）

| ONEDAY 终端 | 复刻对象（源真相） | 形态 |
| ----------- | ------------------ | ---- |
| `consumer-web` | **美团 App（C 端）** | H5 高保真对齐 App |
| `employee-web` | **美团商家端 App** | H5 高保真对齐商家 App |
| `management-web` | **美团商家端 PC** | PC 1:1 |
| `platform-web`（含 `/ch` `/bc`） | **美团平台端 / 各级代理 PC** | PC 1:1 |

说明：主人说的「H5 对标美团 App 和商户端」= 消费者 + 员工/店员移动面都按对应美团 App 做，不是只做 C 端。  
「还有他们的 PC 平台端」= 平台/渠道后台跟美团代理/平台 PC，不只商家 PC。

---

## 0.1 执行原则

1. **源真相 = 上表四套美团现网**，不是我们脑补的「应该怎么管」。
2. 每一页验收：对照美团同名/同职责页的 **导航位置、信息密度、主操作、列表/筛/详、空态、关键链路**。
3. **唯一例外：** Management `/m/workflows`（工作流整合页）→ ONEDAY 定制，不要求仿美团像素。
4. 诚实边界仍有效：不宣称已接美团实时库存/价格 API；数据可用本地试点，但 **壳与链路必须美团同构**。
5. 当前仓库大量页 = 过渡实现；状态列 `GAP` / `PARTIAL` / `PARITY` / `CUSTOM`。

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

## 2. 美团 H5 — 消费者

| ID | 美团对标（H5） | ONEDAY 现路由 | 状态 | 备注 |
| -- | -------------- | ------------- | ---- | ---- |
| MH5-01 | 首页 / 附近 | `/c/discovery` | PARTIAL | 已有附近/好评/人气；须继续美团附近页同构 |
| MH5-02 | 搜索 | `/c/search` | PARITY (首刀) | `/api/v1/consumer/search` 租户隔离检索；壳与结果链路美团 App 同构 |
| MH5-03 | 商家页 / 到店主页 | `/c/stores/[id]` | PARTIAL | |
| MH5-04 | 团购 / 套餐 | `/c/stores/[id]/group-buy` | PARTIAL | |
| MH5-05 | 菜单 / 点单 | `/c/stores/[id]/menu` | PARTIAL | |
| MH5-06 | 商家详情 / 资质评价入口 | `/c/stores/[id]/profile` | PARTIAL | |
| MH5-07 | 下单 / 提单 | — | GAP | |
| MH5-08 | 订单列表 / 详情 | — | GAP | |
| MH5-09 | 我的 | `/c/profile` | PARTIAL | |
| MH5-10 | 会员 | `/c/stores/[id]/membership` | PARTIAL | |
| MH5-11 | 分享落地 | `/c/share/[code]`, `/c/one-code/[code]` | PARTIAL | 保留 ONEDAY 码能力，页壳美团化 |
| MH5-12 | 服务 / 咨询 hand-off | `/c/services/[id]`, `/c/actions/[id]` | PARTIAL | 诚实 HTTPS hand-off |

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

**W6 省市区代理（MP-01~03）PASS. W∞-1（省市区代理深层运营：结算/配额/审批, MP-03 深层）PASS** `evidence/G1-MEITUAN-PARITY/WINF/ACCEPTANCE.md`. **W∞-2（Consumer H5 搜索, MH5-02）PASS** `evidence/G1-MEITUAN-PARITY/WINF2/ACCEPTANCE.md`. **下一刀：** **W∞-3** — 其余 GAP 逐页（Consumer H5 下单/订单、Management PC 深页、美团代理后台更深/Meituan parity 细部），直到主人签 G1。
