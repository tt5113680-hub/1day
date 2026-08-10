# PRODUCT OWNER UI ACCEPTANCE — local HUMAN PILOT

> LOCAL TEST ONLY. This checklist is for product-owner visual/product sign-off.
> Engineering matrix P0 is COVERED 26/26; this document does **not** claim 全部商用,
> public HTTPS, Tencent Cloud, or customer enablement.

## Environment (verified engineering facts)

| Item                   | Value                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Branch                 | `hardening/COMMERCIAL-COMPLETION`                                                                    |
| Required HEAD baseline | see `evidence/HUMAN-PILOT-HANDOFF/POST_MATRIX_PREFLIGHT.md`                                          |
| Database               | `oneday_human_pilot` migrated through `053_sync_gateway`                                             |
| Ports                  | API `3200` / Consumer `3201` / Employee `3202` / Management `3203` / Platform `3204` / Worker `3205` |
| Accounts               | `PROJECT_STATE/LOCAL_HUMAN_PILOT_ACCOUNTS.md`                                                        |
| Runbook                | `PROJECT_STATE/LOCAL_HUMAN_PILOT_RUNBOOK.md`                                                         |

## Product-owner visual checklist

Fill `PASS / HOLD` only after opening the live localhost pages yourself.

1. Consumer store home (五栏：首页 / 团购 / 菜单 / 会员 / 我的)  
   URL: `http://127.0.0.1:3201/c/stores/30000000-0000-4000-8000-000000000021?tenant=luckin-oneday-human-pilot`  
   Expect: store facts, TEST ONLY platform offers, no claim of live third-party stock/price.  
   Decision: **PASS / HOLD** \_\_\_\_

2. Discovery → store continuity  
   URL: `http://127.0.0.1:3201/c/discovery?tenant=luckin-oneday-human-pilot&latitude=39.9087&longitude=116.4619`  
   Expect: published local placements only; enter Guomao test store.  
   Decision: **PASS / HOLD** \_\_\_\_

3. Outbound confirmation before external link  
   From store: phone / map / Meituan or Douyin TEST ONLY card → confirmation route → audit-preserving hand-off.  
   Decision: **PASS / HOLD** \_\_\_\_

4. Employee workbench after one consumer consult  
   URL: `http://127.0.0.1:3202/e/login` — `pilot.storemanager@oneday.local`  
   Expect: task from the consumer action; real bottom navigation ≤5.  
   Decision: **PASS / HOLD** \_\_\_\_

5. Management attribution / customer visibility  
   URL: `http://127.0.0.1:3203/login` — `pilot.owner@oneday.local`  
   Expect: same customer source/owner/task chain; no Tenant B leakage.  
   Decision: **PASS / HOLD** \_\_\_\_

6. Platform relationships honesty  
   URL: `http://127.0.0.1:3204/login` — `pilot.platform@oneday.local`  
   Expect: local channel/circle relationships; connectors not claimed as live external delivery.  
   Decision: **PASS / HOLD** \_\_\_\_

## Sign-off

| Field                | Value                    |
| -------------------- | ------------------------ |
| Product owner name   | \_\_\_\_                 |
| Date (Asia/Shanghai) | \_\_\_\_                 |
| Overall              | **PASS / HOLD** \_\_\_\_ |
| Notes / HOLD reasons | \_\_\_\_                 |

Engineering may refresh the sandbox and evidence. Only the product owner may mark this document PASS. A HOLD does not reopen matrix P0 waves unless a systemic defect is proven.
