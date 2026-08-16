# Owner WeChat / webhook notify (optional)

- Reads gitignored `.env.local-unattended` for:
  - `OWNER_NOTIFY_WEBHOOK_URL` or `WECHAT_WEBHOOK_URL` (企业微信机器人 webhook 等)
- If unset: writes nothing to network; returns exit 0 after logging skip
- Does NOT enable any paid LLM

Usage:

```powershell
powershell -File scripts/owner-notify-wechat.ps1 -Message "ONEDAY blocked: ..."
```

Configure once in `.env.local-unattended`:

```env
OWNER_NOTIFY_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...
```
