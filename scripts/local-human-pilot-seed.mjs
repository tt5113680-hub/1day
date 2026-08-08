import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';
import { createRequire } from 'node:module';
import { URL } from 'node:url';

const require = createRequire(new URL('../packages/database/package.json', import.meta.url));
const { Pool } = require('pg');

// Local operational fixture only. It is intentionally separate from package seeds and test fixtures.
const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl, 'DATABASE_URL is required');
const parsed = new URL(databaseUrl);
assert.equal(
  parsed.pathname,
  '/oneday_human_pilot',
  'Refusing to seed a database other than oneday_human_pilot',
);

export const humanPilot = {
  password: 'OnedayHumanPilot!2026',
  tenantA: {
    id: '30000000-0000-4000-8000-000000000001',
    slug: 'luckin-oneday-human-pilot',
    name: '瑞幸咖啡 · ONEDAY测试模拟租户',
  },
  tenantB: {
    id: '30000000-0000-4000-8000-000000000002',
    slug: 'oneday-restaurant-b-human-pilot',
    name: 'ONEDAY测试餐饮B公司',
  },
};

const systemTenant = '00000000-0000-4000-8000-000000000001';
const id = (suffix) => `30000000-0000-4000-8000-${String(suffix).padStart(12, '0')}`;
const ids = {
  organization: id(11),
  merchant: id(12),
  tenantBOrganization: id(13),
  tenantBMerchant: id(14),
  tenantBStore: id(15),
  stores: [id(21), id(22), id(23)],
  template: id(31),
  templateVersion: id(32),
  action: id(41),
  channel: id(51),
  circle: id(52),
  discoveryChannel: id(61),
  discoveryCircle: id(62),
  shareCode: id(71),
};

const accounts = [
  ['owner', 'pilot.owner@oneday.local', 'Tenant Owner', humanPilot.tenantA.id, '租户所有者'],
  [
    'manager',
    'pilot.manager@oneday.local',
    'Enterprise Manager',
    humanPilot.tenantA.id,
    '企业管理者',
  ],
  [
    'storemanager',
    'pilot.storemanager@oneday.local',
    'Store Manager',
    humanPilot.tenantA.id,
    '店长',
  ],
  ['employee01', 'pilot.employee01@oneday.local', 'Employee 01', humanPilot.tenantA.id, '普通员工'],
  ['employee02', 'pilot.employee02@oneday.local', 'Employee 02', humanPilot.tenantA.id, '普通员工'],
  [
    'followup',
    'pilot.followup@oneday.local',
    'Follow-up Employee',
    humanPilot.tenantA.id,
    '跟进员工',
  ],
  ['channel', 'pilot.channel@oneday.local', 'Channel Owner', systemTenant, '渠道负责人'],
  ['circle', 'pilot.circle@oneday.local', 'Business Circle Owner', systemTenant, '商圈负责人'],
  ['platform', 'pilot.platform@oneday.local', 'Platform Administrator', systemTenant, '平台管理员'],
  [
    'tenantbOwner',
    'pilot.tenantb.owner@oneday.local',
    'Tenant B Owner',
    humanPilot.tenantB.id,
    'Tenant Owner',
  ],
  [
    'tenantbEmployee',
    'pilot.tenantb.employee@oneday.local',
    'Tenant B Employee',
    humanPilot.tenantB.id,
    '普通员工',
  ],
].map(([key, email, name, tenantId, role], index) => ({
  key,
  email,
  name,
  tenantId,
  role,
  userId: id(100 + index),
  membershipId: id(200 + index),
}));

