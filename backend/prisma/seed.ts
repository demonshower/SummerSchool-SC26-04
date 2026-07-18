/**
 * 种子数据脚本 - 初始化城市和地点数据
 * 运行: pnpm prisma:seed
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// 城市数据
// ============================================================================
const cities = [
  { code: 'shanghai', name: '上海', province: '上海市', lat: 31.2304, lng: 121.4737 },
  { code: 'beijing', name: '北京', province: '北京市', lat: 39.9042, lng: 116.4074 },
  { code: 'hangzhou', name: '杭州', province: '浙江省', lat: 30.2741, lng: 120.1551 },
  { code: 'nanjing', name: '南京', province: '江苏省', lat: 32.0603, lng: 118.7969 },
  { code: 'suzhou', name: '苏州', province: '江苏省', lat: 31.2990, lng: 120.5853 },
  { code: 'kunming', name: '昆明', province: '云南省', lat: 25.0389, lng: 102.7183 },
  { code: 'chengdu', name: '成都', province: '四川省', lat: 30.5728, lng: 104.0668 },
  { code: 'xian', name: '西安', province: '陕西省', lat: 34.3416, lng: 108.9398 },
  { code: 'guangzhou', name: '广州', province: '广东省', lat: 23.1291, lng: 113.2644 },
  { code: 'shenzhen', name: '深圳', province: '广东省', lat: 22.5431, lng: 114.0579 },
  { code: 'chongqing', name: '重庆', province: '重庆市', lat: 29.4316, lng: 106.9123 },
  { code: 'wuhan', name: '武汉', province: '湖北省', lat: 30.5928, lng: 114.3055 },
  { code: 'changsha', name: '长沙', province: '湖南省', lat: 28.2280, lng: 112.9388 },
  { code: 'xiamen', name: '厦门', province: '福建省', lat: 24.4798, lng: 118.0894 },
  { code: 'qingdao', name: '青岛', province: '山东省', lat: 36.0671, lng: 120.3826 },
];

// ============================================================================
// 地点数据 (POI)
// ============================================================================
const places = [
  // 杭州 - 景点
  { canonicalName: '西湖风景区', category: 'attraction', cityCode: 'hangzhou', cityName: '杭州', lat: 30.2421, lng: 120.1483, address: '杭州市西湖区龙井路1号', attributes: { rating: 4.8, description: '杭州最著名的自然风景区，世界文化遗产', openHours: '全天开放', ticketPrice: 0 } },
  { canonicalName: '灵隐寺', category: 'attraction', cityCode: 'hangzhou', cityName: '杭州', lat: 30.2400, lng: 120.1010, address: '杭州市西湖区灵隐路法云弄1号', attributes: { rating: 4.6, description: '千年古刹，江南名刹', openHours: '07:00-18:15', ticketPrice: 7500 } },
  { canonicalName: '宋城景区', category: 'attraction', cityCode: 'hangzhou', cityName: '杭州', lat: 30.1850, lng: 120.1130, address: '杭州市西湖区之江路148号', attributes: { rating: 4.5, description: '大型宋文化主题公园', openHours: '10:00-21:00', ticketPrice: 31000 } },
  { canonicalName: '西溪湿地公园', category: 'attraction', cityCode: 'hangzhou', cityName: '杭州', lat: 30.2660, lng: 120.0610, address: '杭州市西湖区天目山路518号', attributes: { rating: 4.4, description: '国家级湿地公园', openHours: '08:00-17:30', ticketPrice: 8000 } },
  // 杭州 - 餐厅
  { canonicalName: '楼外楼', category: 'restaurant', cityCode: 'hangzhou', cityName: '杭州', lat: 30.2540, lng: 120.1390, address: '杭州市西湖区孤山路30号', attributes: { rating: 4.3, description: '百年老店，杭帮菜代表', avgPrice: 15000 } },
  { canonicalName: '知味观', category: 'restaurant', cityCode: 'hangzhou', cityName: '杭州', lat: 30.2480, lng: 120.1680, address: '杭州市上城区仁和路83号', attributes: { rating: 4.4, description: '杭州老字号，小吃点心', avgPrice: 8000 } },
  // 杭州 - 酒店
  { canonicalName: '杭州西湖美居酒店', category: 'hotel', cityCode: 'hangzhou', cityName: '杭州', lat: 30.2450, lng: 120.1520, address: '杭州市西湖区南山路', attributes: { rating: 4.5, description: '位于西湖区核心地段，距离西湖步行10分钟', priceRange: '350-500元/晚' } },
  { canonicalName: '杭州君悦酒店', category: 'hotel', cityCode: 'hangzhou', cityName: '杭州', lat: 30.2490, lng: 120.1640, address: '杭州市上城区解放路28号', attributes: { rating: 4.8, description: '五星级豪华酒店', priceRange: '800-1500元/晚' } },
  { canonicalName: '杭州如家精选酒店', category: 'hotel', cityCode: 'hangzhou', cityName: '杭州', lat: 30.2520, lng: 120.1580, address: '杭州市西湖区延安路', attributes: { rating: 4.0, description: '经济型连锁酒店', priceRange: '200-350元/晚' } },
  { canonicalName: '杭州全季酒店', category: 'hotel', cityCode: 'hangzhou', cityName: '杭州', lat: 30.2650, lng: 120.1650, address: '杭州市拱墅区莫干山路', attributes: { rating: 4.2, description: '中档商务酒店', priceRange: '280-400元/晚' } },
  // 杭州 - 交通站点
  { canonicalName: '杭州东站', category: 'station', cityCode: 'hangzhou', cityName: '杭州', lat: 30.2900, lng: 120.2130, address: '杭州市江干区全福桥路' },
  { canonicalName: '杭州萧山国际机场', category: 'station', cityCode: 'hangzhou', cityName: '杭州', lat: 30.2295, lng: 120.4345, address: '杭州市萧山区空港大道' },

  // 上海 - 景点
  { canonicalName: '外滩', category: 'attraction', cityCode: 'shanghai', cityName: '上海', lat: 31.2397, lng: 121.4931, address: '上海市黄浦区中山东一路', attributes: { rating: 4.7, description: '上海标志性景观', openHours: '全天开放', ticketPrice: 0 } },
  { canonicalName: '东方明珠', category: 'attraction', cityCode: 'shanghai', cityName: '上海', lat: 31.2397, lng: 121.4993, address: '上海市浦东新区世纪大道1号', attributes: { rating: 4.3, description: '上海地标建筑', openHours: '08:00-21:30', ticketPrice: 22000 } },
  { canonicalName: '豫园', category: 'attraction', cityCode: 'shanghai', cityName: '上海', lat: 31.2276, lng: 121.4919, address: '上海市黄浦区安仁街137号', attributes: { rating: 4.4, description: '明代古典园林', openHours: '08:30-17:00', ticketPrice: 4000 } },
  // 上海 - 餐厅
  { canonicalName: '南翔馒头店', category: 'restaurant', cityCode: 'shanghai', cityName: '上海', lat: 31.2275, lng: 121.4925, address: '上海市黄浦区豫园老街85号', attributes: { rating: 4.2, description: '百年老店，小笼包名店', avgPrice: 5000 } },
  // 上海 - 酒店
  { canonicalName: '上海浦东丽思卡尔顿', category: 'hotel', cityCode: 'shanghai', cityName: '上海', lat: 31.2355, lng: 121.5055, address: '上海市浦东新区陆家嘴世纪大道8号', attributes: { rating: 4.9, description: '超五星级酒店', priceRange: '1500-3000元/晚' } },
  { canonicalName: '上海全季酒店(外滩店)', category: 'hotel', cityCode: 'shanghai', cityName: '上海', lat: 31.2350, lng: 121.4900, address: '上海市黄浦区南京东路', attributes: { rating: 4.1, description: '中档商务酒店', priceRange: '350-500元/晚' } },
  // 上海 - 交通站点
  { canonicalName: '上海虹桥站', category: 'station', cityCode: 'shanghai', cityName: '上海', lat: 31.1949, lng: 121.3200, address: '上海市闵行区申虹路' },
  { canonicalName: '上海浦东国际机场', category: 'station', cityCode: 'shanghai', cityName: '上海', lat: 31.1434, lng: 121.8053, address: '上海市浦东新区迎宾大道' },

  // 北京 - 景点
  { canonicalName: '故宫博物院', category: 'attraction', cityCode: 'beijing', cityName: '北京', lat: 39.9163, lng: 116.3972, address: '北京市东城区景山前街4号', attributes: { rating: 4.9, description: '世界文化遗产，明清皇宫', openHours: '08:30-17:00', ticketPrice: 6000 } },
  { canonicalName: '长城(八达岭)', category: 'attraction', cityCode: 'beijing', cityName: '北京', lat: 40.3519, lng: 116.0156, address: '北京市延庆区G6京藏高速', attributes: { rating: 4.8, description: '世界文化遗产', openHours: '06:30-19:00', ticketPrice: 4000 } },
  { canonicalName: '颐和园', category: 'attraction', cityCode: 'beijing', cityName: '北京', lat: 39.9996, lng: 116.2751, address: '北京市海淀区新建宫门路19号', attributes: { rating: 4.7, description: '皇家园林博物馆', openHours: '06:30-18:00', ticketPrice: 3000 } },
  // 北京 - 餐厅
  { canonicalName: '全聚德(前门店)', category: 'restaurant', cityCode: 'beijing', cityName: '北京', lat: 39.8994, lng: 116.3983, address: '北京市东城区前门大街30号', attributes: { rating: 4.1, description: '北京烤鸭老字号', avgPrice: 18000 } },
  // 北京 - 酒店
  { canonicalName: '北京王府井文华东方', category: 'hotel', cityCode: 'beijing', cityName: '北京', lat: 39.9140, lng: 116.4100, address: '北京市东城区王府井大街', attributes: { rating: 4.8, description: '五星级豪华酒店', priceRange: '1200-2500元/晚' } },
  // 北京 - 交通站点
  { canonicalName: '北京南站', category: 'station', cityCode: 'beijing', cityName: '北京', lat: 39.8650, lng: 116.3780, address: '北京市丰台区永外大街' },
  { canonicalName: '北京首都国际机场', category: 'station', cityCode: 'beijing', cityName: '北京', lat: 40.0799, lng: 116.6031, address: '北京市顺义区天竺镇' },

  // 南京 - 景点
  { canonicalName: '中山陵', category: 'attraction', cityCode: 'nanjing', cityName: '南京', lat: 32.0617, lng: 118.8489, address: '南京市玄武区石象路7号', attributes: { rating: 4.7, description: '孙中山先生陵寝', openHours: '08:30-17:00', ticketPrice: 0 } },
  { canonicalName: '夫子庙', category: 'attraction', cityCode: 'nanjing', cityName: '南京', lat: 32.0224, lng: 118.7876, address: '南京市秦淮区贡院西街', attributes: { rating: 4.4, description: '秦淮河畔历史文化街区', openHours: '全天开放', ticketPrice: 0 } },
  { canonicalName: '总统府', category: 'attraction', cityCode: 'nanjing', cityName: '南京', lat: 32.0459, lng: 118.7929, address: '南京市玄武区长江路292号', attributes: { rating: 4.5, description: '中国近代遗址博物馆', openHours: '08:30-17:00', ticketPrice: 3500 } },
  // 南京 - 餐厅
  { canonicalName: '南京大牌档', category: 'restaurant', cityCode: 'nanjing', cityName: '南京', lat: 32.0350, lng: 118.7860, address: '南京市秦淮区中山南路', attributes: { rating: 4.3, description: '正宗南京菜', avgPrice: 10000 } },
  // 南京 - 酒店
  { canonicalName: '南京金陵饭店', category: 'hotel', cityCode: 'nanjing', cityName: '南京', lat: 32.0480, lng: 118.7840, address: '南京市鼓楼区汉中路2号', attributes: { rating: 4.6, description: '五星级经典酒店', priceRange: '500-900元/晚' } },
  // 南京 - 交通站点
  { canonicalName: '南京南站', category: 'station', cityCode: 'nanjing', cityName: '南京', lat: 31.9720, lng: 118.7890, address: '南京市雨花台区南站大道' },

  // 昆明 - 景点
  { canonicalName: '石林风景区', category: 'attraction', cityCode: 'kunming', cityName: '昆明', lat: 24.7869, lng: 103.2726, address: '昆明市石林彝族自治县', attributes: { rating: 4.6, description: '世界自然遗产', openHours: '07:00-18:00', ticketPrice: 13000 } },
  { canonicalName: '滇池', category: 'attraction', cityCode: 'kunming', cityName: '昆明', lat: 24.9860, lng: 102.6640, address: '昆明市西山区滇池路', attributes: { rating: 4.3, description: '高原明珠', openHours: '全天开放', ticketPrice: 0 } },
  { canonicalName: '翠湖公园', category: 'attraction', cityCode: 'kunming', cityName: '昆明', lat: 25.0440, lng: 102.7110, address: '昆明市五华区翠湖南路', attributes: { rating: 4.4, description: '昆明市区休闲公园', openHours: '全天开放', ticketPrice: 0 } },
  // 昆明 - 餐厅
  { canonicalName: '篆新农贸市场', category: 'restaurant', cityCode: 'kunming', cityName: '昆明', lat: 25.0330, lng: 102.7210, address: '昆明市盘龙区篆正街', attributes: { rating: 4.5, description: '本地特色小吃聚集地', avgPrice: 3000 } },
  // 昆明 - 酒店
  { canonicalName: '昆明洲际酒店', category: 'hotel', cityCode: 'kunming', cityName: '昆明', lat: 25.0200, lng: 102.7250, address: '昆明市官渡区滇池国家旅游度假区', attributes: { rating: 4.7, description: '五星级度假酒店', priceRange: '600-1200元/晚' } },
  // 昆明 - 交通站点
  { canonicalName: '昆明南站', category: 'station', cityCode: 'kunming', cityName: '昆明', lat: 24.8600, lng: 102.8450, address: '昆明市呈贡区' },
  { canonicalName: '昆明长水国际机场', category: 'station', cityCode: 'kunming', cityName: '昆明', lat: 25.1025, lng: 102.9290, address: '昆明市官渡区长水村' },
];

async function main() {
  console.log('🌱 Starting seed...');

  // 1. 插入城市数据
  console.log('📍 Inserting cities...');
  for (const city of cities) {
    await prisma.city.upsert({
      where: { code: city.code },
      update: city,
      create: city,
    });
  }
  console.log(`✅ ${cities.length} cities inserted`);

  // 2. 插入地点数据
  console.log('📍 Inserting places...');
  for (const place of places) {
    const existing = await prisma.place.findFirst({
      where: {
        canonicalName: place.canonicalName,
        cityCode: place.cityCode,
      },
    });
    if (existing) {
      await prisma.place.update({
        where: { id: existing.id },
        data: place,
      });
    } else {
      await prisma.place.create({ data: place });
    }
  }
  console.log(`✅ ${places.length} places inserted`);

  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
