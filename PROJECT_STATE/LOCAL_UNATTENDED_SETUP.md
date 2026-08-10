# 本地无人值守施工 — 一次性配置

- recorded_at: 2026-08-10 Asia/Shanghai
- **施工总纲（不可偏离）：** `PROJECT_STATE/COMMERCIAL_EXECUTION_CHARTER.md`
- **推荐模式：专用机 / 24h 开机 + 每 10 分钟监控接龙**

## 你要的行为（已实现）

```text
每 10 分钟 ──► 上一轮还在跑？ ──是──► 等待，下轮再查
                  │
                  否（已跑完 + 冷却满 10min）
                  ▼
              自动开下一轮 Headless 施工
                  │
                  G1 READY ──► 自动停，通知你来人工测
```

- **不会**两轮同时写（锁文件）
- **不会**上一轮没跑完就叠任务
- **会**在上一轮成功后约 10 分钟接下一任务（`UNATTENDED_CHAIN_MODE=1`）

## 进度看板（别盲目等）

**实时大屏（30 秒刷新，含倒计时 + 百分比 + 预计完成时间）：**

```powershell
pnpm unattended:dashboard
```

**快照：**

```powershell
pnpm unattended:status
```

进度来源：`PROJECT_STATE/PHASE1_PROGRESS.json`（每轮施工后 agent 更新 milestone）。

示例：

```text
总进度  [################--------------------]  58.0%
已完成 58%  |  剩余 42%  |  剩余切片 6 项
距下次检查  00:07:32
预计 G1 就绪: ~18h
```

## 专用机 / 24h 开机 — 一条命令

```powershell
cd D:\ONEDAY_V3
powershell -ExecutionPolicy Bypass -File scripts/install-dedicated-build-machine.ps1
# 编辑 .env.local-unattended 填入 CURSOR_API_KEY（若安装脚本未带 key）
```

等价于：

1. 写入 `UNATTENDED_CHAIN_MODE=1` + `UNATTENDED_POLL_MINUTES=10`
2. 注册计划任务：**每 10 分钟**调用 orchestrator
3. orchestrator 只在「上一轮已结束」时真正开工

**电源：** 插电 **从不休眠**。Cursor IDE **不必**打开。

### 或用守护进程（不用计划任务）

```powershell
pnpm unattended:daemon
# 同样每 10 分钟监控 + 接龙
```

## 监控（不用盯 Cursor）

```powershell
pnpm unattended:status
```

看：`Total runs`、上一轮是否 `OK/TIMEOUT`、下一轮何时可跑、`Should run now?`

日志：`logs/unattended/daemon.log`

## 专用电脑 checklist

| 项 | 做法 |
| --- | --- |
| 仓库 | 克隆到 `D:\ONEDAY_V3`，分支 `hardening/COMMERCIAL-COMPLETION` |
| Node | 24 + pnpm 10 |
| Docker | 本地测试用 Postgres（可选，agent 自启） |
| API Key | `.env.local-unattended` 里 `CURSOR_API_KEY` |
| 施工 | `install-dedicated-build-machine.ps1` 一次 |
| 你的电脑 | 可关机；专用机 24h 跑即可 |
| 验收 | 收到 G1 READY 后 SSH/远程桌面过来 `pnpm human-pilot:start` 人工测 |

## 手动

```powershell
pnpm unattended:status                              # 看状态
powershell -File scripts/local-unattended-orchestrator.ps1 -Force   # 强制立刻一轮
Unregister-ScheduledTask -TaskName 'ONEDAY-V3-Unattended-Construction' -Confirm:$false
```

## 你仍只需出现两次

1. **G1** — 本地完整人工测（1–2 小时）
2. **G2** — PASS 后给域名/服务器
