# LOCAL HUMAN PILOT accounts

> **LOCAL TEST ONLY / 禁止生产使用。** 这些账号只写入本机 PostgreSQL 数据库 `oneday_human_pilot`，不属于 package seed、自动化测试库或任何公网环境。

- 统一强测试密码：`OnedayHumanPilot!2026`
- 瑞幸租户登录标识：`luckin-oneday-human-pilot`
- 餐饮 B 租户登录标识：`oneday-restaurant-b-human-pilot`
- 平台、渠道、商圈账号登录标识：`system`
- 消费者入口是公开匿名入口；**没有消费者邮箱或密码账号**。

| 账号                                  | 角色         | 所属租户                      | 所属门店/范围                                   |
| ------------------------------------- | ------------ | ----------------------------- | ----------------------------------------------- |
| `pilot.owner@oneday.local`            | Tenant Owner | 瑞幸咖啡 · ONEDAY测试模拟租户 | 全租户，三家测试店                              |
| `pilot.manager@oneday.local`          | 企业管理者   | 瑞幸咖啡 · ONEDAY测试模拟租户 | 全租户，三家测试店                              |
| `pilot.storemanager@oneday.local`     | 店长         | 瑞幸咖啡 · ONEDAY测试模拟租户 | 北京国贸测试店                                  |
| `pilot.employee01@oneday.local`       | 普通员工     | 瑞幸咖啡 · ONEDAY测试模拟租户 | 北京国贸测试店                                  |
| `pilot.employee02@oneday.local`       | 普通员工     | 瑞幸咖啡 · ONEDAY测试模拟租户 | 北京望京测试店                                  |
| `pilot.followup@oneday.local`         | 跟进员工     | 瑞幸咖啡 · ONEDAY测试模拟租户 | 北京中关村测试店（也有 `PILOTFOLLOWUP` 分享码） |
| `pilot.channel@oneday.local`          | 渠道负责人   | ONEDAY System                 | 本地真人试用渠道与瑞幸租户关系                  |
| `pilot.circle@oneday.local`           | 商圈负责人   | ONEDAY System                 | 本地真人试用商圈与瑞幸租户关系                  |
| `pilot.platform@oneday.local`         | 平台管理员   | ONEDAY System                 | 平台范围                                        |
| `pilot.tenantb.owner@oneday.local`    | Tenant Owner | ONEDAY测试餐饮B公司           | 餐饮B隔离测试店                                 |
| `pilot.tenantb.employee@oneday.local` | 普通员工     | ONEDAY测试餐饮B公司           | 餐饮B隔离测试店                                 |

三家瑞幸门店：北京国贸测试店、北京望京测试店、北京中关村测试店。
