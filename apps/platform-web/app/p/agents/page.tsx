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
type Quota = {
  id: string;
  agentId: string;
  merchantQuota: number;
  usedMerchants: number;
};
type Settlement = {
  id: string;
  agentId: string;
  agentName: string;
  regionName: string;
  periodCode: string;
  periodStart: string;
  periodEnd: string;
  settlementStatus: string;
  amountCents: string | number;
};
type Approval = {
  id: string;
  agentId: string;
  agentName: string;
  regionName: string;
  merchantTenantId: string;
  slug: string;
  name: string;
  approvalStatus: string;
};
type Data = {
  regions: Region[];
  agents: Agent[];
  affiliations: Affiliation[];
  merchantPool: MerchantPool[];
  quotas: Quota[];
  settlements: Settlement[];
  approvals: Approval[];
};

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const sessionApi = new SessionApiClient(api);
const levelLabel = (level: string) =>
  ({ province: '省级', city: '市级', district: '区县' })[level] ?? level;
const agentStatusLabel = (status: string) => (status === 'active' ? '正常' : '已暂停');
const settlementStatusLabel = (status: string) => (status === 'finalized' ? '已结算' : '结算中');
const approvalStatusLabel = (status: string) =>
  ({ pending: '待审批', approved: '已通过', rejected: '已驳回' })[status] ?? status;
const centsToYuan = (value: string | number) => Number(value ?? 0).toLocaleString('zh-CN');
const quotaFor = (quotas: Quota[], agentId: string) =>
  quotas.find((quota) => quota.agentId === agentId);

const byLevel = (regions: Region[]) =>
  regions.reduce<Record<string, Region[]>>((acc, region) => {
    (acc[region.level] ??= []).push(region);
    return acc;
  }, {});

