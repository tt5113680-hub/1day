# 本地无人值守施工 — 一次性配置

- recorded_at: 2026-08-10 Asia/Shanghai
- executor: **Cursor Headless CLI** + **自适应调度器**
- owner rule: **本地跑，不要人工**

## 自适应调度（新）

每轮结束后写入 `logs/unattended/last-run.json`，调度器根据**任务大小 + 上一轮结果**决定：

| 因素 | 行为 |
| ---- | ---- |
| **任务大小** | 读 `PROJECT_STATE`：P1-B/视觉/Playwright → **large 180min**；小 chore → **small 60min**；默认 **medium 120min** |
| **上一轮 OK 且跑得久 (>90min)** | 冷却 **~55min** 再跑 |
| **上一轮 OK 且很快 (<20min)** | **~12min** 后继续 |
| **上一轮 TIMEOUT** | 下一轮 **加长 max**、**15min** 后重试 |
| **上一轮 FAIL** | **20min** 后重试 |
| **仍在跑 / 冷却中** | orchestrator **SKIP**（计划任务每 15min 唤醒但不一定开工） |
| **G1 READY** | 自动停，等你人工测 |

**监控第一轮 / 任意一轮：**

```powershell
pnpm unattended:status
```

## 一次性配置

```powershell
cd D:\ONEDAY_V3
Copy-Item .env.local-unattended.example .env.local-unattended
# 填 CURSOR_API_KEY；可选改 UNATTENDED_* 间隔

pnpm unattended:install    # 计划任务：每 15min 检查，满足条件才开工
# 或
pnpm unattended:daemon     # 自适应守护进程（推荐 24h）
```

## 状态文件

| 文件 | 含义 |
| ---- | ---- |
| `logs/unattended/last-run.json` | 上一轮：时长、exit、profile、是否首轮 |
| `logs/unattended/schedule.json` | 下一轮建议 max 分钟 + 冷却分钟 |
| `logs/unattended/daemon.log` | 人类可读摘要 |

## 手动强制跑一轮（忽略冷却）

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local-unattended-orchestrator.ps1 -Force
```

## 你仍只需出现两次

1. **G1**：`pnpm unattended:status` 显示 G1 ready → 人工完整测
2. **G2**：PASS 后给域名/服务器
