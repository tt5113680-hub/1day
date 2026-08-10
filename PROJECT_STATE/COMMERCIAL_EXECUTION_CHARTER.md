# ONEDAY V3 商用施工总纲（不可偏离）

- recorded_at: 2026-08-10 Asia/Shanghai
- authority: 主人确认方案；Headless / IDE Agent **必须**遵守
- claim_boundary: 第一阶段 = 可试用商用闭环 + 推广级视觉底线；**非**像素级一线对标、非九角色全包、非任意低代码

---

## 0. 文档优先级（冲突时按此裁决）

| 优先级 | 文档 | 作用 |
| ------ | ---- | ---- |
| 1 | 本文 `COMMERCIAL_EXECUTION_CHARTER.md` | 施工总纲、不可偏离项 |
| 2 | `COMMERCIAL_PRODUCT_BLUEPRINT.md` | 产品/架构 PRD 冻结 |
| 3 | `COMMERCIAL_ACCEPTANCE_MATRIX.md` | 可重复验收矩阵 |
| 4 | `ROLE_PRODUCT_MATRIX.md` / `HIGH_FIDELITY_TEMPLATE_SYSTEM.md` / `MULTI_TERMINAL_SYNC_SPEC.md` | 角色、模板、同步 |
| 5 | `PHASE1_COMMERCIAL_CLOSED_LOOP_PLAN.md` / `PHASE1_PROGRESS.json` | 当前阶段范围与进度 |
| 6 | `AGENTS.md` / `DECISION_REQUIRED.md` | 执行器与授权边界 |

