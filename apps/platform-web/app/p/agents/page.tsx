'use client';
import { SessionApiClient } from '@oneday/session-client';
import {
  AdminPageHeader,
  AppStatePanel,
  Button,
  Card,
  StatusBadge,
  businessLabel,
} from '@oneday/ui';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

type Region = {
  id: string;
  code: string;
  name: string;
  level: 'province' | 'city' | 'district';
  parentRegionId: string | null;
  agentCount: number;
};
type Agent = {
  id: string;
  agentLevel: string;
  code: string;
  name: string;
  parentAgentId: string | null;
  regionId: string;
  regionName: string;
  regionLevel: string;
  regionCode: string;
  status: string;
  merchantCount: number;
};
type Affiliation = {
  id: string;
  agentId: string;
  merchantTenantId: string;
  affiliationStatus: string;
  slug: string;
  name: string;
  agentName: string;
  regionName: string;
};
type MerchantPool = { tenantId: string; slug: string; name: string; status: string };
type Data = {
  regions: Region[];
  agents: Agent[];
  affiliations: Affiliation[];
  merchantPool: MerchantPool[];
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const levelLabel = (level: string) =>
  ({ province: '省级', city: '市级', district: '区县' })[level] ?? level;
const agentStatusLabel = (status: string) => (status === 'active' ? '正常' : '已暂停');

const byLevel = (regions: Region[]) =>
  regions.reduce<Record<string, Region[]>>((acc, region) => {
    (acc[region.level] ??= []).push(region);
    return acc;
  }, {});

export default function AgentsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data>({ regions: [], agents: [], affiliations: [], merchantPool: [] });
  const [regionForm, setRegionForm] = useState({
    code: '',
    name: '',
    level: 'province',
    parentRegionId: '',
  });
  const [agentForm, setAgentForm] = useState({
    regionId: '',
    agentLevel: 'province',
    code: '',
    name: '',
    parentAgentId: '',
    status: 'active',
  });
  const [affiliateAgentId, setAffiliateAgentId] = useState('');
  const [merchantTenantId, setMerchantTenantId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!(await sessionApi.context())) return setState('forbidden');
    setState('loading');
    try {
      const response = await sessionApi.request(`${api}/api/v1/platform/agents`, {
        headers: {},
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (!response.ok) throw Error();
      setData((await response.json()).data);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => void load(), [load]);

  const pools = useMemo(() => byLevel(data.regions), [data.regions]);
  const agentByRegion = useMemo(() => {
    const map: Record<string, Agent[]> = {};
    for (const agent of data.agents) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      (map[agent.regionId] ??= []).push(agent);
    }
    return map;
  }, [data.agents]);

  const createRegion = async () => {
    setSaving(true);
    setNote('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/platform/agents/regions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-request-id': crypto.randomUUID() },
        body: JSON.stringify({
          ...regionForm,
          parentRegionId: regionForm.parentRegionId || undefined,
        }),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (response.status === 409) return setNote('该区域编码已存在，请更换。');
      if (response.status === 400) return setNote('请填写有效的区域信息（省级无需父级，市级/区县需选父级）。');
      if (!response.ok) throw Error();
      setNote('区域已建立，已纳入省市区代理树。');
      setRegionForm({ code: '', name: '', level: 'province', parentRegionId: '' });
      await load();
    } catch {
      setNote('区域创建失败，请检查输入后重试。');
    } finally {
      setSaving(false);
    }
  };

  const createAgent = async () => {
    setSaving(true);
    setNote('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/platform/agents`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-request-id': crypto.randomUUID() },
        body: JSON.stringify({
          ...agentForm,
          parentAgentId: agentForm.parentAgentId || undefined,
        }),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (response.status === 409) return setNote('该区域已有代理商，请更换区域。');
      if (response.status === 400) return setNote('请选择有效的区域并填写代理商信息。');
      if (!response.ok) throw Error();
      setNote('代理商已归属到省市区代理树。');
      setAgentForm({
        regionId: '',
        agentLevel: 'province',
        code: '',
        name: '',
        parentAgentId: '',
        status: 'active',
      });
      await load();
    } catch {
      setNote('代理商创建失败，请检查输入后重试。');
    } finally {
      setSaving(false);
    }
  };

  const affiliate = async () => {
    if (!affiliateAgentId || !merchantTenantId) return setNote('请选择代理商与可归属商户。');
    setSaving(true);
    setNote('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/platform/agents/${affiliateAgentId}/affiliate`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-request-id': crypto.randomUUID() },
          body: JSON.stringify({ merchantTenantId }),
        },
      );
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (response.status === 409) return setNote('该商户已归属该代理商。');
      if (response.status === 400) return setNote('商户不可用或参数无效，请选择有效商户。');
      if (!response.ok) throw Error();
      setNote('商户已入驻开通并归属到该省市区代理商。');
      setMerchantTenantId('');
      await load();
    } catch {
      setNote('商户归属失败，请检查后重试。');
    } finally {
      setSaving(false);
    }
  };

  if (state === 'loading')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="loading"
          title="正在加载省市区代理树"
          description="正在汇总区域、代理商与商户归属记录。"
        />
      </main>
    );
  if (state === 'forbidden')
    return (
      <main className={styles.centered}>
        <AppStatePanel kind="forbidden" title="无权查看省市区代理管理" />
      </main>
    );
  if (state === 'error')
    return (
      <main className={styles.centered}>
        <AppStatePanel
          kind="error"
          title="省市区代理暂不可用"
          description="网络或服务连接出现问题。"
          action={<Button onClick={() => void load()}>重新加载</Button>}
        />
      </main>
    );

  return (
    <main className={styles.page}>
      <AdminPageHeader
        eyebrow="ONEDAY / 平台代理管理"
        title="省市区代理树、商户入驻与归属"
        description="代理绑定省市区区域；商户入驻归属到具体代理商。本地试点记录，未接美团实时代理数据。"
        actions={
          <Button tone="secondary" onClick={() => void load()}>
            刷新
          </Button>
        }
      />
      {note && (
        <p role="status" className={styles.note}>
          {note}
        </p>
      )}
      <section className={styles.grid}>
        <Card className={styles.panel}>
          <h2>建立区域</h2>
          <label>
            区域编码
            <input
              aria-label="区域编码"
              value={regionForm.code}
              onChange={(event) => setRegionForm({ ...regionForm, code: event.target.value })}
              placeholder="GD"
            />
          </label>
          <label>
            区域名称
            <input
              aria-label="区域名称"
              value={regionForm.name}
              onChange={(event) => setRegionForm({ ...regionForm, name: event.target.value })}
            />
          </label>
          <label>
            层级
            <select
              aria-label="区域层级"
              value={regionForm.level}
              onChange={(event) => setRegionForm({ ...regionForm, level: event.target.value })}
            >
              <option value="province">省级</option>
              <option value="city">市级</option>
              <option value="district">区县</option>
            </select>
          </label>
          {regionForm.level !== 'province' ? (
            <label>
              父级省级/市级区域
              <select
                aria-label="父级区域"
                value={regionForm.parentRegionId}
                onChange={(event) =>
                  setRegionForm({ ...regionForm, parentRegionId: event.target.value })
                }
              >
                <option value="">选择父级区域</option>
                {[...(pools.province ?? []), ...(pools.city ?? [])].map((region) => (
                  <option key={region.id} value={region.id}>
                    {levelLabel(region.level)} · {region.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Button loading={saving} onClick={() => void createRegion()}>
            建立区域
          </Button>
        </Card>
        <Card className={styles.panel}>
          <h2>绑定代理商到区域</h2>
          <label>
            区域
            <select
              aria-label="代理区域"
              value={agentForm.regionId}
              onChange={(event) => setAgentForm({ ...agentForm, regionId: event.target.value })}
            >
              <option value="">选择区域</option>
              {data.regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {levelLabel(region.level)} · {region.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            代理层级
            <select
              aria-label="代理层级"
              value={agentForm.agentLevel}
              onChange={(event) => setAgentForm({ ...agentForm, agentLevel: event.target.value })}
            >
              <option value="province">省级代理</option>
              <option value="city">市级代理</option>
              <option value="district">区县代理</option>
            </select>
          </label>
          <label>
            代理商编码
            <input
              aria-label="代理商编码"
              value={agentForm.code}
              onChange={(event) => setAgentForm({ ...agentForm, code: event.target.value })}
              placeholder="gd-province-agent"
            />
          </label>
          <label>
            代理商名称
            <input
              aria-label="代理商名称"
              value={agentForm.name}
              onChange={(event) => setAgentForm({ ...agentForm, name: event.target.value })}
            />
          </label>
          <label>
            上级代理商
            <select
              aria-label="上级代理商"
              value={agentForm.parentAgentId}
              onChange={(event) => setAgentForm({ ...agentForm, parentAgentId: event.target.value })}
            >
              <option value="">无</option>
              {data.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}（{levelLabel(agent.agentLevel)}）
                </option>
              ))}
            </select>
          </label>
          <Button loading={saving} onClick={() => void createAgent()}>
            绑定代理商
          </Button>
        </Card>
      </section>
      <Card className={styles.affiliatePanel}>
        <h2>商户入驻开通 · 归属到代理商</h2>
        <select
          aria-label="选择代理商"
          value={affiliateAgentId}
          onChange={(event) => setAffiliateAgentId(event.target.value)}
        >
          <option value="">选择代理商</option>
          {data.agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}（{agent.regionName} · {levelLabel(agent.agentLevel)}）
            </option>
          ))}
        </select>
        <select
          aria-label="选择商户"
          value={merchantTenantId}
          onChange={(event) => setMerchantTenantId(event.target.value)}
        >
          <option value="">选择可归属商户</option>
          {data.merchantPool.map((merchant) => (
            <option key={merchant.tenantId} value={merchant.tenantId}>
              {merchant.name}（{merchant.slug}）
            </option>
          ))}
        </select>
        <Button
          disabled={!data.merchantPool.length || !data.agents.length}
          loading={saving}
          onClick={() => void affiliate()}
        >
          商户入驻归属
        </Button>
      </Card>
      <Card className={styles.tree}>
        <h2>省市区代理树</h2>
        {poolRows(data.regions, agentByRegion)}
      </Card>
      <Card className={styles.tree}>
        <h2>商户归属记录</h2>
        {data.affiliations.length ? (
          <div className={styles.affiliations}>
            {data.affiliations.map((affiliation) => (
              <div className={styles.affiliation} key={affiliation.id}>
                <div>
                  <strong>{affiliation.name}</strong>
                  <span className={styles.agentMeta}>
                    {affiliation.slug} · 归属 {affiliation.agentName}（{affiliation.regionName}）
                  </span>
                </div>
                <StatusBadge tone={affiliation.affiliationStatus === 'active' ? 'success' : 'warning'}>
                  {businessLabel(affiliation.affiliationStatus)}
                </StatusBadge>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>尚未归属任何商户。开通并归属后，代理商后台可见商户池。</p>
        )}
      </Card>
    </main>
  );

  function poolRows(regions: Region[], agentByRegion: Record<string, Agent[]>) {
    const roots = regions.filter((region) => !region.parentRegionId);
    const nodes = (parentId: string | null): Region[] => regions.filter((r) => r.parentRegionId === parentId);
    const render = (region: Region) => {
      const children = nodes(region.id);
      return (
        <article key={region.id}>
          <div className={styles.regionRow}>
            <div>
              <strong>{region.name}</strong>
              <span className={styles.agentMeta}>
                {levelLabel(region.level)} · {region.code}
              </span>
            </div>
            <span>代理商 {region.agentCount}</span>
          </div>
          <div className={styles.regionChildren}>
            {(agentByRegion[region.id] ?? []).map((agent) => (
              <div className={styles.agentCard} key={agent.id}>
                <header>
                  <div>
                    <strong>{agent.name}</strong>
                    <span className={styles.agentMeta}>
                      {agent.code} · {levelLabel(agent.agentLevel)}代理
                    </span>
                  </div>
                  <StatusBadge tone={agent.status === 'active' ? 'success' : 'warning'}>
                    {agentStatusLabel(agent.status)}
                  </StatusBadge>
                </header>
                <span className={styles.agentMeta}>归属商户 {agent.merchantCount} 家</span>
              </div>
            ))}
            {children.length ? children.map(render) : null}
          </div>
        </article>
      );
    };
    return roots.map(render);
  }
}
