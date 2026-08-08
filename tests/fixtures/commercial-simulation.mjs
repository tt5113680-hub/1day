import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash, randomUUID, scryptSync } from 'node:crypto';
import { URL } from 'node:url';
import { Pool } from 'pg';

// Test-only fixture. It is deliberately not imported by package seeds or deployment code.
export const commercialSimulation = {
  password: 'OnedayTest!2026#H002',
  tenants: {
    luckin: { id: '20000000-0000-4000-8000-000000000001', slug: 'luckin-oneday-test' },
    restaurantB: { id: '20000000-0000-4000-8000-000000000002', slug: 'oneday-restaurant-b-test' },
    system: { id: '00000000-0000-4000-8000-000000000001', slug: 'system' },
  },
  accounts: {
    platform: 'platform.luckin.test@oneday.local',
    channel: 'channel.luckin.test@oneday.local',
    circle: 'circle.luckin.test@oneday.local',
    owner: 'owner.luckin.test@oneday.local',
    manager: 'manager.luckin.test@oneday.local',
    store: 'store.luckin.test@oneday.local',
    employee01: 'employee01.luckin.test@oneday.local',
    employee02: 'employee02.luckin.test@oneday.local',
    service: 'service.luckin.test@oneday.local',
    restaurantB: 'owner.restaurant-b.test@oneday.local',
  },
};

const ids = {
  luckinOrg: '20000000-0000-4000-8000-000000000011',
  merchant: '20000000-0000-4000-8000-000000000012',
  channel: '20000000-0000-4000-8000-000000000013',
  circle: '20000000-0000-4000-8000-000000000014',
  customerNew: '20000000-0000-4000-8000-000000000015',
  customerOld: '20000000-0000-4000-8000-000000000016',
  taskOpen: '20000000-0000-4000-8000-000000000017',
  taskOverdue: '20000000-0000-4000-8000-000000000018',
  order: '20000000-0000-4000-8000-000000000019',
  evidence: '20000000-0000-4000-8000-000000000020',
  share: '20000000-0000-4000-8000-000000000021',
  suggestion: '20000000-0000-4000-8000-000000000022',
  consumerAction: '20000000-0000-4000-8000-000000000023',
};
export const commercialSimulationIds = ids;

const users = Object.entries(commercialSimulation.accounts).map(([key, email], index) => ({
  key,
  email,
  id: `20000000-0000-4000-8000-${String(100 + index).padStart(12, '0')}`,
}));
const stores = [
  ['北京国贸测试店', 'BEIJING-GUOMAO'],
  ['北京望京测试店', 'BEIJING-WANGJING'],
  ['北京中关村测试店', 'BEIJING-ZHONGGUANCUN'],
].map(([name, code], index) => ({
  id: `20000000-0000-4000-8000-${String(200 + index).padStart(12, '0')}`,
  name,
  code,
}));
const role = (suffix) => `20000000-0000-4000-8000-${String(suffix).padStart(12, '0')}`;
const user = (key) => users.find((entry) => entry.key === key);

function fixtureGuard(url) {
  const parsed = new URL(url);
  assert.match(parsed.pathname, /^\/oneday(?:_v3)?_test(?:_[a-z0-9_]+)?$/);
  assert.equal(process.env.NODE_ENV, 'test', 'commercial fixture is test-only');
}

