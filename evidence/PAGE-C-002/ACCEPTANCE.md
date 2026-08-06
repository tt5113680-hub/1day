# PAGE-C-002 验收证据

- 交付 `/c/discovery?tenant=<slug>` 消费者发现页。渠道推荐、固定商圈和附近商户由三个独立的 tenant-scoped 数据模型和查询链路提供；固定商圈成员不会参与 LBS 计算，位置查询不会引用商圈成员关系。
- 公开只读 API `GET /api/v1/consumer/discovery` 仅接受受限 tenant slug；所有集合、商户及位置查询均以已启用租户的内部 ID 为范围。经纬度必须成对、为有限数值且在合法范围内，非法或缺失租户被拒绝。
- `tests/page-c-002-api.test.mjs` 启动构建后的 NestJS/Fastify API，并向 PostgreSQL 写入渠道、商圈、位置和隔离租户数据，实测正常读取、LBS 0km、跨租户不泄露、部分坐标 400 与未知租户 404。
- `playwright.page-c-002.config.ts` 使用构建 API 与 Next 页面，在 390px Chromium 写入独立租户、组织和三类真实商户数据后验证分离呈现、分类跳转、空态、定位入口及不可用状态。截图：`consumer-discovery-mobile.png`、`consumer-discovery-empty.png`、`consumer-discovery-forbidden.png`；追踪：`playwright-output/*/trace.zip`。
- 页面包含专用 loading、empty、error、forbidden 状态；位置请求未获授权时保留渠道与商圈发现入口，并提供可见反馈。所有操作控件保留键盘焦点样式及移动端适当点击区域。
