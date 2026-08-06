# PAGE-C-001 验收证据

- 交付 `/c/entry?tenant=<slug>` 消费者统一入口：品牌、场景、AI 推荐、服务/权益、咨询/行动入口和固定底部导航均由已发布消费者模板与外部动作的真实 PostgreSQL 数据驱动。
- 公共只读 API `GET /api/v1/consumer/entry` 仅接受受限租户 slug，拒绝非法输入与不存在/未启用租户；查询严格按租户 ID 范围，且不暴露认证或内部敏感字段。消费者动作按名称取最新配置并限制四项，避免重复入口干扰决策。
- 页面实现正常、空、不可用/无权限、加载边界和网络错误恢复状态；交互使用可见焦点和移动端 44px 以上点击区域，底部导航可操作。
- `tests/page-c-001-api.test.mjs` 以构建后的 NestJS/Fastify API 与 PostgreSQL 验证发布模板、行动入口、公共读取、非法输入、未找到租户和跨租户数据不泄露。
- `playwright.page-c-001.config.ts` 运行构建 API 与 Next 页面，验证 390px 移动端正常入口、导航交互、空状态和不可用状态。截图：`consumer-entry-mobile.png`、`consumer-entry-empty.png`、`consumer-entry-forbidden.png`；轨迹：`playwright-output/*/trace.zip`。