const account = (key) => accounts.find((entry) => entry.key === key);
const roles = [
  ['owner', humanPilot.tenantA.id, 'pilot_tenant_owner', 'Tenant Owner', 'all'],
  ['manager', humanPilot.tenantA.id, 'pilot_enterprise_manager', '企业管理者', 'all'],
  ['storemanager', humanPilot.tenantA.id, 'pilot_store_manager', '店长', 'store'],
  ['employee', humanPilot.tenantA.id, 'pilot_employee', '普通员工', 'employee'],
  ['followup', humanPilot.tenantA.id, 'pilot_follow_up_employee', '跟进员工', 'followup'],
  ['tenantbOwner', humanPilot.tenantB.id, 'pilot_tenant_b_owner', 'Tenant B Owner', 'all'],
  [
    'tenantbEmployee',
    humanPilot.tenantB.id,
    'pilot_tenant_b_employee',
    'Tenant B Employee',
    'employee',
  ],
  ['channel', systemTenant, 'pilot_channel_owner', '渠道负责人', 'channel'],
  ['circle', systemTenant, 'pilot_circle_owner', '商圈负责人', 'circle'],
  ['platform', systemTenant, 'pilot_platform_admin', '平台管理员', 'platform'],
].map(([key, tenantId, code, name, scope], index) => ({
  key,
  tenantId,
  code,
  name,
  scope,
  id: id(300 + index),
}));
const role = (key) => roles.find((entry) => entry.key === key);

const permissionScope = {
  all: null,
  store: new Set([
    'tenant.read',
    'organization.read',
    'employee.read',
    'customer.read',
    'task.read',
    'task.manage',
    'evidence.read',
    'evidence.manage',
    'page.read',
    'action.read',
  ]),
  employee: new Set(['task.read', 'task.manage']),
  followup: new Set(['task.read', 'task.manage', 'evidence.read', 'evidence.manage']),
  channel: new Set(['platform.read']),
  circle: new Set(['platform.read', 'circle.manage']),
  platform: new Set(['platform.read', 'platform.manage', 'circle.manage']),
};

const employeeAccounts = [
  'manager',
  'storemanager',
  'employee01',
  'employee02',
  'followup',
  'tenantbEmployee',
];
const employeeId = (key) => id(500 + employeeAccounts.indexOf(key));
const stores = [
  [ids.stores[0], 'PILOT-BJ-GUOMAO', '北京国贸测试店', '北京市朝阳区国贸测试路 1 号'],
  [ids.stores[1], 'PILOT-BJ-WANGJING', '北京望京测试店', '北京市朝阳区望京测试路 2 号'],
  [ids.stores[2], 'PILOT-BJ-ZHONGGUANCUN', '北京中关村测试店', '北京市海淀区中关村测试路 3 号'],
];

const pool = new Pool({ connectionString: databaseUrl });
const upsert = (text, values) => pool.query(text, values);

