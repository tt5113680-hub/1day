import { SessionLogin } from '@oneday/session-client';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';

export default function Login() {
  return (
    <SessionLogin
      apiBase={api}
      deviceName="management-web"
      destination="/m/dashboard"
      title="管理端登录"
      subtitle="本地试用账号已预填，点登录即可"
      defaultTenantSlug="luckin-oneday-human-pilot"
      defaultEmail="pilot.owner@oneday.local"
      defaultPassword="OnedayHumanPilot!2026"
    />
  );
}
