'use client';
import { SessionApiClient } from '@oneday/session-client';
import { AppStatePanel, Button, StatusBadge } from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';
type Role = {
  id: string;
  code: string;
  name: string;
  version: number;
  permissions: string[];
  member_count: number;
};
type Permission = { code: string; name: string };
const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const sensitive = new Set(['tenant.manage', 'organization.manage', 'employee.manage']);
const permissionNames: Record<string, string> = {
  'tenant.read': '查看租户工具',
  'tenant.manage': '管理租户工具',
  'organization.read': '查看组织',
  'organization.manage': '管理组织',
  'employee.read': '查看员工',
  'employee.manage': '管理员工',
  'customer.read': '查看客户',
  'customer.manage': '管理客户',
  'task.read': '查看任务',
  'task.manage': '管理任务',
  'attribution.read': '查看归因',
  'attribution.manage': '管理归因',
  'ownership.approve': '审批客户归属',
  'action.read': '查看外部行动',
  'action.manage': '管理外部行动',
  'evidence.read': '查看业务证据',
  'evidence.manage': '管理业务证据',
  'page.read': '查看页面模板',
  'page.manage': '管理页面模板',
  'workflow.read': '查看运营流程',
  'workflow.manage': '管理运营流程',
  'platform.read': '查看平台治理',
  'platform.manage': '管理平台治理',
  'circle.manage': '管理商圈',
};
const permissionCopy = (permission: Permission) =>
  permission.name?.trim() || permissionNames[permission.code] || '受控业务权限';
