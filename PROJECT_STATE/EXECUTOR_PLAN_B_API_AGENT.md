# Plan B — 稳定无人值守执行器（替代 Cursor Headless CLI）

- recorded_at: 2026-08-10 Asia/Shanghai
- owner_request: 原 Cursor Headless 方案不稳定，换其它方案
- status: **ACTIVE** (2026-08-10 — DeepSeek key configured, OpenCode installed)

## 为什么 Plan A（Cursor Headless）不稳定

| 事实 | 影响 |
| ---- | ---- |
| 账号套餐 **Free** | Headless CLI 一跑就 `usage limit` |
| 免费额度 **不按「你是否觉得用过」** | IDE 聊天、试跑、本月其它 Agent 都扣同一池 |
| Cursor **不公开** 免费额度数字 | 无法预测何时能跑、跑几轮 |
| 额度用尽 **不是等 6 小时就好** | 6h 只是我们避免空转的重试间隔；根因是 Cursor 拒跑 |

**结论：** 在 **不升 Pro** 前提下，**Cursor Headless 不能作为稳定 24h 无人值守执行器**。继续挂着只会周期性失败。

Plan A 已 **暂停**（计划任务 + daemon 已 disable）。

---

## Plan B（推荐）：OpenCode CLI + 自有 API Key

**思路：** 施工调度层（20 分钟轮询、锁、进度 JSON、G1 停）**不变**；只把底层从 `agent -p` 换成 **`opencode run`**，用 **按量付费 API**（不受 Cursor 免费额度影响）。

```text
每 20 分钟 orchestrator
        │
        ▼
  opencode run（DeepSeek / OpenRouter / OpenAI 等）
        │
        ▼
  同一套 prompt + CHARTER + TASK_QUEUE
        │
        G1 READY → 自动停
```

### 优点

- **稳定**：额度由 API 服务商按量计费，可预期
- **便宜**：DeepSeek 等模型施工成本通常 **几元～几十元/月** 量级（视任务量）
- **仍无人值守**：无需你盯 IDE、无需 Pro
- **单写入者**：仍只写 `D:\ONEDAY_V3`，锁文件逻辑可复用

### 你需要做一次（约 5 分钟）

1. 注册并拿到 API Key（任选其一）：
   - **DeepSeek**（推荐，便宜）→ https://platform.deepseek.com
   - **OpenRouter**（多模型聚合）→ https://openrouter.ai
   - 已有 OpenAI / Anthropic 也行

2. 在本机创建/编辑 `D:\ONEDAY_V3\.env.local-unattended`（已在 gitignore）：

```env
# Plan B — API executor (do not commit)
UNATTENDED_EXECUTOR=opencode
DEEPSEEK_API_KEY=sk-...          # 或 OPENROUTER_API_KEY / OPENAI_API_KEY
UNATTENDED_CHAIN_MODE=1
UNATTENDED_POLL_MINUTES=20
```

3. 回复一句：**「用 DeepSeek」**（或你选的 provider）——我会安装 OpenCode、改 construction 脚本、重新启用计划任务并试跑一轮。

### 授权说明

原授权 **I** 指定 Cursor Headless。你要求换方案后，Plan B 视为 **执行器替换**，施工总纲 / 分支 / 证据门槛 **不变**。

---

## Plan C（保底，不如 B 稳）：IDE 长会话半自动

- Cursor IDE 打开 + Auto-run，你偶尔发 `继续`
- **不符合**「完全无人值守」，但 **不依赖 Headless 额度**
- 仅当 **拒绝任何 API 费用** 时使用

---

## 当前动作

- [x] 暂停 Cursor Headless 计划任务（避免空转）
- [x] 安装 OpenCode + 切换 construction 脚本
- [x] DeepSeek API key 配置（`.env.local-unattended`，不入库）
- [ ] 首轮施工验证中 → 20 分钟全自动
