'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AdminPageHeader, AppStatePanel, Button, Card, StatusBadge } from '@oneday/ui';
import { useRef, useState } from 'react';
import styles from './page.module.css';

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

type ProvisioningStep = {
  code: string;
  state: string;
  errorCode?: string | null;
  attempts?: number;
};

type ProvisioningRun = {
  runId: string;
  tenantId: string | null;
  slug: string;
  state: string;
  industry: string;
  plan: string;
  errorCode?: string | null;
  errorDetail?: string | null;
  delivery?: {
    oneCode?: string;
    consumerPath?: string;
    managementPath?: string;
    employeePath?: string;
  } | null;
  steps: ProvisioningStep[];
};

const stepLabels: Record<string, string> = {
  validate_reserve: '校验并保留租户标识',
  tenant_foundation: '创建租户与套餐基础',
  owner_role_packs: '创建老板与角色包',
  organization_store: '创建主体与首店',
  industry_template: '实例化行业模板',
  storefront_publish: '绑定并发布数字门店',
  commercial_defaults: '初始化经营对象',
  channel_circle: '登记渠道与商圈范围',
  one_code_delivery: '生成 ONE-CODE 交付入口',
  activate_verify: '验证四端访问与基础设施',
  ready_handoff: '生成 READY 交付包',
};

const stepTone = (state: string): 'success' | 'danger' | 'warning' | 'neutral' | 'info' => {
  if (state === 'succeeded') return 'success';
  if (state === 'failed') return 'danger';
  if (state === 'pending') return 'warning';
  if (state === 'skipped') return 'neutral';
  return 'info';
};

const stepLabel = (state: string) => {
  if (state === 'succeeded') return '完成';
  if (state === 'failed') return '失败';
  if (state === 'pending') return '未执行';
  if (state === 'skipped') return '跳过';
  return state;
};

