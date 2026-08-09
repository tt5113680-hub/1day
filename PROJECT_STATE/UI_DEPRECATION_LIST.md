# Commercial UI Foundation — Deprecation and Migration List

> 记录日期：2026-08-09（Asia/Shanghai）
> 目标：Batch 1 期间保留业务页面的局部 CSS 兼容层，同时明确收敛到 `@oneday/ui` 的路径；不得把本表当作长期双体系许可。

| 旧实现范围                                               | 当前替代                                    | 迁移批次  | 风险与处理                                                                                                   |
| -------------------------------------------------------- | ------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `@oneday/ui/foundation.css` 中的 token 定义              | `@oneday/design-tokens/foundation.css`      | Batch 1   | UI 包只保留兼容入口；应用不得再维护第二份 root token 定义。                                                  |
| 四端页面级 `button`、`input`、聚焦和 disabled CSS        | `Button` 与 foundation token/focus contract | Batch 1   | 写操作页面必须逐页验证 disabled、错误和键盘焦点，避免 CSS 优先级改变误伤提交。                               |
| 四端各自 `centered` loading/forbidden/error 块           | `AppStatePanel`                             | Batch 1   | 已迁移 Dashboard、Employee Workbench、Stores、Tenants；其余核心页按真实状态接口逐步替换。                    |
| Management/Platform 页面内 header 文案与刷新按钮         | `AdminPageHeader` + `Button`                | Batch 1   | 已迁移 Dashboard、Stores、Tenants；其它管理页保留旧 header，直至连同权限/筛选行为一起迁移。                  |
| Management/Platform 状态 pill                            | `StatusBadge`                               | Batch 1   | 业务状态枚举须先经商业文案映射，禁止直接展示 persisted enum。                                                |
| Employee 固定底栏和页面内伪导航                          | `EmployeeBottomNav` active-route contract   | Batch 1   | Workbench 内旧 `.nav` 仅为兼容残留，后续页面审计后删除，不能再新增。                                         |
| Consumer 独立门店 CSS card、banner、shortcut、offer 模块 | Tokenized Consumer business components      | Batch 2   | 这些组件需要与 Storefront published-template contract 同时收敛，Batch 1 不复制业务实体或建立第二套装修真源。 |
| 45 个 CSS module 中的局部卡片、表格与表单布局            | foundation token + Admin/Mobile primitives  | Batch 1–3 | 不做无差别替换；每个组件连同真实 loading/empty/error 和对应 Playwright 路径迁移。                            |

## 完成条件

## 2026-08-09 continuation record

- `AppStatePanel` now owns all four root loading, empty, error and permission routes, plus the Consumer and Employee critical nested loading boundaries previously capable of rendering blank content.
- The Workbench-local navigation residue is removed; `EmployeeBottomNav` is the sole fixed employee navigation surface.

1. 新页面或新交互不得再新增页面级颜色、圆角、阴影、按钮或状态体系；必须使用 token 与 primitive。
2. 每次迁移保留现有 Session、RBAC、tenant scope、幂等和审计行为，并通过关联回归。
3. Batch 2 Storefront 绑定完成后，Consumer business components 必须从硬编码派生数据迁入受控模块接口。
