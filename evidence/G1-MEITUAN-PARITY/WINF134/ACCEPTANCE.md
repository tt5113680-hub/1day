# G1-W∞-134 ACCEPTANCE — 评价多平台标签 + 评分趋势（§2 densify）

- recorded_at: 2026-08-16 Asia/Shanghai
- task: `G1-R-REVIEWS-SOURCE-TREND` / W∞-134
- plan: `MEITUAN_DEPTH_OPTIMIZATION_PLAN.md` §2 评论/回复「多平台标签、评分趋势」
- executor: IDE Agent
- claim_boundary: 工程 PASS；非主人 UI 签验；无 GMV；不接第三方实时评价流；不伪造评分

## Delivered

1. `GET /api/v1/management/commerce/reviews/insights?days=7|14|30|90`
   - `bySource`：来源标签分布（total/pending/avgRating）
   - `ratingTrend`：按日均分与条数
   - `knownSources` + honest `disclaimer`
2. `GET .../reviews?source=` 按档案来源筛选；列表返回 `sourceLabel`
3. `/m/reviews`：多平台标签面板、评分趋势（窗口切换）、来源筛选 chips、行内来源标签
4. 早会 KPI 注记同步

## Evidence

- `node --test tests/g1-winf134-reviews-source-trend.test.mjs` → **2/2**
- `tests/g1-winf114-reviews-reply-queue.test.mjs` → **5/5**（回归）
- `pnpm typecheck` → 20/20；`pnpm test:unit` → 49/49
- api + management-web build OK

## Honest boundaries

source 仅为本地/导入/人工补录档案标签；不接美团/点评/抖音实时评价流；不代第三方回写；不伪造第三方评分。