export default function Onboarding() {
  const [form, setForm] = useState({
      slug: '',
      tenantName: '',
      organizationName: '',
      merchantName: '',
      storeName: '',
      address: '',
      phone: '',
      businessHours: '09:00-21:00',
      adminEmail: '',
      adminName: '',
      adminPassword: '',
      industry: 'restaurant',
      plan: 'starter',
      themeVariant: 'signature',
    }),
    [state, setState] = useState<'ready' | 'forbidden' | 'done' | 'error'>('ready'),
    [note, setNote] = useState(''),
    [run, setRun] = useState<ProvisioningRun | null>(null),
    [saving, setSaving] = useState(false),
    keyRef = useRef('');
  const update = (key: string, value: string) => setForm({ ...form, [key]: value });
  const refreshRun = async (runId: string) => {
    const response = await sessionApi.request(`${api}/api/v1/platform/onboarding/${runId}`, {
      headers: { 'x-request-id': crypto.randomUUID() },
    });
    if (!response.ok) throw Error('REFRESH');
    return (await response.json()).data as ProvisioningRun;
  };
  const submit = async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    if (!keyRef.current) keyRef.current = crypto.randomUUID();
    setSaving(true);
    try {
      const response = await sessionApi.request(`${api}/api/v1/platform/onboarding`, {
        method: 'POST',
        headers: { 'idempotency-key': keyRef.current, 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (response.status === 409) {
        keyRef.current = '';
        return setNote('租户标识或老板邮箱已存在，请更正后重试。');
      }
      if (!response.ok) throw Error();
      const result = (await response.json()).data as ProvisioningRun;
      setRun(result);
      setState(result.state === 'ready' ? 'done' : 'error');
      setNote(
        result.state === 'ready'
          ? `商户 ${result.slug} 已完成机器验证并进入 READY。`
          : `开通运行 ${result.runId} 状态 ${result.state}；请查看失败步骤后换标识重新开通。`,
      );
    } catch {
      setState('error');
      setNote('开通失败；若已生成运行记录，可刷新步骤轨迹后换标识重新开通。');
    } finally {
      setSaving(false);
    }
  };
  const retryFresh = () => {
    keyRef.current = '';
    setRun(null);
    setState('ready');
    setNote('已清空幂等键。请修正表单后重新提交（新的开通尝试，不是中途续跑）。');
  };
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="forbidden" title="无权开通租户" />
      </main>
    );
  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="ONEDAY / 商户商业开通"
        title="一次提交，生成可登录、可经营、可访问的 READY 商户"
        description="系统将创建老板与角色包、主体和首店、行业数字门店、经营默认项及 ONE-CODE，并逐步保存机器验收结果。失败时展示步骤轨迹；重新开通使用新的幂等键，不做中途续跑伪装。"
      />
      <Card className={styles.form}>
        <label>
          租户标识
          <input
            aria-label="租户标识"
            value={form.slug}
            onChange={(event) => update('slug', event.target.value)}
            placeholder="demo-merchant"
          />
        </label>
        <label>
          商户名称
          <input
            aria-label="商户名称"
            value={form.tenantName}
            onChange={(event) => update('tenantName', event.target.value)}
          />
        </label>
        <label>
          总部组织名称
          <input
            aria-label="总部组织名称"
            value={form.organizationName}
            onChange={(event) => update('organizationName', event.target.value)}
          />
        </label>
        <label>
          经营主体名称
          <input
            aria-label="经营主体名称"
            value={form.merchantName}
            onChange={(event) => update('merchantName', event.target.value)}
          />
        </label>
        <label>
          首店名称
          <input
            aria-label="首店名称"
            value={form.storeName}
            onChange={(event) => update('storeName', event.target.value)}
          />
        </label>
        <label>
          门店电话
          <input
            aria-label="门店电话"
            value={form.phone}
            onChange={(event) => update('phone', event.target.value)}
          />
        </label>
        <label className={styles.wide}>
          门店地址
          <input
            aria-label="门店地址"
            value={form.address}
            onChange={(event) => update('address', event.target.value)}
          />
        </label>
        <label>
          营业时间
          <input
            aria-label="营业时间"
            value={form.businessHours}
            onChange={(event) => update('businessHours', event.target.value)}
          />
        </label>
        <label>
          老板姓名
          <input
            aria-label="老板姓名"
            value={form.adminName}
            onChange={(event) => update('adminName', event.target.value)}
          />
        </label>
        <label>
          老板邮箱
          <input
            aria-label="老板邮箱"
            type="email"
            value={form.adminEmail}
            onChange={(event) => update('adminEmail', event.target.value)}
          />
        </label>
        <label>
          初始登录密码
          <input
            aria-label="初始登录密码"
            type="password"
            minLength={12}
            value={form.adminPassword}
            onChange={(event) => update('adminPassword', event.target.value)}
          />
        </label>
        <label>
          行业模板
          <select
            aria-label="行业模板"
            value={form.industry}
            onChange={(event) => update('industry', event.target.value)}
          >
            <option value="restaurant">餐饮数字门店</option>
            <option value="beauty">美业服务门店</option>
            <option value="education">教育校区</option>
            <option value="retail">新零售门店</option>
          </select>
        </label>
        <label>
          商业套餐
          <select
            aria-label="商业套餐"
            value={form.plan}
            onChange={(event) => update('plan', event.target.value)}
          >
            <option value="starter">起步版</option>
            <option value="growth">成长版</option>
            <option value="enterprise">企业版</option>
          </select>
        </label>
        <Button className={styles.submit} loading={saving} onClick={() => void submit()}>
          一键开通并验证 READY
        </Button>
      </Card>
      {note && (
        <div data-testid="provisioning-result">
        <Card className={styles.result}>
          <p className={styles.note} role="status">
            <StatusBadge tone={state === 'done' ? 'success' : 'danger'}>
              {state === 'done' ? 'READY' : '需要处理'}
            </StatusBadge>
            <span>{note}</span>
          </p>
          {run ? (
            <>
              {run.errorCode || run.errorDetail ? (
                <p className={styles.failure} data-testid="provisioning-error">
                  {run.errorCode ? `${run.errorCode}: ` : ''}
                  {run.errorDetail ?? '开通未完成'}
                </p>
              ) : null}
              <dl className={styles.delivery}>
                <div>
                  <dt>运行 ID</dt>
                  <dd>{run.runId}</dd>
                </div>
                <div>
                  <dt>ONE-CODE</dt>
                  <dd>{run.delivery?.oneCode ?? '—'}</dd>
                </div>
                <div>
                  <dt>行业 / 套餐</dt>
                  <dd>
                    {run.industry} / {run.plan}
                  </dd>
                </div>
              </dl>
              <ol className={styles.steps} data-testid="provisioning-steps">
                {run.steps.map((step) => (
                  <li key={step.code} data-step-state={step.state}>
                    <span>{stepLabels[step.code] ?? step.code}</span>
                    <StatusBadge tone={stepTone(step.state)}>{stepLabel(step.state)}</StatusBadge>
                  </li>
                ))}
              </ol>
              <div className={styles.actions}>
                {state !== 'done' ? (
                  <>
                    <Button
                      tone="secondary"
                      data-testid="provisioning-refresh"
                      onClick={() =>
                        void refreshRun(run.runId)
                          .then((next) => {
                            setRun(next);
                            setNote(`已刷新运行 ${next.runId}（状态 ${next.state}）。`);
                          })
                          .catch(() => setNote('无法刷新运行步骤，请稍后重试。'))
                      }
                    >
                      刷新步骤轨迹
                    </Button>
                    <Button data-testid="provisioning-retry-fresh" onClick={retryFresh}>
                      换标识后重新开通
                    </Button>
                  </>
                ) : null}
              </div>
            </>
          ) : null}
        </Card>
        </div>
      )}
    </main>
  );
}
