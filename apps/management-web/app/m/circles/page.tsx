'use client';

import { SessionApiClient } from '@oneday/session-client';
import { AdminPageHeader, AppStatePanel, Button, Card } from '@oneday/ui';
import { useCallback, useEffect, useState } from 'react';
import styles from './page.module.css';

type Owned = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  industryTag: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  publicVisible: boolean;
  merchantCount: number;
  pendingApplications: number;
};
type Nearby = {
  id: string;
  name: string;
  description: string | null;
  industryTag: string | null;
  address: string | null;
  owner: { slug: string; name: string };
  myApplicationStatus: string | null;
};
type Application = {
  id: string;
  source: string;
  status: string;
  note: string | null;
  createdAt: string;
  circle: { id: string; name: string };
  applicant: { slug: string; name: string };
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);

export default function ManagementCirclesPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [owned, setOwned] = useState<Owned[]>([]);
  const [nearby, setNearby] = useState<Nearby[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [note, setNote] = useState('');
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    industryTag: '餐饮',
    address: '',
    latitude: '',
    longitude: '',
    publicVisible: true,
  });
  const [invite, setInvite] = useState({ circleId: '', applicantTenantSlug: '', note: '' });

  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const [listRes, appRes] = await Promise.all([
        sessionApi.request(`${api}/api/v1/management/circles`, { headers: {} }),
        sessionApi.request(`${api}/api/v1/management/circles/applications`, { headers: {} }),
      ]);
      if ([401, 403].includes(listRes.status) || [401, 403].includes(appRes.status))
        return setState('forbidden');
      if (!listRes.ok || !appRes.ok) throw Error();
      const list = (await listRes.json()).data as { owned: Owned[]; nearbyToJoin: Nearby[] };
      const apps = (await appRes.json()).data as { items: Application[] };
      setOwned(list.owned);
      setNearby(list.nearbyToJoin);
      setApplications(apps.items);
      const firstOwned = list.owned[0];
      if (firstOwned && !invite.circleId)
        setInvite((prev) => ({ ...prev, circleId: firstOwned.id }));
      setState('ready');
    } catch {
      setState('error');
    }
  }, [invite.circleId]);

  useEffect(() => void load(), [load]);

  const createCircle = async () => {
    try {
      const response = await sessionApi.request(`${api}/api/v1/management/circles`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          description: form.description || null,
          industryTag: form.industryTag || null,
          addressLabel: form.address || null,
          latitude: form.latitude ? Number(form.latitude) : null,
          longitude: form.longitude ? Number(form.longitude) : null,
          publicVisible: form.publicVisible,
        }),
      });
      if (!response.ok) throw Error();
      setNote('商圈已创建（经营者身份）。');
      setForm((prev) => ({ ...prev, code: '', name: '', description: '' }));
      await load();
    } catch {
      setNote('创建失败：请检查编码/名称与坐标。');
    }
  };

  const togglePublic = async (circle: Owned) => {
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/management/circles/${encodeURIComponent(circle.id)}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ publicVisible: !circle.publicVisible }),
        },
      );
      if (!response.ok) throw Error();
      setNote(!circle.publicVisible ? '已开启公开引流。' : '已关闭公开引流。');
      await load();
    } catch {
      setNote('公开引流开关保存失败。');
    }
  };

  const sendInvite = async () => {
    try {
      const response = await sessionApi.request(`${api}/api/v1/management/circles/invite`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(invite),
      });
      if (!response.ok) throw Error();
      void sessionApi.request(`${api}/api/v1/management/entry-funnel/events`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          events: [
            {
              eventCode: 'circle_invite',
              surface: 'circle',
              moduleKey: 'circle_manager_invite',
              actorRole: 'boss',
              device: 'pc',
              circleId: invite.circleId,
              scene: 'management_invite',
              payload: { applicantTenantSlug: invite.applicantTenantSlug },
            },
          ],
        }),
      });
      setNote('邀约已发出并入圈（经理邀约即时生效）。');
      setInvite((prev) => ({ ...prev, applicantTenantSlug: '', note: '' }));
      await load();
    } catch {
      setNote('邀约失败：请确认商圈与对方租户 slug。');
    }
  };

  const applyJoin = async (circleId: string) => {
    try {
      const response = await sessionApi.request(`${api}/api/v1/management/circles/apply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ circleId, note: '希望加入商家互助商圈' }),
      });
      if (!response.ok) throw Error();
      void sessionApi.request(`${api}/api/v1/management/entry-funnel/events`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          events: [
            {
              eventCode: 'circle_apply',
              surface: 'circle',
              moduleKey: 'circle_merchant_apply',
              actorRole: 'boss',
              device: 'pc',
              circleId,
              scene: 'management_apply',
            },
          ],
        }),
      });
      setNote('入圈申请已提交。');
      await load();
    } catch {
      setNote('申请失败：商圈可能未公开或已申请。');
    }
  };

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/management/circles/applications/${encodeURIComponent(id)}/decide`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ decision }),
        },
      );
      if (!response.ok) throw Error();
      setNote(decision === 'approved' ? '已批准入圈。' : '已拒绝申请/邀约。');
      await load();
    } catch {
      setNote('审批失败。');
    }
  };

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="loading" title="正在加载商圈" description="经营者与附近商圈双身份。" />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="forbidden"
          title="无权管理商圈"
          description="请使用具备租户推广员工具权限的账号。"
        />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="商圈暂不可用"
          description="加载失败，请重试。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );

  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="ONEDAY / 推广员工具 · 商圈双身份"
        title="经营自己的商圈，也能申请加入附近商圈"
        description="经理可邀约商家；商家可浏览公开商圈并申请。不碰钱、不碰销售。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新
          </Button>
        }
      />
      {note ? (
        <p className={styles.notice} role="status">
          {note}
        </p>
      ) : null}

      <div className={styles.grid}>
        <Card className={styles.panel}>
          <h2>创建商圈（经营者）</h2>
          <div className={styles.form}>
            <label>
              编码
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="downtown-food"
              />
            </label>
            <label>
              名称
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="城南美食联盟"
              />
            </label>
            <label>
              行业标签
              <input
                value={form.industryTag}
                onChange={(e) => setForm({ ...form, industryTag: e.target.value })}
              />
            </label>
            <label>
              说明
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label>
              地址
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </label>
            <label>
              纬度
              <input
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                placeholder="31.2304"
              />
            </label>
            <label>
              经度
              <input
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                placeholder="121.4737"
              />
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={form.publicVisible}
                onChange={(e) => setForm({ ...form, publicVisible: e.target.checked })}
              />
              公开引流（出现在附近商圈）
            </label>
            <Button onClick={() => void createCircle()}>创建</Button>
          </div>
        </Card>

        <Card className={styles.panel}>
          <h2>我管理的商圈</h2>
          <ul className={styles.list}>
            {owned.length ? (
              owned.map((circle) => (
                <li key={circle.id}>
                  <div>
                    <strong>{circle.name}</strong>
                    <p>
                      {circle.merchantCount} 商家 · 待审 {circle.pendingApplications} ·{' '}
                      {circle.publicVisible ? '公开' : '私密'}
                    </p>
                  </div>
                  <Button tone="secondary" onClick={() => void togglePublic(circle)}>
                    {circle.publicVisible ? '关闭公开' : '开启公开'}
                  </Button>
                </li>
              ))
            ) : (
              <li className={styles.empty}>尚未创建商圈。</li>
            )}
          </ul>
        </Card>

        <Card className={styles.panel}>
          <h2>邀约商家入圈</h2>
          <div className={styles.form}>
            <label>
              商圈
              <select
                value={invite.circleId}
                onChange={(e) => setInvite({ ...invite, circleId: e.target.value })}
              >
                <option value="">选择商圈</option>
                {owned.map((circle) => (
                  <option key={circle.id} value={circle.id}>
                    {circle.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              对方租户 slug
              <input
                value={invite.applicantTenantSlug}
                onChange={(e) => setInvite({ ...invite, applicantTenantSlug: e.target.value })}
                placeholder="other-tenant-slug"
              />
            </label>
            <label>
              备注
              <input
                value={invite.note}
                onChange={(e) => setInvite({ ...invite, note: e.target.value })}
              />
            </label>
            <Button onClick={() => void sendInvite()}>发出邀约</Button>
          </div>
        </Card>

        <Card className={styles.panel}>
          <h2>申请 / 邀约审批</h2>
          <ul className={styles.list}>
            {applications.length ? (
              applications.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>
                      {item.circle.name} · {item.applicant.name}
                    </strong>
                    <p>
                      {item.source === 'invite' ? '邀约' : '申请'} · {item.status}
                      {item.note ? ` · ${item.note}` : ''}
                    </p>
                  </div>
                  {item.status === 'pending' ? (
                    <div className={styles.actions}>
                      <Button onClick={() => void decide(item.id, 'approved')}>批准</Button>
                      <Button tone="secondary" onClick={() => void decide(item.id, 'rejected')}>
                        拒绝
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))
            ) : (
              <li className={styles.empty}>暂无申请记录。</li>
            )}
          </ul>
        </Card>

        <Card className={styles.panelWide}>
          <h2>附近公开商圈（消费者/加盟视角）</h2>
          <ul className={styles.list}>
            {nearby.length ? (
              nearby.map((circle) => (
                <li key={circle.id}>
                  <div>
                    <strong>{circle.name}</strong>
                    <p>
                      {circle.owner.name} · {circle.industryTag ?? '联盟'}
                      {circle.myApplicationStatus
                        ? ` · 我的状态 ${circle.myApplicationStatus}`
                        : ''}
                    </p>
                  </div>
                  {!circle.myApplicationStatus || circle.myApplicationStatus === 'rejected' ? (
                    <Button onClick={() => void applyJoin(circle.id)}>申请加入</Button>
                  ) : (
                    <span className={styles.tag}>{circle.myApplicationStatus}</span>
                  )}
                </li>
              ))
            ) : (
              <li className={styles.empty}>暂无其它租户的公开商圈。</li>
            )}
          </ul>
        </Card>
      </div>
    </main>
  );
}
