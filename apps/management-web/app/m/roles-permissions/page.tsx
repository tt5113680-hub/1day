'use client';
import { SessionApiClient } from '@oneday/session-client';
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
export default function RolesPermissionsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading'),
    [roles, setRoles] = useState<Role[]>([]),
    [permissions, setPermissions] = useState<Permission[]>([]),
    [selected, setSelected] = useState<Role | null>(null),
    [reason, setReason] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    [note, setNote] = useState('');
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
  if (state === 'loading') return <main className={styles.centered}>正在加载角色与权限…</main>;
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <section>
          <h1>无权查看角色与权限</h1>
          <p>请使用具备经营管理权限的账号。</p>
        </section>
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <section>
          <h1>权限数据暂不可用</h1>
          <button onClick={() => void load()}>重新加载</button>
        </section>
      </main>
    );
  return (
    <main className={styles.page}>
      <header>
        <div>
          <p>ONEDAY / 角色与权限</p>
          <h1>在变更前看清权限范围与成员影响</h1>
          <span>高风险权限必须二次确认；最终校验、版本锁和审计均在服务端执行。</span>
        </div>
        <button onClick={() => void load()}>刷新</button>
      </header>
      {note && (
        <p role="status" className={styles.notice}>
          {note}
        </p>
      )}
      <section className={styles.grid}>
        <section className={styles.panel}>
          <h2>角色模板</h2>
          {roles.length ? (
            roles.map((role) => (
              <article className={styles.role} key={role.id}>
                <div>
                  <strong>{role.name}</strong>
                  <span>
                    {role.code} · 影响 {role.member_count} 位成员
                  </span>
                  <p>{role.permissions.join('、') || '暂无权限'}</p>
                </div>
                <button
                  onClick={() => setSelected({ ...role, permissions: [...role.permissions] })}
                >
                  查看与变更
                </button>
              </article>
            ))
          ) : (
            <p>暂无角色。</p>
          )}
        </section>
        {selected ? (
          <section className={styles.panel}>
            <h2>变更 {selected.name}</h2>
            <p>该变更将影响 {selected.member_count} 位成员。</p>
            <div className={styles.permissions}>
              {permissions.map((permission) => (
                <label key={permission.code}>
                  <input
                    type="checkbox"
                    checked={selected.permissions.includes(permission.code)}
                    onChange={() => toggle(permission.code)}
                  />
                  <span>
                    {permission.code}
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
              <button onClick={() => setSelected(null)}>取消</button>
              <button className={styles.primary} onClick={() => void save()}>
                确认权限变更
              </button>
            </div>
          </section>
        ) : (
          <section className={styles.panel}>
            <h2>影响预览</h2>
            <p>选择角色即可审查权限范围、受影响成员数与高风险权限提示。</p>
          </section>
        )}
      </section>
    </main>
  );
}
