# LOCAL HUMAN PILOT RUNBOOK

> **LOCAL TEST ONLY / 禁止生产使用。** 当前为 localhost HTTP 试用环境，不是公网 HTTPS 试点。请在每项最后的 `PASS / FAIL` 处手工填写结果。

## 先打开的地址

消费者入口：`http://127.0.0.1:3171/c/entry?tenant=luckin-oneday-human-pilot`

本机服务：API `http://127.0.0.1:3001`、Worker `http://127.0.0.1:3002/health`、员工端 `http://127.0.0.1:3172/e/login`、管理端 `http://127.0.0.1:3173/login`、平台端 `http://127.0.0.1:3174/login`。

所有密码、租户标识和账号见 [LOCAL_HUMAN_PILOT_ACCOUNTS.md](LOCAL_HUMAN_PILOT_ACCOUNTS.md)。登录页先填“租户标识”，再填邮箱和统一本地测试密码。

## 1. 消费者进入瑞幸测试商户

- 打开：`http://127.0.0.1:3171/c/entry?tenant=luckin-oneday-human-pilot`
- 账号：不登录，保持匿名。
- 点击：查看“立即行动”，再点“到店咨询（本地模拟）”。
- 应看到：瑞幸本地测试入口、门店/服务文案和咨询动作；不会要求消费者邮箱登录。
- PASS / FAIL：**\_\_\_\_**

## 2. 浏览发现页并点击进店

- 打开：`http://127.0.0.1:3171/c/discovery?tenant=luckin-oneday-human-pilot&latitude=39.9087&longitude=116.4619`
- 账号：不登录。
- 点击：在“本地推荐门店”或“国贸本地测试商圈”中点“瑞幸咖啡 · ONEDAY测试模拟租户”，进入“北京国贸测试店”。
- 应看到：门店地址、本地试用咨询、权益和“到店咨询（本地模拟）”动作。
- PASS / FAIL：**\_\_\_\_**

## 3. 执行消费者动作

- 打开：第 2 步的北京国贸测试店，或直接打开 `http://127.0.0.1:3171/c/stores/30000000-0000-4000-8000-000000000021?tenant=luckin-oneday-human-pilot`。
- 账号：不登录。
- 点击：“到店咨询（本地模拟）”，在确认页点“记录咨询并获取口令”。
- 应看到：成功提示和本地口令；该动作只写入本地模拟客户、来源、店长任务、审计和 Outbox，不连接外部平台。
- PASS / FAIL：**\_\_\_\_**

## 4. 员工登录并收到客户/任务

- 打开：`http://127.0.0.1:3172/e/login`
- 账号：租户标识 `luckin-oneday-human-pilot`；`pilot.storemanager@oneday.local`。
- 点击：登录后进入工作台，打开最新客户提醒/任务。
- 应看到：刚才消费者动作生成的客户和待跟进任务；只看到该店长自己的工作。
- PASS / FAIL：**\_\_\_\_**

## 5. 员工完成跟进和证据

- 打开：仍在员工端的任务详情页。
- 账号：保持 `pilot.storemanager@oneday.local` 登录。
- 点击：填写“跟进记录”；按页面流程新增结果/证据并完成任务。可使用任意本地模拟描述，禁止真实客户信息。
- 应看到：跟进记录、结果/证据状态和任务完成状态；刷新后仍保留。
- PASS / FAIL：**\_\_\_\_**

## 6. 老板查看客户、来源、员工、任务、结果

- 打开：`http://127.0.0.1:3173/login`
- 账号：租户标识 `luckin-oneday-human-pilot`；`pilot.owner@oneday.local`（或 `pilot.manager@oneday.local`）。
- 点击：登录后先看经营总览，再打开“客户资产”、刚生成的客户详情、归因和员工过程绩效。
- 应看到：同一客户的来源、负责人/店长、任务、跟进和证据/结果链路；不应出现餐饮B数据。
- PASS / FAIL：**\_\_\_\_**

## 7. 平台/渠道查看企业与关系

- 打开：`http://127.0.0.1:3174/login`
- 账号：租户标识 `system`；先用 `pilot.platform@oneday.local`。
- 点击：平台总览、渠道、商圈；可退出后分别用 `pilot.channel@oneday.local` 和 `pilot.circle@oneday.local` 做只读边界检查。
- 应看到：本地真人试用渠道、瑞幸测试租户关系和本地真人试用商圈；均为本地模拟，不代表外部连接器已授权或已交付。
- PASS / FAIL：**\_\_\_\_**

## 8. 第二租户跨租户隔离测试

- 打开：`http://127.0.0.1:3173/login`
- 账号：租户标识 `oneday-restaurant-b-human-pilot`；`pilot.tenantb.owner@oneday.local`。
- 点击：登录后打开客户资产；随后手工粘贴第 6 步瑞幸客户详情页的 URL。
- 应看到：餐饮B只显示自己的空/本地数据；访问瑞幸客户详情被拒绝或显示不可用，绝不能显示瑞幸客户信息。
- PASS / FAIL：**\_\_\_\_**

## 9. logout / refresh / 权限测试

- 打开：员工端 `http://127.0.0.1:3172/e/login` 和管理端 `http://127.0.0.1:3173/login`。
- 账号：先以 `pilot.employee01@oneday.local`（租户标识 `luckin-oneday-human-pilot`）登录员工端；另开窗口使用同一账号尝试管理端。
- 点击：员工端刷新页面确认会话恢复；点击“退出登录”后刷新；管理端尝试进入客户资产。
- 应看到：刷新后员工会话仍有效；退出后回到登录；普通员工访问管理客户资产被拒绝，不能越权。
- PASS / FAIL：**\_\_\_\_**

如服务未运行，在仓库根目录执行 `pnpm.cmd human-pilot:start`。该脚本只针对 `oneday_human_pilot`，会构建、迁移并幂等写入本地真人试用数据；它不会启动 Redis，也不会连接公网。
