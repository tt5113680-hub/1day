# API 约定

## 路径

`/api/v1/{domain}/{resource}`

## 响应

```json
{
  "data": {},
  "meta": { "requestId": "..." },
  "error": null
}
```

## 错误

- VALIDATION_ERROR
- AUTH_REQUIRED
- FORBIDDEN
- NOT_FOUND
- CONFLICT
- RATE_LIMITED
- WORKFLOW_STATE_INVALID
- EXTERNAL_SERVICE_UNAVAILABLE
- INTERNAL_ERROR

## 强制头

- x-request-id
- x-tenant-context（服务端签发或解析）
- idempotency-key（创建订单、证据、成交等接口）

## 安全

- 所有写接口做权限和数据范围校验。
- 敏感字段脱敏。
- 导出接口异步化并写审计。
- Webhook 校验签名、时间戳、防重放。
