# 美团深度对标优化计划（主人裁决版 · DeepSeek 无人值守）

- recorded_at: 2026-08-12 Asia/Shanghai
- authority: 主人 2026-08-12 裁决（对 IDE 方案逐条调整）
- executor: Plan B OpenCode + DeepSeek（`EXECUTOR_PLAN_B_API_AGENT.md`）；IDE 仅人工验收，**禁止并行写入**
- constitution: `COMMERCIAL_EXECUTION_CHARTER.md` + `PRODUCT_DUAL_TRACK_STRATEGY.md`
- inventory: `MEITUAN_PC_H5_PARITY_INVENTORY.md`
- rule: **每轮只做一个 TASK**；真实 DB/API；禁止假 BI；不碰钱/本平台下单/收单；不代签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`

---

## 0. 主人裁决摘要（不可偏离）

| 原方案节 | 主人裁决 | 施工含义 |
| -------- | -------- | -------- |
| **二 可深度建设** | **必须达到目标深度** | §2 能力矩阵「目标深度」列 = 验收硬门槛，不得停在壳/分布条 |
| **三 底座与产品深度** | **必须 100%** | Blueprint 成熟度目标 **100/100**；底座保持绿；产品深度从 ~52–72% 拉满 |
| **四 对标深度模型** | **继续深度必须到 100%** | MPC/ME/MH5/MP 各模块按 §4 清单做到「列表→筛→详→操作→审计」闭环 |
| **五 开通 READY 工程** | **主人 2026-08-15「开始第五节」** | **ACTIVE**：按 `TENANT_ONE_CLICK_PROVISIONING_SPEC.md` 切刀；首刀渠道统一 READY Run |
| **六 多租户 SaaS** | **必须补到最强** | §6 全部项按「最强」目标施工，不得半成品 |
| **七 分阶段路线** | **必须落地** | Phase 1→2→3 按序切 TASK；跳过 Phase 内 §5 相关切片 |
| **八 测试策略** | **按方案** | 先产品深度再商用 UAT；工程回归持续绿 |
| **九 成功指标** | **按方案且拉满 100%** | 见 §9；未达不得宣称商用完成 |
| **十 对应关系** | **按方案** | 口径诚实：无 GMV；用入口/CRM/任务/会员替代 |

**诚实边界不变：** 不抓美团整店收入；不宣称已接美团实时 API；第三方未回传不写「已成交」。诚实边界 ≠ 少做功能。

---

## 1. 成功定义（100% 门槛）

| 指标 | 当前（工程事实） | 目标（主人要求） |
| ---- | ---------------- | ---------------- |
| Blueprint 成熟度 | ~45/100（规划指数） | **100/100** |
| 产品深度（C/E/M/P） | ~52–72% | **各端 100%** |
| inventory 工程对标 | 31 PARTIAL engineering-complete | 保持守卫绿 + **作业闭环 100%** |
| 商用 PARITY 签字 | 未签 | 主人 G1 签后升 PARITY（agent 不代签） |
| 假 BI / 本平台下单 | 0 | **0** |
| §5 READY 新编排 | 规格已有、未做 | **本波次不做** |

---

## 2. 可深度建设 — 目标深度（硬门槛）

> 下列「目标深度」= 无人值守必须做到；「壳/分布」不算 PASS。

| 能力 | 路由 | 目标深度（100%） | 禁止 |
| ---- | ---- | ---------------- | ---- |
| 有效订单/转化 | `/m/orders` + L0–L2 | 筛选/导出/门店对比/来源归因/时间序列 + **详情抽屉（来源·客户·任务链）** | GMV/履约伪造成交 |
| 新老/复购/留存 | `/m/customers` | RFM 自动分层、cohort、复购周期、沉睡唤醒队列、客户 360 互动轴 | 假分层 |
| 套餐/入口排行 | `/m/offers` | 分类树、批量上下架、排序、**按模块点击/跳转排行** | 伪造销量排行 |
| 评论/回复 | `/m/reviews` | 待回复队列、回复编辑器、多平台标签、评分趋势 | 宣称实时美团评价流 |
| 会员 | `/m/memberships` | 等级规则、批量发放、到期提醒、异常告警、cohort | 储值/支付 |
| 品牌驾驶舱 | `/m/dashboard` + `/m/analytics` | 早会一页纸可处置 + 行业模板看板 + 模块热力 + 工具漏斗 | 假 dashboard |
| BD/合同（代理） | `/p/agents` | 代理树 + 结算周期 + 合同状态机（无资金托管） | 收款分账 |
| 多租户 SaaS | Platform 全域 | 见 §6 最强清单 | 半租户/假 READY 宣称 |

---

## 3. 底座 100% + 产品深度 100%

### 3.1 底座（保持 / 补强到最强）

已 PASS 项不得回退：多租户隔离、会话、RBAC、审计、幂等、Outbox、Worker、XT/SE/MS 矩阵。

补强到最强（归入 §6 / Phase 切片）：

- suspend 后会话 **即时失效**
- 配额触顶 **硬拦截** + 升级引导
- 写操作 **不可篡改审计** + 导出
- Outbox **一键重放** + 可观测告警
- 发布/RBAC/停用 **多端 ≤60s 收敛**

### 3.2 产品深度（从壳到闭环）

每一业务页必须具备：

1. 美团同构导航入口  
2. 列表 + 筛选 + 空/错/载  
3. 详情 + 主操作  
4. 审计 / Outbox 可查  
5. 真实数据指标（禁止 Math.random / mockMetrics）  
6. 诚实底注  

**例外：** `/m/workflows` = CUSTOM（不复刻美团）。

---

## 4. 对标深度模型 — 做到 100%

按 `MEITUAN_PC_H5_PARITY_INVENTORY.md` 模块，**作业闭环** 优先级：

### P0（先做）

| ID | 模块 | 闭环要点 |
| -- | ---- | -------- |
| MPC-01 | 工作台 | 待办 **一键处置**（深链+回写已处理） |
| MPC-02 | 门店 | 完整资料 CRUD + 营业状态批量 + 三类二维码 |
| MPC-03 | 商品/套餐入口 | 分类树 + 批量上下架 + 跳转排行 |
| MPC-06 | 客户跟进 | RFM + 批量打标/归属 + 360 时间轴 |
| MPC-08 | 会员 | 规则引擎 + 到期提醒 + 异常告警 |
| MPC-09 | 经营分析 | 行业模板 + 模块热力 + Consult→Done 漏斗 |

### P1

| ID | 模块 | 闭环要点 |
| -- | ---- | -------- |
| MPC-04 | 订单痕迹 | 详情抽屉 + 导出 |
| MPC-05 | 评价档案 | 待回复队列 + 回复工作流 |
| MPC-10 | 员工/权限 | 邀请→激活→角色包→门店 scope |
| MPC-11 | 装修/内容 | Draft→同渲染器 Preview→Publish→四端收敛 |
| MPC-12/13 | 设置/通知 | 变更审计；通知已读/忽略/批量 |
| ME-* | 员工 H5 | 与工作台 KPI 同源 + 队列可处置 |
| MH5-* | 消费者 | 诚实标注 + 外链确认；不做本平台下单 |
| MP-* | 平台/渠道/商圈 | 运营队列 drill-down + 代理结算（无资金） |

### DEFERRED（第五节）

| ID | 内容 | 状态 |
| -- | ---- | ---- |
| MP-02 READY | `tenant_provisioning_runs` 10 步编排 | **ACTIVE**（首刀 W∞-125） |

---

## 5. 开通 READY 工程 — ACTIVE（主人 2026-08-15「开始第五节」）

- 规格真源：`TENANT_ONE_CLICK_PROVISIONING_SPEC.md`
- **已解锁**：可新建/扩展 Run 编排、READY 断言、渠道统一到同一 command
- **首刀 W∞-125**：Channel `/ch/merchants/new` 委托 Platform provisioning Run（`source_mode=channel_referral`），写真实 channel membership；交付「已交付」须 READY 校验
- **W∞-126 PASS**：三场景 QR（`consumer_storefront` / `owner_activation` / `employee_onboarding`）可解析、可撤销、可追踪
- **W∞-127 PASS**：Owner activation token（`awaiting_activation` → `/api/v1/auth/owner-activate` → READY）
- 后续切片（resume saga）按 TASK_QUEUE 续切
- 现有 `/p/tenants/new` 11 步 READY 路径保留并作为共享 command

---

## 6. 多租户 SaaS — 补到最强

| 项 | 最强目标 | 切片前缀 |
| -- | -------- | -------- |
| 租户隔离 | XT/SE/MS 持续绿 + 证据可复跑 | W∞-SAAS-ISO |
| 套餐配额 | 触顶拦截、拒绝超额写、升级文案 | W∞-SAAS-QUOTA |
| 角色包 | Owner/店长/员工/渠道预置包开通绑定 | W∞-SAAS-ROLE |
| 数据 scope | 管理端门店切换器 + 跨店拒绝可观测 | W∞-SAAS-SCOPE |
| 审计 | 全写路径审计链 + 导出 | W∞-SAAS-AUDIT |
| Outbox | 死信一键重放 + 告警字段 | W∞-SAAS-OUTBOX |
| 生命周期 | suspend/resume 会话即时失效 | W∞-SAAS-LIFE |
| 同步 | 发布/权限变更 ≤60s 收敛可测 | W∞-SAAS-SYNC |

连接器 OAuth / 第三方只读回传 = Phase 4，**有合法 API 再做**；无 API 不伪造。

---

## 7. 分阶段落地（DeepSeek 按序切刀）

### Phase 1 — 商用作业闭环（跳过 1.1 READY）

| TASK | 内容 | 状态 |
| ---- | ---- | ---- |
| ~~1.1 READY 开通~~ | W∞-125+ | **ACTIVE**（W∞-125..130 PASS；NEXT W∞-131 §5 收口） |
| **W∞-107** | 工作台队列一键处置（MPC-01 / 1.3） | **PASS** |
| **W∞-108** | Storefront 发布链闭环加固（装修→Consumer 可读 / 1.2） | **PASS** |
| **W∞-109** | CRM 深操作：RFM + 批量 + 360 轴（MPC-06 / 1.4） | **PASS** |
| **W∞-109** | CRM 深操作：RFM + 批量 + 360 轴（MPC-06 / 1.4） | PASS |
| **W∞-110** | 会员闭环加固：规则/到期/异常（MPC-08 / 1.5） | **NEXT** |

### Phase 2 — 美团 PC 1:1 作业深度 100%

| TASK | 内容 | 状态 |
| ---- | ---- | ---- |
| W∞-111 | 门店完整 CRUD + 二维码（MPC-02） | **PASS** |
| W∞-112 | 商品分类树 + 批量 + 跳转排行（MPC-03） | **PASS** |
| W∞-113 | 订单痕迹详情抽屉 + 导出（MPC-04） | **PASS** |
| W∞-114 | 评价待回复队列（MPC-05） | **PASS** |
| W∞-115 | 经营分析行业模板 + 模块热力 + 工具漏斗（MPC-09） | **PASS** |
| W∞-116 | 员工邀请→激活→角色包（MPC-10） | **PASS** |
| W∞-117 | 通知已读/忽略/批量（MPC-13）+ 设置变更审计（MPC-12） | **PASS** |

### Phase 3 — SaaS 最强 + 平台深化

| TASK | 内容 | 状态 |
| ---- | ---- | ---- |
| W∞-118 | 配额触顶拦截 | **PASS** |
| W∞-119 | suspend 会话即时失效 | **PASS** |
| W∞-120 | Outbox 重放 + 告警 | **PASS** |
| W∞-121 | 审计导出全覆盖 | **PASS** |
| W∞-122 | 代理结算周期 + 合同状态（无资金） | **PASS** |
| W∞-123 | 渠道/商圈运营队列与 scope 最强化 | **PASS** |
| W∞-124 | 多端 sync SLO 可测护栏 | **PASS** |

### Phase 4 — 连接器（按需）

仅当主人提供 API/商务前提；默认不自动开工。

---

## 8. 测试策略（按方案）

| 阶段 | 做 | 不做 |
| ---- | -- | ---- |
| 每刀 | typecheck/build、适用单测、`g1-winf*` 回归、evidence、commit/push | 代签主人 UI |
| Phase 1–2 后 | 模块 CRUD E2E、scope 隔离 | 测第三方收入 API |
| 主人 G1 | `PRODUCT_OWNER_UI_ACCEPTANCE.md` | agent 填写 PASS |

---

## 9. 成功指标（拉满）

| 指标 | 目标 |
| ---- | ---- |
| Blueprint | **100/100** |
| 管理端 CRUD 完整模块 | **100%**（workflows 除外为 CUSTOM） |
| 工作台待办可处置率 | **≥95%** |
| 假 BI | **0** |
| §5 READY | W∞-125..129 PASS；续刀 W∞-130+ Circle 双审批可见性 |

---

## 10. DeepSeek / 无人值守执行纪律

1. 开轮必读：CHARTER → 本文件 → DUAL_TRACK → LATEST_HANDOFF → DECISION_REQUIRED → CURRENT_STATE → TASK_QUEUE → git status  
2. **只做 TASK_QUEUE 中第一个 `[ ]` 且非 DEFERRED 的切片**  
3. 禁止开工：§5 READY 编排、本平台下单、假 BI、腾讯云（G）、代签主人验收  
4. 完成后：evidence/`G1-MEITUAN-PARITY/WINF{n}/` + CURRENT_STATE + TASK_QUEUE + CHANGELOG + LATEST_HANDOFF + PHASE1_PROGRESS.json + commit + push  
5. IDE 与 DeepSeek **不得并行写**同一分支；若发现并行 → `BLOCKED_REPORT.md`  

### 新窗口 / daemon 冷启动

```text
继续
```

或显式：

```text
按 MEITUAN_DEPTH_OPTIMIZATION_PLAN 执行 TASK_QUEUE 下一刀（跳过 §5 READY）
```
