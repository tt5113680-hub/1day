/**
 * Industry commercial catalogs for local/test fixture generation.
 * TEST ONLY — not live third-party inventory, price, or brand assets.
 */
export const INDUSTRIES = ['restaurant', 'beauty', 'education'];

/** Distinct commercial packs keyed by industry. */
export const industryPacks = {
  restaurant: {
    label: '餐饮',
    themeVariant: 'warm',
    brandHint: '咖啡轻食 · TEST ONLY',
    stores: [
      {
        nameSuffix: '国贸店',
        address: '北京市朝阳区国贸测试路 88 号',
        phone: '010-5888-1001',
        businessHours: '每日 07:30–22:00',
        latitude: 39.9087,
        longitude: 116.4619,
        imageFile: 'restaurant-a.png',
      },
    ],
    products: [
      {
        code: 'lattee-duo',
        name: '生椰拿铁双杯',
        description: '生椰拿铁 × 2，到店自取 · TEST ONLY',
        priceLabel: '¥18.80',
        rank: 300,
        offers: [
          {
            platform: 'meituan',
            title: '美团团购（TEST ONLY）',
            offerPrice: 19.9,
            marketPrice: 38,
          },
          { platform: 'douyin', title: '抖音团购（TEST ONLY）', offerPrice: 21.9, marketPrice: 38 },
          {
            platform: 'external',
            title: '合作伙伴套餐（TEST ONLY）',
            offerPrice: 20.9,
            marketPrice: 38,
          },
        ],
      },
      {
        code: 'americano-set',
        name: '美式轻享套餐',
        description: '美式咖啡 + 软欧包 · TEST ONLY',
        priceLabel: '¥22.00',
        rank: 200,
        offers: [
          {
            platform: 'meituan',
            title: '美团团购（TEST ONLY）',
            offerPrice: 23.9,
            marketPrice: 42,
          },
          { platform: 'douyin', title: '抖音团购（TEST ONLY）', offerPrice: 24.9, marketPrice: 42 },
        ],
      },
    ],
    benefit: {
      title: '到店会员早鸟礼',
      description: '07:30–10:00 到店可查看门店确认的会员礼 · TEST ONLY',
    },
    stories: [
      {
        title: '晨间好状态，从一杯开始',
        body: '门店今日推荐生椰拿铁双杯，价格与库存以第三方页面为准 · TEST ONLY',
        mediaPath: '/fixtures/materials/restaurant-story-a.png',
      },
      {
        title: '国贸午后轻食上新',
        body: '软欧包与美式搭配，到店自取 · TEST ONLY',
        mediaPath: '/fixtures/materials/restaurant-story-b.png',
      },
    ],
    links: [
      {
        platform: 'meituan',
        title: '美团门店入口（TEST ONLY）',
        targetUrl: 'https://example.test/meituan/restaurant-fixture',
        description: '模拟美团跳转，最终价格库存以第三方为准',
      },
      {
        platform: 'douyin',
        title: '抖音门店入口（TEST ONLY）',
        targetUrl: 'https://example.test/douyin/restaurant-fixture',
        description: '模拟抖音跳转，最终价格库存以第三方为准',
      },
      {
        platform: 'external',
        title: '合作伙伴入口（TEST ONLY）',
        targetUrl: 'https://example.test/partner/restaurant-fixture',
        description: '模拟合作伙伴 HTTPS 外链',
      },
    ],
  },
  beauty: {
    label: '美业',
    themeVariant: 'calm',
    brandHint: '美容护理 · TEST ONLY',
    stores: [
      {
        nameSuffix: '三里屯店',
        address: '北京市朝阳区三里屯测试街 12 号',
        phone: '010-5888-2002',
        businessHours: '每日 10:00–21:00',
        latitude: 39.9375,
        longitude: 116.4472,
        imageFile: 'beauty-a.png',
      },
    ],
    products: [
      {
        code: 'facial-basic',
        name: '深层清洁护理',
        description: '60 分钟面部护理咨询档 · TEST ONLY',
        priceLabel: '¥199 起',
        rank: 300,
        offers: [
          {
            platform: 'meituan',
            title: '美团服务（TEST ONLY）',
            offerPrice: 169,
            marketPrice: 299,
          },
          { platform: 'douyin', title: '抖音服务（TEST ONLY）', offerPrice: 179, marketPrice: 299 },
        ],
      },
      {
        code: 'hair-trim',
        name: '造型修剪体验',
        description: '到店咨询后确认档期 · TEST ONLY',
        priceLabel: '¥128 起',
        rank: 200,
        offers: [
          { platform: 'meituan', title: '美团服务（TEST ONLY）', offerPrice: 98, marketPrice: 168 },
          {
            platform: 'external',
            title: '合作预约（TEST ONLY）',
            offerPrice: 108,
            marketPrice: 168,
          },
        ],
      },
    ],
    benefit: {
      title: '会员首单护理礼',
      description: '完成入会意向后由门店确认发放 · TEST ONLY',
    },
    stories: [
      {
        title: '本周护理案例（已授权）',
        body: '仅展示商家确认可公开的案例摘要 · TEST ONLY',
        mediaPath: '/fixtures/materials/beauty-story-a.png',
      },
    ],
    links: [
      {
        platform: 'meituan',
        title: '美团预约（TEST ONLY）',
        targetUrl: 'https://example.test/meituan/beauty-fixture',
        description: '模拟美团预约入口',
      },
      {
        platform: 'douyin',
        title: '抖音预约（TEST ONLY）',
        targetUrl: 'https://example.test/douyin/beauty-fixture',
        description: '模拟抖音预约入口',
      },
      {
        platform: 'external',
        title: '合作预约页（TEST ONLY）',
        targetUrl: 'https://example.test/partner/beauty-fixture',
        description: '模拟合作预约 HTTPS 外链',
      },
    ],
  },
  education: {
    label: '教育',
    themeVariant: 'fresh',
    brandHint: '素质教育 · TEST ONLY',
    stores: [
      {
        nameSuffix: '中关村校区',
        address: '北京市海淀区中关村测试大道 66 号',
        phone: '010-5888-3003',
        businessHours: '周一至周日 09:00–20:00',
        latitude: 39.9836,
        longitude: 116.3156,
        imageFile: 'education-a.png',
      },
    ],
    products: [
      {
        code: 'trial-math',
        name: '数学思维试听课',
        description: '适龄试听，顾问确认档期 · TEST ONLY',
        priceLabel: '¥0 试听',
        rank: 300,
        offers: [
          { platform: 'douyin', title: '抖音试听（TEST ONLY）', offerPrice: 9.9, marketPrice: 99 },
          { platform: 'external', title: '官网试听（TEST ONLY）', offerPrice: 0, marketPrice: 99 },
        ],
      },
      {
        code: 'stem-camp',
        name: '周末 STEM 体验营',
        description: '半天体验营咨询 · TEST ONLY',
        priceLabel: '¥299 起',
        rank: 200,
        offers: [
          {
            platform: 'meituan',
            title: '美团课程（TEST ONLY）',
            offerPrice: 259,
            marketPrice: 399,
          },
          { platform: 'douyin', title: '抖音课程（TEST ONLY）', offerPrice: 269, marketPrice: 399 },
        ],
      },
    ],
    benefit: {
      title: '会员试听优先档',
      description: '完成入会意向后由校区确认优先试听 · TEST ONLY',
    },
    stories: [
      {
        title: '本周校区公开课预告',
        body: '仅发布校区确认的课程动态 · TEST ONLY',
        mediaPath: '/fixtures/materials/education-story-a.png',
      },
    ],
    links: [
      {
        platform: 'meituan',
        title: '美团课程入口（TEST ONLY）',
        targetUrl: 'https://example.test/meituan/education-fixture',
        description: '模拟美团课程入口',
      },
      {
        platform: 'douyin',
        title: '抖音课程入口（TEST ONLY）',
        targetUrl: 'https://example.test/douyin/education-fixture',
        description: '模拟抖音课程入口',
      },
      {
        platform: 'external',
        title: '校区预约页（TEST ONLY）',
        targetUrl: 'https://example.test/partner/education-fixture',
        description: '模拟校区 HTTPS 预约页',
      },
    ],
  },
};