export default function RolesPermissionsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading'),
    [roles, setRoles] = useState<Role[]>([]),
    [permissions, setPermissions] = useState<Permission[]>([]),
    [selected, setSelected] = useState<Role | null>(null),
    [reason, setReason] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    [note, setNote] = useState(''),
    [createCode, setCreateCode] = useState(''),
    [createName, setCreateName] = useState(''),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const r = await sessionApi.request(`${api}/api/v1/management/roles-permissions`, {
        headers: {},
      });
      if ([401, 403].includes(r.status)) return setState('forbidden');
      if (!r.ok) throw Error();
      const data = await r.json();
      setRoles(data.data.roles);
      setPermissions(data.data.permissions);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);
  const createRole = async () => {
    if (!createCode.trim() || !createName.trim()) {
      setNote('请填写角色编码与名称。');
      return;
    }
    setBusy(true);
    setNote('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/rbac/roles`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
        },
        body: JSON.stringify({ code: createCode, name: createName }),
      });
      if (!response.ok) throw new Error('CREATE');
      setCreateCode('');
      setCreateName('');
      setNote('角色已创建，可继续配置权限。');
      await load();
    } catch {
      setNote('角色未创建，请确认编码唯一且具备工具授权。');
    } finally {
      setBusy(false);
    }
  };
  const toggle = (code: string) =>
    selected &&
    setSelected({
      ...selected,
      permissions: selected.permissions.includes(code)
        ? selected.permissions.filter((x) => x !== code)
        : [...selected.permissions, code],
    });
  const save = async () => {
    if (!selected || !reason.trim()) return setNote('请填写权限变更原因。');
    const risky = selected.permissions.some((code) => sensitive.has(code));
    if (risky && !confirmed) return setNote('高风险权限需要确认影响范围。');
    const r = await sessionApi.request(`${api}/api/v1/rbac/roles/${selected.id}/permissions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        version: selected.version,
        permissionCodes: selected.permissions,
        reason,
        confirmation: 'CONFIRM_PERMISSION_CHANGE',
      }),
    });
    if (!r.ok) return setNote('权限未更新，请刷新后重试。');
    setNote('权限变更已确认并写入审计记录。');
    setSelected(null);
    setReason('');
    setConfirmed(false);
    await load();
  };
  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载角色与权限"
          description="正在校验角色范围、成员影响与高风险权限。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权查看角色与权限"
          description="请使用具备推广员工具权限的账号。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="权限数据暂不可用"
          description="角色与权限数据未能完成加载，请重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );
  const affectedMembers = roles.reduce((sum, role) => sum + role.member_count, 0);
  const memberLabel = (count: number) =>
    count <= 0 ? '无成员' : count <= 5 ? '轻量 1-5' : '活跃 6+';
  const scaleLabel = (count: number) =>
    count <= 0 ? '无权限' : count <= 5 ? '基础 1-5' : count <= 10 ? '中等 6-10' : '全量 11+';
  const memberCounts = new Map<string, number>();
  const scaleCounts = new Map<string, number>();
  const permissionCounts = new Map<string, number>();
  const sensitiveCounts = new Map<string, number>();
  for (const role of roles) {
    const memberKey = memberLabel(role.member_count);
    memberCounts.set(memberKey, (memberCounts.get(memberKey) ?? 0) + 1);
    const scaleKey = scaleLabel(role.permissions.length);
    scaleCounts.set(scaleKey, (scaleCounts.get(scaleKey) ?? 0) + 1);
    for (const code of role.permissions) {
      permissionCounts.set(code, (permissionCounts.get(code) ?? 0) + 1);
      if (sensitive.has(code)) {
        sensitiveCounts.set(code, (sensitiveCounts.get(code) ?? 0) + 1);
      }
    }
  }
  const byMember = [...memberCounts.entries()].map(([key, value]) => ({ key, value }));
  const byScale = [...scaleCounts.entries()].map(([key, value]) => ({ key, value }));
  const byPermission = [...permissionCounts.entries()]
    .map(([key, value]) => ({
      key: permissionNames[key] || key,
      value,
    }))
    .sort((a, b) => b.value - a.value);
  const bySensitive = [...sensitiveCounts.entries()].map(([key, value]) => ({
    key: permissionNames[key] || key,
    value,
  }));
  const rolesTotal = roles.length;
  const permissionTotal = [...permissionCounts.values()].reduce((sum, count) => sum + count, 0);
  const sensitiveTotal = [...sensitiveCounts.values()].reduce((sum, count) => sum + count, 0);
  return (
    <main className={styles.page} data-testid="management-roles-permissions">
      <header className={styles.topBar}>
        <span className={styles.topBarTitle}>推广员工具 · 角色权限</span>
        <button className={styles.topBarRefresh} type="button" onClick={() => void load()}>
          刷新权限
        </button>
      </header>

      <section className={styles.heroCard} aria-label="角色权限说明">
        <h1>在变更前看清权限范围与成员影响</h1>
        <p>
          可创建角色模板并变更权限；高风险权限必须二次确认；最终校验、版本锁和审计均在服务端执行。
        </p>
      </section>

      <section className={styles.summaryStrip} aria-label="角色权限概况">
        <div>
          <span>角色模板</span>
          <strong>{roles.length}</strong>
        </div>
        <div>
          <span>受影响的成员</span>
          <strong>{affectedMembers}</strong>
        </div>
        <div>
          <span>权限项</span>
          <strong>{permissions.length}</strong>
        </div>
        <div>
          <span>高风险权限</span>
          <strong>{sensitive.size}</strong>
        </div>
      </section>

      <section className={styles.distribution} aria-label="角色权限分布">
        <div className={styles.panelBlock}>
          <h2>成员负载分布</h2>
          <ul className={styles.bars}>
            {byMember.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${rolesTotal ? (b.value / rolesTotal) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!rolesTotal && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>权限规模分布</h2>
          <ul className={styles.bars}>
            {byScale.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${rolesTotal ? (b.value / rolesTotal) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!rolesTotal && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>权限项分布</h2>
          <ul className={styles.bars}>
            {byPermission.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${permissionTotal ? (b.value / permissionTotal) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!rolesTotal && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
        <div className={styles.panelBlock}>
          <h2>高风险权限持有分布</h2>
          <ul className={styles.bars}>
            {bySensitive.map((b) => (
              <li key={b.key} className={styles.barRow}>
                <span className={styles.barLabel}>{b.key}</span>
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${sensitiveTotal ? (b.value / sensitiveTotal) * 100 : 0}%`,
                    }}
                  />
                </span>
                <span className={styles.barValue}>{b.value}</span>
              </li>
            ))}
            {!sensitiveTotal && <li className={styles.barEmpty}>暂无记录</li>}
          </ul>
        </div>
      </section>

      <p className={styles.honest}>
        以上分布全部由已抓取的真实角色与权限档案行现场推导（source=local）：不接美团/抖音实时人事或绩效、不伪造第三方评分或成交、不包含本平台收款、非本平台下单。
      </p>

      {note && (
        <p role="status" className={styles.notice}>
          {note}
        </p>
      )}
      <article className={styles.create}>
        <h2>创建角色</h2>
        <div className={styles.createForm}>
          <label>
            编码
            <input
              aria-label="角色编码"
              value={createCode}
              onChange={(event) => setCreateCode(event.target.value)}
              maxLength={80}
            />
          </label>
          <label>
            名称
            <input
              aria-label="角色名称"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              maxLength={160}
            />
          </label>
          <Button disabled={busy} onClick={() => void createRole()}>
            创建角色
          </Button>
        </div>
      </article>
      <section className={styles.grid}>
        <article className={styles.panel}>
          <h2>角色模板</h2>
          {roles.length ? (
            roles.map((role) => (
              <article className={styles.role} key={role.id}>
                <div>
                  <strong>{role.name}</strong>
                  <span>影响 {role.member_count} 位成员</span>
                  <p>
                    {role.permissions
                      .map((code) => {
                        const permission = permissions.find((item) => item.code === code);
                        return permission ? permissionCopy(permission) : '受控业务权限';
                      })
                      .join('、') || '暂无权限'}
                  </p>
                </div>
                <Button
                  tone="secondary"
                  onClick={() => setSelected({ ...role, permissions: [...role.permissions] })}
                >
                  查看与变更
                </Button>
              </article>
            ))
          ) : (
            <AppStatePanel kind="empty" title="暂无角色" />
          )}
        </article>
        {selected ? (
          <article className={styles.panel}>
            <h2>变更 {selected.name}</h2>
            <p>
              <StatusBadge tone={selected.member_count ? 'warning' : 'neutral'}>
                影响 {selected.member_count} 位成员
              </StatusBadge>
            </p>
            <div className={styles.permissions}>
              {permissions.map((permission) => (
                <label key={permission.code}>
                  <input
                    type="checkbox"
                    checked={selected.permissions.includes(permission.code)}
                    onChange={() => toggle(permission.code)}
                  />
                  <span>
                    {permissionCopy(permission)}
                    {sensitive.has(permission.code) ? '（高风险）' : ''}
                  </span>
                </label>
              ))}
            </div>
            <label className={styles.reason}>
              变更原因
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={320}
              />
            </label>
            {selected.permissions.some((code) => sensitive.has(code)) && (
              <label className={styles.confirm}>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                我确认高风险权限会影响上述成员。
              </label>
            )}
            <div className={styles.actions}>
              <Button tone="secondary" onClick={() => setSelected(null)}>
                取消
              </Button>
              <Button onClick={() => void save()}>确认权限变更</Button>
            </div>
          </article>
        ) : (
          <article className={styles.panel}>
            <h2>影响预览</h2>
            <p>选择角色即可审查权限范围、受影响成员数与高风险权限提示。</p>
          </article>
        )}
      </section>
    </main>
  );
}