**禁止：** 为赶进度偏离 PRD、页级乱补丁、假三方对接、宣称「全部商用」、代签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`。

---

## 1. 核心开发原则（不可偏离）

1. **单一真源**：业务数据在领域表；Storefront 版式在 template/binding；内容在 `content_items`+placements；禁止第二套 Banner/tab/外链表。
2. **配置驱动，非任意低代码**：模块白名单 + 行业模板 + 品牌 token；禁止 HTML/脚本注入、禁止页面级 hex 补丁堆叠。
3. **闭环可证据**：每条商业链必须 API + UI + 测试 + `evidence/`；无证据不得 PASS。
4. **诚实边界**：connectors = 意图/状态；Consumer outbound = HTTPS  hand-off；不宣称美团/抖音实时库存价格。
5. **多租户隔离**：XT-* / SE-* / MS-* 矩阵 P0 持续绿；跨 tenant 一律 fail-closed。
6. **多端一致**：同一 Consumer URL 语义；发布→四端收敛（SY-*）；suspend/RBAC 变更即时拒绝（SY-02）。
7. **一任务一轮**：Headless 每轮一个切片；禁止并行双写入。
8. **插件最大化、核心最小化**：能力走 catalog / module / connector / external-action；不 fork 核心写第二套 API。

---

## 2. 大厂对标原则（实用级，非像素抄袭）

对标对象：**美团商家端 / 有赞商户 / 钉钉管理后台 / 企业微信工作台** 的**信息架构与数据密度**，不是 1:1 视觉抄袭。

| 维度 | 一线大厂实用标准 | ONEDAY 第一阶段底线 |
| ---- | ---------------- | ------------------- |
| IA | 角色首页 3–7 个主任务入口；深层设置折叠 | AdminShell/MobileShell + menu DTO 角色包 |
| 状态 | loading / empty / error / forbidden 全覆盖 | `@oneday/ui` AppStatePanel + 四端关键路由 |
| 数据密度 | 列表可扫、详情可追、操作可审计 | 客户/任务/会员/归因/Run 可深链 |
| 反馈 | 写操作有确认、成功/失败可感知 | 外链确认、核销/发放/发布有反馈 |
| 移动 | Employee 单手操作、任务队列优先 | `/e/tasks`、客户目录、核销一等页 |
| 桌面 | Management 侧栏分组、表格+筛选 | SYS-29 nav groups + 后续 Table 组件 |
| 诚实 | 未接入能力标「意图/待配置」 | connectors、distribution intent 诚实文案 |

**不做进第一阶段：** 像素级复刻、全量 BI 大盘、自由拖拽装修、九角色完整产品包。

---

## 3. 商户 / 企业租户使用习惯与关注数据（施工必对齐）

> 综合本地生活、零售 SaaS、企微/钉钉 B 端共性；施工 UI/指标/菜单须能回答下列问题。

### 3.1 老板 / Tenant Owner（Management）

| 习惯 | 关注数据 | 产品落点 |
| ---- | -------- | -------- |
| 早会看经营概况 | 今日咨询/线索、会员新增、任务完成率 | `/m` overview、归因、客户漏斗 |
| 管人多店 | 门店对比、店长绩效、权限变更 | stores、employee-performance、RBAC |
| 管货与活动 | 套餐/Offer、内容投放、发布是否生效 | offers、content、page-builder 发布链 |
| 管会员 | 发放/核销/异常、权益余额 | `/m/memberships` ledger |
| 怕漏单 | 员工任务 SLA、超时、升级 | workflows、tasks、outbox |

### 3.2 店长 / Store Manager（Employee + scoped Management）

| 习惯 | 关注数据 | 产品落点 |
| ---- | -------- | -------- |
| 盯今日任务 | 待跟进、逾期、客户提醒 | `/e/tasks`、workbench |
| 现场核销 | 会员码、权益余量 | `/e/memberships` |
| 获客 | 分享码、线索池 | `/e/share`、`/e/leads` |
| 只看本店 | 门店 scope 拒绝跨店 | data_scopes + SYS-6 |

### 3.3 一线员工（Employee）

| 习惯 | 关注数据 | 产品落点 |
| ---- | -------- | -------- |
| 手机优先 | 任务列表、一键跟进 | mobile shell、task detail |
| 认客户 | 客户档案、历史互动 | `/e/customers` |
| 少填表 | 跟进/证据快捷提交 | follow-up、evidence API |

### 3.4 消费者 / 会员（Consumer）

| 习惯 | 关注数据 | 产品落点 |
| ---- | -------- | -------- |
| 3 秒懂门店 | 营业状态、主 CTA、信任信息 | storefront modules |
| 比价但不信假实时 | 来源标注、外链确认 | offer_compare、outbound confirm |
| 会员要透明 | 权益余量、历史、隐私撤回 | wallet、resume、consent |

### 3.5 平台 / 渠道 / 商圈（Platform）

| 习惯 | 关注数据 | 产品落点 |
| ---- | -------- | -------- |
| 开通可追踪 | Run 步骤、失败、重试 | provisioning trail |
| 合规与风险 | 暂停/恢复、审计 | tenant lifecycle、suspend |
| 不背锅 | 连接器≠已投递 | honest connector copy |

---

## 4. 对标大厂的实用功能与监测指标

施工与后续迭代须预留或可观测下列指标（**真实 DB/audit/outbox 可查，禁止假 dashboard**）。

### 4.1 经营漏斗（Management）

| 指标 | 定义 | 来源 |
| ---- | ---- | ---- |
| Consult → Customer | 公开动作创建客户转化率 | audit + customers |
| Customer → Task | 咨询生成员工任务比例 | tasks + attribution |
| Task → Done | 任务完成率、平均时长 | tasks.status + timestamps |
| Enroll → Active Member | 入会成功/重复/冲突 | memberships |
| Grant → Redeem | 权益发放核销率 | member_benefit_ledger |
| Publish → Live | 发布到 Consumer 可读延迟 | binding + SY-02 |

### 4.2 运营健康（Platform / SRE）

| 指标 | 定义 | 来源 |
| ---- | ---- | ---- |
| API health | `/api/v1/health` database ready | health endpoint |
| Outbox lag | pending / failed / DLQ 深度 | outbox_events + `/p/outbox` |
| Provisioning success | Run ready vs failed 步 | tenant_provisioning_* |
| Session incidents | suspend 后会话拒绝率 | auth audit |
| Rate limit hits | 429 计数 | API logs / PG limiter |

### 4.3 员工效率（Employee）

| 指标 | 定义 | 来源 |
| ---- | ---- | ---- |
| Open / Overdue tasks | 待办与逾期 | workbench API |
| Avg response time | 咨询→首次跟进 | tasks + follow-ups |
| Redeem count | 核销笔数 | ledger |

### 4.4 消费者体验（Consumer）

| 指标 | 定义 | 来源 |
| ---- | ---- | ---- |
| Storefront render errors | 模块缺失/降级 | API errors + evidence |
| Outbound confirm rate | 外链确认完成率 | audit |
| Member wallet views | 授权访问钱包 | consumer API |

**第一阶段：** 数据链路真实可查优先；完整可视化大盘可 Phase-2，但 **M-04 漏斗一致性** 须能用手动/脚本验证。

---

## 5. Cursor 拟人化真实测试标准（不可省略）

Agent 自测须模拟**真实商户员工/老板/消费者**路径，不是只跑 unit。

### 5.1 必做层次

| 层次 | 要求 |
| ---- | ---- |
| L1 契约 | typecheck + build + 适用 `tests/*.test.mjs` / vitest |
| L2 API+DB | 矩阵相关 ID 的 HTTP + 租户隔离断言 |
| L3 Playwright | 390px 关键路径截图；Management/Platform 加 1024px |
| L4 拟人旅程 | 下表「最小拟人剧本」至少覆盖本切片相关角色 |
| L5 证据 | `evidence/<SLICE>/` 截图 + SUMMARY；更新 acceptance |

### 5.2 最小拟人剧本（Phase-1 全绿前须可复跑）

1. **消费者**：发现/进店 → Consult → 外链确认 → 入会 → 钱包
2. **员工**：登录 → 看到任务 → 跟进 → 核销会员
3. **老板**：登录 → 客户/归因 → 发放权益 → 看 ledger/撤销
4. **平台**：Run 失败可见 → 重试；Outbox DLQ 可 replay
5. **隔离**：第二 tenant 403/404 无泄漏

### 5.3 禁止

- 仅改文案不改链路即 PASS
- 仅截图无 DB/API 断言
- 代签 `PRODUCT_OWNER_UI_ACCEPTANCE.md`
- 用 seed 密码冒充生产账号做公网验收

### 5.4 人工闸门（主人）

`PRODUCT_OWNER_UI_ACCEPTANCE.md` + `pnpm human-pilot:start` — **仅主人** PASS 后可接公网。

---

## 6. 插件与扩展最大化原则

| 原则 | 实现 |
| ---- | ---- |
| 固定模块 + 白名单 | `HIGH_FIDELITY_TEMPLATE_SYSTEM` module catalog |
| 外链/能力 catalog | `external-actions` + store bind；不硬编码平台 URL |
| Connectors = 意图 | Platform connectors UI；不 fake 美团 API |
| Outbox 事件 | 新能力发 event + worker；不绕过 audit |
| MCP/未来插件 | 走 command whitelist（AI-01）；manual_required 默认 |
| 行业差异 | 四套 template family + `industry_config`；不复制四套 app |
| 租户品牌 | design tokens + `@oneday/ui`；不 per-page CSS |

**禁止：** 租户上传任意 HTML/JS；未授权 API 直写生产 secrets。

---

## 7. UI / 前后端多角色开放性与定制性

### 7.1 前端

| 机制 | 作用 |
| ---- | ---- |
| `@oneday/ui` + tokens | 统一组件与主题 |
| `menu DTO` + scopes | 角色菜单可配置、可扩展 |
| Storefront module renderer | Consumer 可配置模块顺序/可见性 |
| `operating_channels` | Consumer tab 数据驱动（过渡期五 tab fallback） |
| AdminShell product modes | Platform / Channel / Circle 隔离 |

### 7.2 后端

| 机制 | 作用 |
| ---- | ---- |
| RBAC + `data_scopes` | API 级范围；前端隐藏不替代 |
| Version + optimistic lock | 并发写安全 |
| Idempotency-Key | 公开写与核销幂等 |
| Tenant context | 全 API fail-closed |
| Published read model | Consumer 只读投影，可重建 |

### 7.3 定制边界（商用可落地）

- **可定制：** 品牌 token、模块顺序、行业模板、频道、外链卡片、角色菜单包、门店 scope
- **不可定制（第一阶段）：** 任意模块 HTML、自由拖拽 DAG、跨 tenant 数据、假第三方实时价

---

## 8. 商用落地闸门（与进度看板对齐）

| 闸门 | 标准 | 进度权重见 `PHASE1_PROGRESS.json` |
| ---- | ---- | -------------------------------- |
| AI 施工 | P1-A/B 切片 PASS + 证据 | 看板 % |
| G1 | 本地 HUMAN PILOT 可完整测 | 主人 |
| P1-D | `PRODUCT_OWNER_UI_ACCEPTANCE` 签字 | 主人 |
| P1-C | 公网 HTTPS + 冒烟（需 G 授权） | 主人物料 + AI |
| P1-E | 对外「受控商用试用」 | 主人 |

---

## 9. Headless 每轮施工必读（摘要）

每轮开始读：本文 §0–§8 → `PHASE1_PROGRESS.json` → 当前切片 acceptance 依赖。

每轮结束：更新 `PHASE1_PROGRESS.json` milestone、跑 L1–L5 适用项、写 evidence、**不得偏离 PRD**。

---

## 10. 引用

- 本地无人值守：`PROJECT_STATE/LOCAL_UNATTENDED_SETUP.md`
- 进度看板：`pnpm unattended:dashboard`
- 矩阵全表：`COMMERCIAL_ACCEPTANCE_MATRIX.md`