async function cleanup(pool) {
  const tenantIds = [
    commercialSimulation.tenants.luckin.id,
    commercialSimulation.tenants.restaurantB.id,
  ];
  await pool.query('delete from platform_channel_merchants where merchant_tenant_id = any($1)', [
    tenantIds,
  ]);
  await pool.query(
    'delete from platform_business_circle_merchants where merchant_tenant_id = any($1)',
    [tenantIds],
  );
  await pool.query("delete from platform_channels where code = 'H002-LUCKIN-CHANNEL'");
  await pool.query("delete from platform_business_circles where code = 'H002-LUCKIN-CIRCLE'");
  const tables = await pool.query(
    "select table_name from information_schema.columns where table_schema='public' and column_name='tenant_id' group by table_name",
  );
  for (let pass = 0; pass < 8; pass += 1) {
    for (const { table_name: table } of tables.rows) {
      if (
        ['tenants', 'platform_channel_merchants', 'platform_business_circle_merchants'].includes(
          table,
        )
      )
        continue;
      try {
        await pool.query(`delete from "${table}" where tenant_id = any($1)`, [tenantIds]);
      } catch {
        /* dependency removed in a later pass */
      }
    }
  }
  const fixtureEmails = users.map((entry) => entry.email);
  await pool.query(
    'delete from membership_roles where membership_id in (select id from memberships where user_id in (select id from users where email = any($1)))',
    [fixtureEmails],
  );
  await pool.query(
    'delete from auth_sessions where user_id in (select id from users where email = any($1))',
    [fixtureEmails],
  );
  await pool.query(
    "delete from role_permissions where role_id in (select id from roles where code like 'h002_%')",
  );
  await pool.query("delete from roles where code like 'h002_%'");
  await pool.query(
    'delete from memberships where user_id in (select id from users where email = any($1))',
    [fixtureEmails],
  );
  await pool.query('delete from users where email = any($1)', [fixtureEmails]);
  await pool.query('delete from tenants where id = any($1)', [tenantIds]);
}

