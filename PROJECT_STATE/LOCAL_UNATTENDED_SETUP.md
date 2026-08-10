# 本地无人值守施工 — 一次性配置

- recorded_at: 2026-08-10 Asia/Shanghai
- executor: **Cursor Headless CLI** (`agent -p --force`) via scheduled task or daemon
- owner rule: **本地跑，不要人工** — 配置一次后无需开 Cursor 窗口、无需发「继续」

## 原理

| 问题 | 解法 |
| ---- | ---- |
| IDE Agent 上下文满要换窗 | 每轮 Headless CLI 是**新会话**，无 90% 换窗 |
| 人要盯着 | Windows **计划任务**或**守护进程**每 30 分钟自动跑一轮 |
| 并行写冲突 | 施工期**禁止** IDE Agent 与 Headless 同时写（见 `AGENTS.md` authorization I） |

## 一次性配置（约 5 分钟）

### 1. 确认 CLI 已安装

```powershell
agent --version
```

若无：`irm 'https://cursor.com/install?win32=true' | iex`

### 2. API Key

```powershell
cd D:\ONEDAY_V3
Copy-Item .env.local-unattended.example .env.local-unattended
# 编辑 .env.local-unattended，填入 CURSOR_API_KEY（勿提交 Git）
```

### 3. 电源

Windows 设置 → 电源 → 插电时 **从不休眠**（机器需常开；Cursor IDE **不必**打开）。

### 4. 选一种启动方式

**A. 计划任务（推荐，零窗口）**

```powershell
cd D:\ONEDAY_V3
powershell -ExecutionPolicy Bypass -File scripts/install-local-unattended-task.ps1 -IntervalMinutes 30
```

开机自动跑，每 30 分钟一轮。

**B. 守护进程（一条命令后台循环）**

```powershell
cd D:\ONEDAY_V3
Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File scripts/local-unattended-daemon.ps1' -WindowStyle Hidden
```

### 5. 停止

```powershell
Unregister-ScheduledTask -TaskName 'ONEDAY-V3-Unattended-Construction' -Confirm:$false
# 或结束 local-unattended-daemon.ps1 对应进程
```

## 日志与状态

| 路径 | 内容 |
| ---- | ---- |
| `logs/unattended/daemon.log` | 调度摘要 |
| `logs/unattended/run-*.log` | 每轮 agent 输出 |
| `PROJECT_STATE/BLOCKED_REPORT.md` | 真阻塞时 agent 写入；存在则自动跳过施工 |
| `PROJECT_STATE/LATEST_HANDOFF.md` | G1 READY 时你来人工测 |

## 你仍只需出现两次

1. **G1**：`LATEST_HANDOFF` 标记 G1 READY → 本地 `pnpm human-pilot:start` + 完整人工测
2. **G2**：PASS 后给域名/服务器 → P1-C 绑域

## 故障

- `CURSOR_API_KEY missing` → 检查 `.env.local-unattended`
- `SKIP: another run active` → 正常，防重入
- `BLOCKED_REPORT present` → 看报告，清阻塞后删除或更新报告再跑
