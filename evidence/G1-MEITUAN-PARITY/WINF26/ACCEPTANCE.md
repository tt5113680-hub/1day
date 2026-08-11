# G1-W∞-26 Tool-path experience parity — /m/settings operational-state copy aligned to promoter-tool identity

- slice: `G1-R-TOOL-PATH-EXPERIENCE`（体验对标细部·工具身份收尾·`/m/settings` 状态口径对齐）
- recorded_at: 2026-08-11 Asia/Shanghai
- status: **PASS** (engineering; not owner UI sign-off)
- branch: `hardening/COMMERCIAL-COMPLETION`

## Problem

W∞-25 aligned the Management pages' eyebrows to `推广员工具 · <菜单label>`, including `/m/settings` →
`推广员工具 · 工具设置`. But the settings page's **operational states** still named itself with the legacy
store-ops `经营设置` / `经营规则` / `经营权限` phrasing, contradicting the page's own eyebrow and its menu
label `工具设置`:

| Location | Old (store-ops) | New (tool identity) |
| -------- | --------------- | ------------------- |
| Header title | `${brand} 的可审计经营规则` | `${brand} 的可审计工具规则` |
| Success note | `经营设置已保存，并已记录审计与事件。` | `工具设置已保存，并已记录审计与事件。` |
| Loading title | `正在加载经营设置` | `正在加载工具设置` |
| Loading desc | `正在校验租户规则、版本与经营权限。` | `正在校验租户规则、版本与工具授权。` |
| Forbidden title | `无权查看租户经营设置` | `无权查看租户工具设置` |
| Forbidden desc | `请使用具备租户经营设置权限的账号。` | `请使用具备租户工具设置权限的账号。` |
| Error title | `经营设置暂不可用` | `工具设置暂不可用` |
| Error desc | `经营规则未能完成加载，请重试。` | `工具规则未能完成加载，请重试。` |
| Save button | `保存经营设置` | `保存工具设置` |

## Boundaries

- No native checkout / no order fulfillment / no payments (MH5-07/08 stay external hand-off GAP).
- Text/copy-only; **no schema, no DB migration, no API change**, no RBAC/permission change.
- Honest no-native-checkout / no-third-party-live-claim disclaimers preserved (全平台可见引流 · 不碰销售,
  `不含支付金额与第三方订单成功`, `不碰销售成交` 全保留).
- `priceSource '商户经营后台登记'` 数据溯源字段值（在 offers 页）保持不动（非页面框架文案，本切片未触碰）。
- Eyebrow `推广员工具 · 工具设置`（W∞-25 已设）保持，未回退。

## Delivered

- `apps/management-web/app/m/settings/page.tsx`：全部 9 处 store-ops 状态文案改挂 `工具设置`/`工具规则`/`工具授权`。
- `tests/e2e/management-settings.spec.ts`：随动更新 heading 断言 `可审计经营规则`→`可审计工具规则`、
  按钮 name `保存经营设置`→`保存工具设置`。
- 新增 `tests/g1-winf26-settings-tool-state-copy.test.mjs`（4 用例）。

无 JSON/DTO/API/RBAC 变更。设置保存/全平台可见引流等既有能力功能不变。

## Verify

```text
node --test tests/g1-winf26-settings-tool-state-copy.test.mjs  # 4/4 PASS
node --test tests/g1-winf*.test.mjs                            # 42/42 PASS (W∞-3..26)
node --test tests/g1-winf25-management-tool-eyebrow-alignment.test.mjs  # 5/5 PASS (regression)
node --test tests/*menu*.test.mjs                              # 4/4 PASS
pnpm typecheck                                                # 20/20 packages PASS
pnpm build                                                    # 20/20 packages PASS (management-web 27 routes)
pnpm test:unit                                                # 47 passed / 2 pre-existing token failures
npx eslint <changed files>                                    # clean
```

`pnpm test:unit` 的 2 个失败仍是已记录的 **pre-existing** 设计令牌陈旧断言
（`tokens.vitest.ts`、`storefront-renderer.vitest.ts` 对照已退休的绿色品牌），与本切片无关。
本切片未触碰 design tokens。

## Integrity note

本切片为纯文案 / aria / 状态标题对齐，未改 schema/DB/API，不复活本平台下单/收单。
全仓扫描确认 `apps/management-web/app/m/settings/` 不再残留 `经营设置`/`经营规则`/`经营权限`；`tests/`
不再引用 `可审计经营规则`/`保存经营设置`。`/m/settings` 页眉标 `推广员工具 · 工具设置` 与菜单「工具设置」
一致收尾。
