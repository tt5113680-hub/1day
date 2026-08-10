# G1 主人验收指南（本地人工闸门）

- 用途：工程侧已 **G1 READY**，现在由你本人在本机浏览器验收。
- 边界：这是 **本地试用**，不是公网 HTTPS，也不是「全部商用」签字。
- 预计时间：约 **30–60 分钟**。

---

## 0. 先打开验收入口页（推荐，一点就开）

双击或在资源管理器打开：

`D:\ONEDAY_V3\evidence\G1-PACKAGING\G1-ACCEPTANCE-LINKS.html`

页面上所有测试地址都是**可点击按钮**，不用复制粘贴。

或 PowerShell：

```powershell
Start-Process D:\ONEDAY_V3\evidence\G1-PACKAGING\G1-ACCEPTANCE-LINKS.html
```

---

## 0b. 确认服务已开（本机已开则可跳过）

打开 PowerShell：

```powershell
cd D:\ONEDAY_V3
pnpm human-pilot:start
```

健康检查（浏览器或 PowerShell）：

- API：http://127.0.0.1:3200/api/v1/health  
  应看到 `"status":"ok"` 且 `"database":"ready"`

当前工程已验证四端端口：**3201 / 3202 / 3203 / 3204**。

---

## 1. 统一测试账号（只用于本机）

| 用途 | 打开地址 | 租户标识 | 邮箱 | 密码 |
|------|----------|----------|------|------|
| 消费者 | 见下方链接 | 不用登录 | — | — |
| 店长（员工端） | http://127.0.0.1:3202/e/login | `luckin-oneday-human-pilot` | `pilot.storemanager@oneday.local` | `OnedayHumanPilot!2026` |
| 老板（管理端） | http://127.0.0.1:3203/login | `luckin-oneday-human-pilot` | `pilot.owner@oneday.local` | `OnedayHumanPilot!2026` |
| 平台 | http://127.0.0.1:3204/login | `system` | `pilot.platform@oneday.local` | `OnedayHumanPilot!2026` |

登录页顺序：**先填租户标识 → 再填邮箱和密码**。

完整账号表：`PROJECT_STATE/LOCAL_HUMAN_PILOT_ACCOUNTS.md`

---

## 2. 按顺序点一遍（推荐 6 步）

每步看完后，在 `PROJECT_STATE/PRODUCT_OWNER_UI_ACCEPTANCE.md` 对应项填 **PASS** 或 **HOLD**。

### 步骤 A — 消费者首页（五栏）

打开：

http://127.0.0.1:3201/c/stores/30000000-0000-4000-8000-000000000021?tenant=luckin-oneday-human-pilot

应看到：门店信息、底部五栏（首页 / 团购 / 菜单 / 会员 / 我的）、本地测试文案；**不要**当成真实外卖库存/价格。

### 步骤 B — 发现页进店

打开：

http://127.0.0.1:3201/c/discovery?tenant=luckin-oneday-human-pilot&latitude=39.9087&longitude=116.4619

点进「北京国贸测试店」一类本地推荐门店。

### 步骤 C — 做一次「到店咨询」

在门店页点 **「到店咨询（本地模拟）」** → 确认页点 **「记录咨询并获取口令」**。  
应成功生成本地口令/提示（只写本机库，不连外部平台）。

### 步骤 D — 员工端收到任务

1. 打开 http://127.0.0.1:3202/e/login  
2. 用店长账号登录  
3. 看工作台是否出现刚才消费者动作带来的客户/任务  
4. 填一条跟进并完成任务（可用假描述，禁止真实客户信息）

### 步骤 E — 管理端看同一条链路

1. 打开 http://127.0.0.1:3203/login  
2. 用老板账号登录  
3. 在客户/归因里应能看到：同一客户、来源、任务、跟进结果  
4. **不应**看到「餐饮 B」租户数据

### 步骤 F — 平台端诚实边界

1. 打开 http://127.0.0.1:3204/login  
2. 用平台账号登录（租户标识 `system`）  
3. 能进平台首页；外部连接器不要当成「已真实外发」

---

## 3. 怎么算验收通过

打开并填写：

`PROJECT_STATE/PRODUCT_OWNER_UI_ACCEPTANCE.md`

- 6 项都写 **PASS**，底部签你的名字 + 日期 + Overall **PASS** → **G1 人工闸门通过**  
- 任一项写 **HOLD** → 记下原因，把 HOLD 原因发给我，我按缺陷修（不算「全部商用」）

更细的逐步说明也可对照：

- `PROJECT_STATE/LOCAL_HUMAN_PILOT_RUNBOOK.md`（中文逐步）  
- `docs/PILOT_ACCEPTANCE_CHECKLIST.md`（正式清单，可后补）

---

## 4. 验收后下一步（先不用做）

| 闸门 | 谁做 | 条件 |
|------|------|------|
| G1 本地验收 | **你** | 本指南 |
| P1-C 公网 HTTPS | AI + 你 | 你明确说「授权公网 HTTPS / 腾讯云试点」并给云物料 |
| 对外说「受控试用」 | 你 | G1 +（如需）公网都绿之后 |

---

## 5. 出问题怎么喊我

把下面任一信息发我即可：

1. 哪一步（A–F）  
2. 浏览器看到的现象 / 截图  
3. 是 PASS 还是 HOLD，以及 HOLD 原因  

**不要**把本机测试密码改到公网，也**不要**把真实客户数据写进仓库。