export async function seedCommercialSimulation(databaseUrl = process.env.DATABASE_URL) {
  assert.ok(databaseUrl, 'DATABASE_URL is required');
  fixtureGuard(databaseUrl);
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await cleanup(pool);
    const passwordHash = `scrypt$h002-commercial-simulation$${scryptSync(commercialSimulation.password, 'h002-commercial-simulation', 64).toString('base64url')}`;
    const luckin = commercialSimulation.tenants.luckin;
    const restaurantB = commercialSimulation.tenants.restaurantB;
    for (const tenant of [luckin, restaurantB]) {
      await pool.query('insert into tenants(id, slug, name, status) values($1,$2,$3,$4)', [
        tenant.id,
        tenant.slug,
        tenant === luckin ? '瑞幸咖啡 · ONEDAY测试模拟租户' : 'ONEDAY测试餐饮B公司',
        'active',
      ]);
    }
    for (const entry of users) {
      await pool.query(
        'insert into users(id,email,display_name,password_hash,status) values($1,$2,$3,$4,$5)',
        [entry.id, entry.email, `H-002 ${entry.key}`, passwordHash, 'active'],
      );
      const tenantId = ['platform', 'channel', 'circle'].includes(entry.key)
        ? commercialSimulation.tenants.system.id
        : entry.key === 'restaurantB'
          ? restaurantB.id
          : luckin.id;
      await pool.query('insert into memberships(id,tenant_id,user_id,status) values($1,$2,$3,$4)', [
        randomUUID(),
        tenantId,
        entry.id,
        'active',
      ]);
    }
    const memberships = await pool.query(
      'select id,user_id,tenant_id from memberships where user_id = any($1)',
      [users.map((entry) => entry.id)],
    );
    const membershipFor = (key) => memberships.rows.find((entry) => entry.user_id === user(key).id);
    for (const [id, tenantId, code, name] of [
      [role(401), luckin.id, 'h002_owner', '测试企业老板'],
      [role(402), luckin.id, 'h002_employee', '测试普通员工'],
      [role(403), restaurantB.id, 'h002_owner_b', '测试餐饮B老板'],
      [role(404), commercialSimulation.tenants.system.id, 'h002_platform', '测试平台运营'],
    ])
      await pool.query('insert into roles(id,tenant_id,code,name,status) values($1,$2,$3,$4,$5)', [
        id,
        tenantId,
        code,
        name,
        'active',
      ]);
    const permissions = await pool.query('select id,code from permissions where status = $1', [
      'active',
    ]);
    const permissionIds = permissions.rows.map((entry) => entry.id);
    for (const roleId of [role(401), role(403), role(404)])
      for (const permissionId of permissionIds)
        await pool.query(
          'insert into role_permissions(id,tenant_id,role_id,permission_id,status) values($1,$2,$3,$4,$5)',
          [
            randomUUID(),
            roleId === role(404)
              ? commercialSimulation.tenants.system.id
              : roleId === role(403)
                ? restaurantB.id
                : luckin.id,
            roleId,
            permissionId,
            'active',
          ],
        );
    for (const permissionCode of ['task.read', 'task.manage']) {
      const permissionId = permissions.rows.find((entry) => entry.code === permissionCode).id;
      await pool.query(
        'insert into role_permissions(id,tenant_id,role_id,permission_id,status) values($1,$2,$3,$4,$5)',
        [randomUUID(), luckin.id, role(402), permissionId, 'active'],
      );
    }
    for (const entry of users) {
      const membership = membershipFor(entry.key);
      const roleId = ['platform', 'channel', 'circle'].includes(entry.key)
        ? role(404)
        : entry.key === 'restaurantB'
          ? role(403)
          : ['owner', 'manager', 'store', 'service'].includes(entry.key)
            ? role(401)
            : role(402);
      await pool.query(
        'insert into membership_roles(id,tenant_id,membership_id,role_id) values($1,$2,$3,$4)',
        [randomUUID(), membership.tenant_id, membership.id, roleId],
      );
    }
    await pool.query(
      'insert into organizations(id,tenant_id,code,name,organization_type,status) values($1,$2,$3,$4,$5,$6)',
      [ids.luckinOrg, luckin.id, 'H002-LUCKIN-BJ', '瑞幸咖啡北京测试组织', 'company', 'active'],
    );
    await pool.query(
      'insert into merchants(id,tenant_id,organization_id,code,name,status) values($1,$2,$3,$4,$5,$6)',
      [
        ids.merchant,
        luckin.id,
        ids.luckinOrg,
        'H002-LUCKIN',
        '瑞幸咖啡 · ONEDAY测试模拟租户',
        'active',
      ],
    );
    for (const store of stores)
      await pool.query(
        'insert into stores(id,tenant_id,organization_id,merchant_id,code,name,address,status) values($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          store.id,
          luckin.id,
          ids.luckinOrg,
          ids.merchant,
          store.code,
          store.name,
          '北京市测试地址',
          'active',
        ],
      );
    const employeeKeys = ['manager', 'store', 'employee01', 'employee02', 'service'];
    for (const [index, key] of employeeKeys.entries())
      await pool.query(
        'insert into employees(id,tenant_id,membership_id,organization_id,employee_code,title,status,started_at) values($1,$2,$3,$4,$5,$6,$7,now())',
        [
          role(500 + index),
          luckin.id,
          membershipFor(key).id,
          ids.luckinOrg,
          `H002-${key}`,
          key === 'service' ? '客服/跟进员工' : '测试员工',
          'active',
        ],
      );
    const employeeId = (key) => role(500 + employeeKeys.indexOf(key));
    for (const [id, name, status] of [
      [ids.customerNew, '模拟新客户', 'active'],
      [ids.customerOld, '模拟老客户', 'active'],
    ])
      await pool.query(
        'insert into customers(id,tenant_id,display_name,status) values($1,$2,$3,$4)',
        [id, luckin.id, name, status],
      );
    await pool.query(
      'insert into customer_sources(id,tenant_id,customer_id,source_role,source_type,source_id,metadata,status) values($1,$2,$3,$4,$5,$6,$7,$8)',
      [
        randomUUID(),
        luckin.id,
        ids.customerNew,
        'first',
        'scene_code',
        ids.share,
        JSON.stringify({ scenario: 'coffee_consultation' }),
        'active',
      ],
    );
    await pool.query(
      'insert into customer_ownerships(id,tenant_id,customer_id,employee_id,ownership_role,status) values($1,$2,$3,$4,$5,$6)',
      [randomUUID(), luckin.id, ids.customerNew, employeeId('service'), 'primary', 'active'],
    );
    for (const [id, customerId, assignee, title, dueAt, status] of [
      [
        ids.taskOpen,
        ids.customerNew,
        employeeId('service'),
        '跟进消费者咨询',
        "now() + interval '1 day'",
        'open',
      ],
      [
        ids.taskOverdue,
        ids.customerOld,
        employeeId('employee01'),
        '处理逾期回访',
        "now() - interval '1 day'",
        'open',
      ],
    ])
      await pool.query(
        `insert into tasks(id,tenant_id,customer_id,assignee_employee_id,title,due_at,status,escalation_level) values($1,$2,$3,$4,$5,${dueAt},$6,$7)`,
        [id, luckin.id, customerId, assignee, title, status, id === ids.taskOverdue ? 1 : 0],
      );
    await pool.query(
      "insert into task_reminders(id,tenant_id,task_id,remind_at,status) values($1,$2,$3,now() - interval '10 minutes',$4)",
      [randomUUID(), luckin.id, ids.taskOverdue, 'pending'],
    );
    await pool.query(
      'insert into customer_orders(id,tenant_id,customer_id,order_number,occurred_at,status) values($1,$2,$3,$4,now(),$5)',
      [ids.order, luckin.id, ids.customerOld, 'H002-LUCKIN-ORDER-001', 'completed'],
    );
    const content = Buffer.from('H-002 test evidence');
    await pool.query(
      'insert into evidence_files(id,tenant_id,order_id,evidence_type,original_filename,media_type,byte_size,content_sha256,content,status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [
        ids.evidence,
        luckin.id,
        ids.order,
        'receipt',
        'h002-receipt.txt',
        'text/plain',
        content.length,
        createHash('sha256').update(content).digest('hex'),
        content,
        'active',
      ],
    );
    await pool.query(
      'insert into employee_share_codes(id,tenant_id,employee_id,code,scenario,target_path,status) values($1,$2,$3,$4,$5,$6,$7)',
      [
        ids.share,
        luckin.id,
        employeeId('employee01'),
        'H002-LUCKIN-SHARE',
        'consultation',
        '/c/entry?tenant=luckin-oneday-test',
        'active',
      ],
    );
    await pool.query(
      "insert into external_actions(id,tenant_id,code,name,action_type,platform,status) values($1,$2,'H002-LUCKIN-CONSULT','瑞幸到店咨询','platform_entry','web','active')",
      [ids.consumerAction, luckin.id],
    );
    await pool.query(
      'insert into ai_suggestions(id,tenant_id,title,reason,impact,action_type,action_payload,model_name,model_version,status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [
        ids.suggestion,
        luckin.id,
        '提升国贸店咨询转化',
        '测试模拟数据',
        '预期提升跟进及时率',
        'create_follow_up',
        JSON.stringify({ taskId: ids.taskOpen }),
        'fixture-model',
        'v1',
        'pending',
      ],
    );
    await pool.query(
      'insert into platform_channels(id,tenant_id,code,name,onboarding_status,service_status,status) values($1,$2,$3,$4,$5,$6,$7)',
      [
        ids.channel,
        commercialSimulation.tenants.system.id,
        'H002-LUCKIN-CHANNEL',
        'H-002测试渠道',
        'open',
        'ready',
        'active',
      ],
    );
    await pool.query(
      'insert into platform_channel_merchants(id,tenant_id,channel_id,merchant_tenant_id,onboarding_status,service_status,status) values($1,$2,$3,$4,$5,$6,$7)',
      [
        randomUUID(),
        commercialSimulation.tenants.system.id,
        ids.channel,
        luckin.id,
        'active',
        'ready',
        'active',
      ],
    );
    await pool.query(
      'insert into platform_business_circles(id,tenant_id,code,name,description,status) values($1,$2,$3,$4,$5,$6)',
      [
        ids.circle,
        commercialSimulation.tenants.system.id,
        'H002-LUCKIN-CIRCLE',
        'H-002固定商圈',
        '仅测试数据',
        'active',
      ],
    );
    await pool.query(
      'insert into platform_business_circle_merchants(id,tenant_id,circle_id,merchant_tenant_id,benefits,recommendation_reason,approval_status,invitation_status,circle_approval_status,display_config) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [
        randomUUID(),
        commercialSimulation.tenants.system.id,
        ids.circle,
        luckin.id,
        JSON.stringify(['测试权益']),
        '测试商圈关系',
        'approved',
        'accepted',
        'approved',
        JSON.stringify({ visible: true, sortOrder: 1 }),
      ],
    );
    const correlationId = randomUUID();
    const traceId = randomUUID();
    await pool.query(
      'insert into audit_logs(id,tenant_id,actor_id,action,resource_type,resource_id,correlation_id,trace_id,details,status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [
        randomUUID(),
        luckin.id,
        user('owner').id,
        'h002.fixture.created',
        'commercial_simulation',
        ids.merchant,
        correlationId,
        traceId,
        JSON.stringify({ testOnly: true }),
        'active',
      ],
    );
    await pool.query(
      'insert into outbox_events(id,tenant_id,event_type,aggregate_type,aggregate_id,payload,correlation_id,trace_id,status,available_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,now())',
      [
        randomUUID(),
        luckin.id,
        'h002.fixture.created',
        'commercial_simulation',
        ids.merchant,
        JSON.stringify({ testOnly: true }),
        correlationId,
        traceId,
        'pending',
      ],
    );
    return { ...commercialSimulation, ids };
  } finally {
    await pool.end();
  }
}