export default function AgentsPage() {
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [data, setData] = useState<Data>({
    regions: [],
    agents: [],
    affiliations: [],
    merchantPool: [],
    quotas: [],
    settlements: [],
    approvals: [],
  });
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
  const [quotaAgentId, setQuotaAgentId] = useState('');
  const [merchantQuota, setMerchantQuota] = useState('50');
  const [settleAgentId, setSettleAgentId] = useState('');
  const [periodCode, setPeriodCode] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [unitCents, setUnitCents] = useState('100000');
  const [approvalAgentId, setApprovalAgentId] = useState('');
  const [approvalMerchantTenantId, setApprovalMerchantTenantId] = useState('');
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
      setNote('商户入驻归属失败，请检查后重试。');
    } finally {
      setSaving(false);
    }
  };

  const setQuota = async () => {
    if (!quotaAgentId) return setNote('请选择代理商。');
    setSaving(true);
    setNote('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/platform/agents/${quotaAgentId}/quota`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-request-id': crypto.randomUUID() },
        body: JSON.stringify({ merchantQuota: Number(merchantQuota) }),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (response.status === 400) return setNote('配额需为不小于已用商户数的非负整数。');
      if (!response.ok) throw Error();
      setNote('代理商入驻配额已更新。');
      await load();
    } catch {
      setNote('配额设置失败，请检查后重试。');
    } finally {
      setSaving(false);
    }
  };

  const createSettlement = async () => {
    if (!settleAgentId || !periodCode || !periodStart || !periodEnd)
      return setNote('请选择代理商并填写结算期编码、起止日期。');
    setSaving(true);
    setNote('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/platform/agents/${settleAgentId}/settlements`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-request-id': crypto.randomUUID() },
        body: JSON.stringify({ periodCode, periodStart, periodEnd }),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (response.status === 409) return setNote('该结算期编码已存在。');
      if (response.status === 400) return setNote('请填写有效的结算期编码（大写字码）与起止日期。');
      if (!response.ok) throw Error();
      setNote('结算期已开启（结算中）。');
      setPeriodCode('');
      setPeriodStart('');
      setPeriodEnd('');
      await load();
    } catch {
      setNote('结算期创建失败，请检查后重试。');
    } finally {
      setSaving(false);
    }
  };

  const finalizeSettlement = async (settlementId: string) => {
    setSaving(true);
    setNote('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/platform/agents/settlements/${settlementId}/finalize`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-request-id': crypto.randomUUID() },
          body: JSON.stringify({ unitCents: Number(unitCents) }),
        },
      );
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (response.status === 409) return setNote('该结算期已结算，不能重复结算。');
      if (!response.ok) throw Error();
      setNote('结算期已关闭，按当前归属商户数生成应收金额。');
      await load();
    } catch {
      setNote('结算失败，请检查后重试。');
    } finally {
      setSaving(false);
    }
  };

  const requestApproval = async () => {
    if (!approvalAgentId || !approvalMerchantTenantId)
      return setNote('请选择代理商与待入驻审批商户。');
    setSaving(true);
    setNote('');
    try {
      const response = await sessionApi.request(`${api}/api/v1/platform/agents/${approvalAgentId}/approvals`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-request-id': crypto.randomUUID() },
        body: JSON.stringify({ merchantTenantId: approvalMerchantTenantId }),
      });
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (response.status === 409) return setNote('该商户在该代理商下已有审批记录。');
      if (response.status === 400) return setNote('商户不可用或选择无效。');
      if (!response.ok) throw Error();
      setNote('已发起商户入驻开通审批（待审批）。');
      setApprovalMerchantTenantId('');
      await load();
    } catch {
      setNote('发起审批失败，请检查后重试。');
    } finally {
      setSaving(false);
    }
  };

  const decideApproval = async (approvalId: string, decision: 'approved' | 'rejected') => {
    setSaving(true);
    setNote('');
    try {
      const response = await sessionApi.request(
        `${api}/api/v1/platform/agents/approvals/${approvalId}/decide`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-request-id': crypto.randomUUID() },
          body: JSON.stringify({ approvalStatus: decision }),
        },
      );
      if ([401, 403].includes(response.status)) return setState('forbidden');
      if (response.status === 409) return setNote('该审批已处理，不能重复裁决。');
      if (response.status === 400) return setNote('裁决参数无效。');
      if (!response.ok) throw Error();
      setNote(decision === 'approved' ? '已通过：商户自动入驻归属到该代理商。' : '已驳回该入驻申请。');
      await load();
    } catch {
      setNote('审批裁决失败，请检查后重试。');
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

      <h2 className={styles.opsHeading}>代理商深层运营</h2>
      <section className={styles.opsGrid}>
        <Card className={styles.panel}>
          <h2>入驻配额</h2>
          <label>
            代理商
            <select
              aria-label="配额代理商"
              value={quotaAgentId}
              onChange={(event) => setQuotaAgentId(event.target.value)}
            >
              <option value="">选择代理商</option>
              {data.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}（{agent.regionName}）
                </option>
              ))}
            </select>
          </label>
          <label>
            可开通商户席位数
            <input
              aria-label="商户配额数"
              type="number"
              min="0"
              value={merchantQuota}
              onChange={(event) => setMerchantQuota(event.target.value)}
            />
          </label>
          <Button loading={saving} onClick={() => void setQuota()}>
            保存配额
          </Button>
        </Card>
        <Card className={styles.panel}>
          <h2>周期结算</h2>
          <label>
            代理商
            <select
              aria-label="结算代理商"
              value={settleAgentId}
              onChange={(event) => setSettleAgentId(event.target.value)}
            >
              <option value="">选择代理商</option>
              {data.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}（{agent.regionName}）
                </option>
              ))}
            </select>
          </label>
          <label>
            结算期编码
            <input
              aria-label="结算期编码"
              value={periodCode}
              onChange={(event) => setPeriodCode(event.target.value)}
              placeholder="2026-08"
            />
          </label>
          <label>
            起 / 止日期
            <span className={styles.dateRow}>
              <input
                aria-label="结算期起始日期"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                placeholder="2026-08-01"
              />
              <input
                aria-label="结算期结束日期"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
                placeholder="2026-08-31"
              />
            </span>
          </label>
          <label>
            每商户应收（元）
            <input
              aria-label="每商户应收金额"
              type="number"
              min="0"
              value={(Number(unitCents) / 100).toFixed(2)}
              onChange={(event) => setUnitCents(String(Math.round(Number(event.target.value) * 100)))}
            />
          </label>
          <Button loading={saving} onClick={() => void createSettlement()}>
            开启结算期
          </Button>
        </Card>
        <Card className={styles.panel}>
          <h2>入驻开通审批</h2>
          <label>
            代理商
            <select
              aria-label="审批代理商"
              value={approvalAgentId}
              onChange={(event) => setApprovalAgentId(event.target.value)}
            >
              <option value="">选择代理商</option>
              {data.agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}（{agent.regionName}）
                </option>
              ))}
            </select>
          </label>
          <label>
            待入驻商户
            <select
              aria-label="审批商户"
              value={approvalMerchantTenantId}
              onChange={(event) => setApprovalMerchantTenantId(event.target.value)}
            >
              <option value="">选择商户</option>
              {data.merchantPool.map((merchant) => (
                <option key={merchant.tenantId} value={merchant.tenantId}>
                  {merchant.name}（{merchant.slug}）
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={!data.merchantPool.length || !data.agents.length}
            loading={saving}
            onClick={() => void requestApproval()}
          >
            发起入驻开通审批
          </Button>
        </Card>
      </section>

      <Card className={styles.tree}>
        <h2>结算记录</h2>
        {data.settlements.length ? (
          <div className={styles.affiliations}>
            {data.settlements.map((settlement) => (
              <div className={styles.affiliation} key={settlement.id}>
                <div>
                  <strong>
                    {settlement.agentName} · {settlement.periodCode}
                  </strong>
                  <span className={styles.agentMeta}>
                    {settlement.regionName} · {settlement.periodStart} 至 {settlement.periodEnd} · 应收{' '}
                    {centsToYuan(settlement.amountCents)} 元
                  </span>
                </div>
                <StatusBadge
                  tone={settlement.settlementStatus === 'finalized' ? 'success' : 'warning'}
                >
                  {settlementStatusLabel(settlement.settlementStatus)}
                </StatusBadge>
                {settlement.settlementStatus === 'open' ? (
                  <Button
                    tone="secondary"
                    loading={saving}
                    onClick={() => void finalizeSettlement(settlement.id)}
                  >
                    结算
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>尚无结算记录。开启结算期后，可在此按归属商户数结算。</p>
        )}
      </Card>

      <Card className={styles.tree}>
        <h2>入驻开通审批记录</h2>
        {data.approvals.length ? (
          <div className={styles.affiliations}>
            {data.approvals.map((approval) => (
              <div className={styles.affiliation} key={approval.id}>
                <div>
                  <strong>
                    {approval.name}（{approval.slug}）
                  </strong>
                  <span className={styles.agentMeta}>
                    归属 {approval.agentName}（{approval.regionName}）
                  </span>
                </div>
                <StatusBadge
                  tone={
                    approval.approvalStatus === 'approved'
                      ? 'success'
                      : approval.approvalStatus === 'rejected'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {approvalStatusLabel(approval.approvalStatus)}
                </StatusBadge>
                {approval.approvalStatus === 'pending' ? (
                  <span className={styles.approveActions}>
                    <Button
                      tone="secondary"
                      loading={saving}
                      onClick={() => void decideApproval(approval.id, 'approved')}
                    >
                      通过
                    </Button>
                    <Button
                      tone="danger"
                      loading={saving}
                      onClick={() => void decideApproval(approval.id, 'rejected')}
                    >
                      驳回
                    </Button>
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>尚无入驻审批。通过后商户自动归属该代理商。</p>
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
                {quotaFor(data.quotas, agent.id) ? (
                  <span className={styles.agentMeta}>
                    配额 {quotaFor(data.quotas, agent.id)?.merchantQuota} 席 · 已用{' '}
                    {quotaFor(data.quotas, agent.id)?.usedMerchants} 席
                  </span>
                ) : (
                  <span className={styles.agentMeta}>未设入驻配额</span>
                )}
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
