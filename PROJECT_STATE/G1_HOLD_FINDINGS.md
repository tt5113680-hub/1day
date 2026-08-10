# G1 主人验收 HOLD 纪要（2026-08-10）

- updated_at: 2026-08-10 23:27 Asia/Shanghai
- overall: **HOLD**（整改进行中；验收条已升格）
- strategy: `PRODUCT_DUAL_TRACK_STRATEGY.md`

## 主人最新裁决（2026-08-10 23:53）

- **四套面对齐美团：**
  - 消费者 H5 → 美团 App
  - 员工/商户 H5 → 美团商家端 App
  - 老板 PC → 美团商家端 PC
  - 平台/渠道 PC → 美团平台端 / 代理 PC
- **只有「工作流整合页」单独定制**
- 色系：**美团黄即可**；token 换肤
- 原则：**别猜怎么管理，对表复刻**
- 清单：`MEITUAN_PC_H5_PARITY_INVENTORY.md`

## 切片

| 序 | ID | 状态 |
| -- | ---- | ---- |
| R1 | `G1-R-MEITUAN-THEME` | **PASS**（主题） |
| R2 | `G1-R-BOSS-HOME` | 过渡 PASS（landing）→ 须升格美团 PC 对应页 1:1 |
| R3 | `G1-R-EMP-HOME` | 过渡 PASS（landing）→ 须升格美团对应页 1:1 |
| R4 | `G1-R-CONSUMER-SHELL` | 过渡 PASS（landing）→ 须升格美团 H5 1:1 |
| R5 | 渠道/平台省市区代理 | pending |
| R6+ | 美团 PC/H5 逐页清单 1:1（排除工作流整合页） | W0 PASS · **W1 PASS** · W2 next |