export async function cleanupCommercialSimulation(databaseUrl = process.env.DATABASE_URL) {
  assert.ok(databaseUrl, 'DATABASE_URL is required');
  fixtureGuard(databaseUrl);
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await cleanup(pool);
  } finally {
    await pool.end();
  }
}

export async function verifyCommercialSimulation(databaseUrl = process.env.DATABASE_URL) {
  assert.ok(databaseUrl, 'DATABASE_URL is required');
  fixtureGuard(databaseUrl);
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const luckinId = commercialSimulation.tenants.luckin.id;
    const checks = await Promise.all([
      pool.query('select count(*)::int as count from stores where tenant_id=$1', [luckinId]),
      pool.query('select count(*)::int as count from employees where tenant_id=$1', [luckinId]),
      pool.query('select count(*)::int as count from customers where tenant_id=$1', [luckinId]),
      pool.query('select count(*)::int as count from tasks where tenant_id=$1', [luckinId]),
      pool.query('select count(*)::int as count from evidence_files where tenant_id=$1', [
        luckinId,
      ]),
      pool.query('select count(*)::int as count from employee_share_codes where tenant_id=$1', [
        luckinId,
      ]),
      pool.query('select count(*)::int as count from ai_suggestions where tenant_id=$1', [
        luckinId,
      ]),
      pool.query('select count(*)::int as count from audit_logs where tenant_id=$1', [luckinId]),
      pool.query('select count(*)::int as count from outbox_events where tenant_id=$1', [luckinId]),
      pool.query(
        'select count(*)::int as count from platform_channel_merchants where merchant_tenant_id=$1',
        [luckinId],
      ),
      pool.query(
        'select count(*)::int as count from platform_business_circle_merchants where merchant_tenant_id=$1',
        [luckinId],
      ),
    ]);
    const counts = checks.map((result) => result.rows[0].count);
    assert.deepEqual(counts, [3, 5, 2, 2, 1, 1, 1, 1, 1, 1, 1]);
    return counts;
  } finally {
    await pool.end();
  }
}