try {
  const migration = await pool.query(
    "select name from kysely_migration where name='045_ai_suggestion_execution'",
  );
  assert.equal(migration.rowCount, 1, 'Migration 045 is required before human-pilot provisioning');
  const passwordHash = `scrypt$oneday-human-pilot$${scryptSync(humanPilot.password, 'oneday-human-pilot', 64).toString('base64url')}`;

  await pool.query('begin');
  for (const tenant of [humanPilot.tenantA, humanPilot.tenantB])
    await upsert(
      `insert into tenants(id,slug,name,status) values($1,$2,$3,'active')
       on conflict (id) do update set slug=excluded.slug,name=excluded.name,status='active',deleted_at=null`,
      [tenant.id, tenant.slug, tenant.name],
    );
  for (const entry of accounts) {
    await upsert(
      `insert into users(id,email,display_name,password_hash,status) values($1,$2,$3,$4,'active')
       on conflict (id) do update set email=excluded.email,display_name=excluded.display_name,password_hash=excluded.password_hash,status='active',deleted_at=null`,
      [entry.userId, entry.email, entry.name, passwordHash],
    );
    await upsert(
      `insert into memberships(id,tenant_id,user_id,status) values($1,$2,$3,'active')
       on conflict (id) do update set tenant_id=excluded.tenant_id,user_id=excluded.user_id,status='active',deleted_at=null`,
      [entry.membershipId, entry.tenantId, entry.userId],
    );
  }
  for (const entry of roles)
    await upsert(
      `insert into roles(id,tenant_id,code,name,status) values($1,$2,$3,$4,'active')
       on conflict (id) do update set tenant_id=excluded.tenant_id,code=excluded.code,name=excluded.name,status='active',deleted_at=null`,
      [entry.id, entry.tenantId, entry.code, entry.name],
    );

  const permissions = await pool.query(
    "select id,code from permissions where status='active' and deleted_at is null order by code",
  );
  for (const [roleIndex, entry] of roles.entries()) {
    const allowed = permissionScope[entry.scope];
    for (const [permissionIndex, permission] of permissions.rows.entries()) {
      if (allowed && !allowed.has(permission.code)) continue;
      await upsert(
        `insert into role_permissions(id,tenant_id,role_id,permission_id,status) values($1,$2,$3,$4,'active')
         on conflict (role_id,permission_id) do update set status='active',deleted_at=null`,
        [id(1000 + roleIndex * 100 + permissionIndex), entry.tenantId, entry.id, permission.id],
      );
    }
  }
  const roleForAccount = {
    owner: 'owner',
    manager: 'manager',
    storemanager: 'storemanager',
    employee01: 'employee',
    employee02: 'employee',
    followup: 'followup',
    channel: 'channel',
    circle: 'circle',
    platform: 'platform',
    tenantbOwner: 'tenantbOwner',
    tenantbEmployee: 'tenantbEmployee',
  };
  for (const [index, entry] of accounts.entries()) {
    const assigned = role(roleForAccount[entry.key]);
    await upsert(
      `insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)
       on conflict (membership_id,role_id) do nothing`,
      [id(3000 + index), entry.tenantId, entry.membershipId, assigned.id],
    );
  }

  await upsert(
    `insert into organizations(id,tenant_id,code,name,organization_type,status) values($1,$2,'PILOT-LUCKIN-BJ',$3,'company','active')
     on conflict (id) do update set name=excluded.name,status='active',deleted_at=null`,
    [ids.organization, humanPilot.tenantA.id, humanPilot.tenantA.name],
  );
  await upsert(
    `insert into merchants(id,tenant_id,organization_id,code,name,status) values($1,$2,$3,'PILOT-LUCKIN',$4,'active')
     on conflict (id) do update set name=excluded.name,status='active',deleted_at=null`,
    [ids.merchant, humanPilot.tenantA.id, ids.organization, humanPilot.tenantA.name],
  );
  await upsert(
    `insert into organizations(id,tenant_id,code,name,organization_type,status) values($1,$2,'PILOT-RESTAURANT-B',$3,'company','active')
     on conflict (id) do update set name=excluded.name,status='active',deleted_at=null`,
    [ids.tenantBOrganization, humanPilot.tenantB.id, humanPilot.tenantB.name],
  );
  await upsert(
    `insert into merchants(id,tenant_id,organization_id,code,name,status) values($1,$2,$3,'PILOT-RESTAURANT-B',$4,'active')
     on conflict (id) do update set name=excluded.name,status='active',deleted_at=null`,
    [ids.tenantBMerchant, humanPilot.tenantB.id, ids.tenantBOrganization, humanPilot.tenantB.name],
  );
  await upsert(
    `insert into stores(id,tenant_id,organization_id,merchant_id,code,name,address,status) values($1,$2,$3,$4,'PILOT-B-STORE','餐饮B隔离测试店','本地隔离测试地址','active')
     on conflict (id) do update set status='active',deleted_at=null`,
    [ids.tenantBStore, humanPilot.tenantB.id, ids.tenantBOrganization, ids.tenantBMerchant],
  );
  for (const [storeId, code, name, address] of stores)
    await upsert(
      `insert into stores(id,tenant_id,organization_id,merchant_id,code,name,address,status) values($1,$2,$3,$4,$5,$6,$7,'active')
       on conflict (id) do update set name=excluded.name,address=excluded.address,status='active',deleted_at=null`,
      [storeId, humanPilot.tenantA.id, ids.organization, ids.merchant, code, name, address],
    );
  for (const key of employeeAccounts) {
    const entry = account(key);
    const tenantId = entry.tenantId;
    const organizationId =
      tenantId === humanPilot.tenantA.id ? ids.organization : ids.tenantBOrganization;
    await upsert(
      `insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,started_at) values($1,$2,$3,$4,$5,$6,'active',now())
       on conflict (id) do update set status='active',title=excluded.title,deleted_at=null`,
      [
        employeeId(key),
        tenantId,
        entry.membershipId,
        organizationId,
        `PILOT-${key.toUpperCase()}`,
        entry.role,
      ],
    );
  }
  await upsert(
    `insert into store_managers(id,tenant_id,store_id,employee_id,status) values($1,$2,$3,$4,'active')
     on conflict (store_id,employee_id) do update set status='active',deleted_at=null`,
    [id(600), humanPilot.tenantA.id, ids.stores[0], employeeId('storemanager')],
  );
  await upsert(
    `insert into tenant_operating_settings(id,tenant_id,reminder_policy,approval_policy,do_not_disturb_policy,tag_policy,ownership_policy,brand_policy)
     values($1,$2,$3,$4,$5,$6,$7,$8) on conflict (tenant_id) do update set reminder_policy=excluded.reminder_policy`,
    [id(700), humanPilot.tenantA.id, { defaultDueHours: 1 }, {}, {}, {}, {}, {}],
  );

  await upsert(
    `insert into external_actions(id,tenant_id,code,name,action_type,platform,status) values($1,$2,'PILOT-CONSULT','到店咨询（本地模拟）','platform_entry','local','active')
     on conflict (id) do update set name=excluded.name,status='active',deleted_at=null`,
    [ids.action, humanPilot.tenantA.id],
  );
  await upsert(
    `insert into page_templates(id,tenant_id,code,name,target,published_version_id,status,industry_config) values($1,$2,'pilot-consumer','本地真人试用消费者入口','consumer',$3,'active',$4)
     on conflict (id) do update set published_version_id=excluded.published_version_id,status='active',deleted_at=null`,
    [ids.template, humanPilot.tenantA.id, ids.templateVersion, { industry: 'coffee' }],
  );
  await upsert(
    `insert into page_template_versions(id,tenant_id,template_id,sequence,status) values($1,$2,$3,1,'published')
     on conflict (id) do update set status='published',deleted_at=null`,
    [ids.templateVersion, humanPilot.tenantA.id, ids.template],
  );
  const modules = [
    [
      id(801),
      'hero',
      1,
      {
        title: '瑞幸咖啡北京测试门店',
        sceneLabel: 'LOCAL HUMAN PILOT',
        summary: '本地真人试用：浏览、进店并提交一次模拟咨询。',
        benefit: '仅限本机模拟数据',
      },
    ],
    [
      id(802),
      'action_grid',
      2,
      {
        recommendations: [
          { title: '北京国贸测试店', description: '进入门店并提交一次本地模拟咨询', tag: '推荐' },
          { title: '北京望京测试店', description: '浏览测试门店资料', tag: '测试' },
        ],
      },
    ],
    [
      id(803),
      'content',
      3,
      {
        cards: [
          { title: '到店咨询', description: '咨询将创建本地模拟客户与跟进任务', tag: '本地' },
          { title: '员工跟进', description: '由测试店长接收后续任务', tag: '闭环' },
        ],
      },
    ],
  ];
  for (const [moduleId, type, position, config] of modules)
    await upsert(
      `insert into page_modules(id,tenant_id,template_version_id,module_type,position,config,status) values($1,$2,$3,$4,$5,$6,'active')
       on conflict (id) do update set config=excluded.config,status='active',deleted_at=null`,
      [moduleId, humanPilot.tenantA.id, ids.templateVersion, type, position, config],
    );
  for (const [index, [storeId]] of stores.entries()) {
    await upsert(
      `insert into store_services(id,tenant_id,store_id,code,name,description,duration_minutes,price_label,rank,status) values($1,$2,$3,$4,'本地试用咨询','用于真人试用的本地模拟服务',15,'免费',1,'active')
       on conflict (id) do update set status='active',deleted_at=null`,
      [id(850 + index), humanPilot.tenantA.id, storeId, `PILOT-SERVICE-${index + 1}`],
    );
    await upsert(
      `insert into store_benefits(id,tenant_id,store_id,title,description,external_action_id,rank,status) values($1,$2,$3,'本地试用权益','不连接任何真实外部平台',$4,1,'active')
       on conflict (id) do update set status='active',deleted_at=null`,
      [id(860 + index), humanPilot.tenantA.id, storeId, ids.action],
    );
  }
  await upsert(
    `insert into discovery_channels(id,tenant_id,code,name,description,rank,status) values($1,$2,'PILOT-RECOMMEND','本地推荐门店','供真人试用的瑞幸测试门店',1,'active')
     on conflict (id) do update set status='active',deleted_at=null`,
    [ids.discoveryChannel, humanPilot.tenantA.id],
  );
  await upsert(
    `insert into discovery_channel_merchants(id,tenant_id,channel_id,merchant_id,rank,status) values($1,$2,$3,$4,1,'active')
     on conflict (channel_id,merchant_id) do update set status='active',deleted_at=null`,
    [id(870), humanPilot.tenantA.id, ids.discoveryChannel, ids.merchant],
  );
  await upsert(
    `insert into business_circles(id,tenant_id,code,name,description,rank,status) values($1,$2,'PILOT-CIRCLE','国贸本地测试商圈','本地商圈发现测试',1,'active')
     on conflict (id) do update set status='active',deleted_at=null`,
    [ids.discoveryCircle, humanPilot.tenantA.id],
  );
  await upsert(
    `insert into business_circle_merchants(id,tenant_id,business_circle_id,merchant_id,rank,status) values($1,$2,$3,$4,1,'active')
     on conflict (business_circle_id,merchant_id) do update set status='active',deleted_at=null`,
    [id(871), humanPilot.tenantA.id, ids.discoveryCircle, ids.merchant],
  );
  await upsert(
    `insert into merchant_locations(id,tenant_id,merchant_id,latitude,longitude,address_label,status) values($1,$2,$3,39.9087,116.4619,'北京国贸测试地点','active')
     on conflict (merchant_id) do update set status='active',deleted_at=null`,
    [id(872), humanPilot.tenantA.id, ids.merchant],
  );
  await upsert(
    `insert into employee_share_codes(id,tenant_id,employee_id,code,scenario,target_path,status) values($1,$2,$3,'PILOTFOLLOWUP','consultation',$4,'active')
     on conflict (id) do update set status='active',deleted_at=null`,
    [
      ids.shareCode,
      humanPilot.tenantA.id,
      employeeId('followup'),
      `/c/entry?tenant=${humanPilot.tenantA.slug}`,
    ],
  );
  await upsert(
    `insert into platform_channels(id,tenant_id,code,name,onboarding_status,service_status,status) values($1,$2,'PILOT-CHANNEL','本地真人试用渠道','open','ready','active')
     on conflict (id) do update set status='active',deleted_at=null`,
    [ids.channel, systemTenant],
  );
  await upsert(
    `insert into platform_channel_merchants(id,tenant_id,channel_id,merchant_tenant_id,onboarding_status,service_status,status) values($1,$2,$3,$4,'active','ready','active')
     on conflict (channel_id,merchant_tenant_id) do update set status='active',deleted_at=null`,
    [id(880), systemTenant, ids.channel, humanPilot.tenantA.id],
  );
  await upsert(
    `insert into platform_business_circles(id,tenant_id,code,name,description,status) values($1,$2,'PILOT-BUSINESS-CIRCLE','本地真人试用商圈','仅限本机模拟关系','active')
     on conflict (id) do update set status='active',deleted_at=null`,
    [ids.circle, systemTenant],
  );
  await upsert(
    `insert into platform_business_circle_merchants(id,tenant_id,circle_id,merchant_tenant_id,benefits,recommendation_reason,approval_status,invitation_status,circle_approval_status,display_config,status) values($1,$2,$3,$4,$5,'本地真人试用关系','approved','accepted','approved',$6,'active')
     on conflict (circle_id,merchant_tenant_id) do update set approval_status='approved',status='active',deleted_at=null`,
    [
      id(881),
      systemTenant,
      ids.circle,
      humanPilot.tenantA.id,
      JSON.stringify(['本地测试权益']),
      { visible: true, sortOrder: 1 },
    ],
  );
  await pool.query('commit');
  globalThis.console.log(
    JSON.stringify(
      {
        database: parsed.pathname.slice(1),
        migration: '045',
        accounts: accounts.map(({ email, role, tenantId }) => ({ email, role, tenantId })),
      },
      null,
      2,
    ),
  );
} catch (error) {
  await pool.query('rollback').catch(() => undefined);
  throw error;
} finally {
  await pool.end();
}
