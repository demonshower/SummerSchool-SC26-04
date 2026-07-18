-- 种子数据: 城市
INSERT INTO "cities" ("id", "code", "name", "province", "lat", "lng", "timezone", "is_active") VALUES
('city_shanghai', 'shanghai', '上海', '上海市', 31.2304, 121.4737, 'Asia/Shanghai', true),
('city_beijing', 'beijing', '北京', '北京市', 39.9042, 116.4074, 'Asia/Shanghai', true),
('city_hangzhou', 'hangzhou', '杭州', '浙江省', 30.2741, 120.1551, 'Asia/Shanghai', true),
('city_nanjing', 'nanjing', '南京', '江苏省', 32.0603, 118.7969, 'Asia/Shanghai', true),
('city_suzhou', 'suzhou', '苏州', '江苏省', 31.2990, 120.5853, 'Asia/Shanghai', true),
('city_kunming', 'kunming', '昆明', '云南省', 25.0389, 102.7183, 'Asia/Shanghai', true),
('city_chengdu', 'chengdu', '成都', '四川省', 30.5728, 104.0668, 'Asia/Shanghai', true),
('city_xian', 'xian', '西安', '陕西省', 34.3416, 108.9398, 'Asia/Shanghai', true),
('city_guangzhou', 'guangzhou', '广州', '广东省', 23.1291, 113.2644, 'Asia/Shanghai', true),
('city_shenzhen', 'shenzhen', '深圳', '广东省', 22.5431, 114.0579, 'Asia/Shanghai', true),
('city_chongqing', 'chongqing', '重庆', '重庆市', 29.4316, 106.9123, 'Asia/Shanghai', true),
('city_wuhan', 'wuhan', '武汉', '湖北省', 30.5928, 114.3055, 'Asia/Shanghai', true),
('city_changsha', 'changsha', '长沙', '湖南省', 28.2280, 112.9388, 'Asia/Shanghai', true),
('city_xiamen', 'xiamen', '厦门', '福建省', 24.4798, 118.0894, 'Asia/Shanghai', true),
('city_qingdao', 'qingdao', '青岛', '山东省', 36.0671, 120.3826, 'Asia/Shanghai', true)
ON CONFLICT ("id") DO NOTHING;

-- 种子数据: 地点 (POI)
INSERT INTO "places" ("id", "canonical_name", "category", "city_code", "city_name", "address", "lat", "lng", "timezone", "attributes") VALUES
-- 杭州景点
('place_xihu', '西湖风景区', 'attraction', 'hangzhou', '杭州', '杭州市西湖区龙井路1号', 30.2421, 120.1483, 'Asia/Shanghai', '{"rating": 4.8, "description": "杭州最著名的自然风景区，世界文化遗产", "openHours": "全天开放", "ticketPrice": 0}'),
('place_lingyin', '灵隐寺', 'attraction', 'hangzhou', '杭州', '杭州市西湖区灵隐路法云弄1号', 30.2400, 120.1010, 'Asia/Shanghai', '{"rating": 4.6, "description": "千年古刹，江南名刹", "openHours": "07:00-18:15", "ticketPrice": 7500}'),
('place_songcheng', '宋城景区', 'attraction', 'hangzhou', '杭州', '杭州市西湖区之江路148号', 30.1850, 120.1130, 'Asia/Shanghai', '{"rating": 4.5, "description": "大型宋文化主题公园", "openHours": "10:00-21:00", "ticketPrice": 31000}'),
('place_xixi', '西溪湿地公园', 'attraction', 'hangzhou', '杭州', '杭州市西湖区天目山路518号', 30.2660, 120.0610, 'Asia/Shanghai', '{"rating": 4.4, "description": "国家级湿地公园", "openHours": "08:00-17:30", "ticketPrice": 8000}'),
-- 杭州餐厅
('place_louwai', '楼外楼', 'restaurant', 'hangzhou', '杭州', '杭州市西湖区孤山路30号', 30.2540, 120.1390, 'Asia/Shanghai', '{"rating": 4.3, "description": "百年老店，杭帮菜代表", "avgPrice": 15000}'),
('place_zhiweiguan', '知味观', 'restaurant', 'hangzhou', '杭州', '杭州市上城区仁和路83号', 30.2480, 120.1680, 'Asia/Shanghai', '{"rating": 4.4, "description": "杭州老字号，小吃点心", "avgPrice": 8000}'),
-- 杭州酒店
('place_hotel_mercure', '杭州西湖美居酒店', 'hotel', 'hangzhou', '杭州', '杭州市西湖区南山路', 30.2450, 120.1520, 'Asia/Shanghai', '{"rating": 4.5, "description": "位于西湖区核心地段，距离西湖步行10分钟", "priceRange": "350-500元/晚"}'),
('place_hotel_grand', '杭州君悦酒店', 'hotel', 'hangzhou', '杭州', '杭州市上城区解放路28号', 30.2490, 120.1640, 'Asia/Shanghai', '{"rating": 4.8, "description": "五星级豪华酒店", "priceRange": "800-1500元/晚"}'),
('place_hotel_homeinn', '杭州如家精选酒店', 'hotel', 'hangzhou', '杭州', '杭州市西湖区延安路', 30.2520, 120.1580, 'Asia/Shanghai', '{"rating": 4.0, "description": "经济型连锁酒店", "priceRange": "200-350元/晚"}'),
('place_hotel_jijiu', '杭州全季酒店', 'hotel', 'hangzhou', '杭州', '杭州市拱墅区莫干山路', 30.2650, 120.1650, 'Asia/Shanghai', '{"rating": 4.2, "description": "中档商务酒店", "priceRange": "280-400元/晚"}'),
-- 杭州交通站点
('place_hz_east', '杭州东站', 'station', 'hangzhou', '杭州', '杭州市江干区全福桥路', 30.2900, 120.2130, 'Asia/Shanghai', NULL),
('place_hz_airport', '杭州萧山国际机场', 'station', 'hangzhou', '杭州', '杭州市萧山区空港大道', 30.2295, 120.4345, 'Asia/Shanghai', NULL),
-- 上海景点
('place_waitan', '外滩', 'attraction', 'shanghai', '上海', '上海市黄浦区中山东一路', 31.2397, 121.4931, 'Asia/Shanghai', '{"rating": 4.7, "description": "上海标志性景观", "openHours": "全天开放", "ticketPrice": 0}'),
('place_pearl', '东方明珠', 'attraction', 'shanghai', '上海', '上海市浦东新区世纪大道1号', 31.2397, 121.4993, 'Asia/Shanghai', '{"rating": 4.3, "description": "上海地标建筑", "openHours": "08:00-21:30", "ticketPrice": 22000}'),
('place_yuyuan', '豫园', 'attraction', 'shanghai', '上海', '上海市黄浦区安仁街137号', 31.2276, 121.4919, 'Asia/Shanghai', '{"rating": 4.4, "description": "明代古典园林", "openHours": "08:30-17:00", "ticketPrice": 4000}'),
-- 上海餐厅
('place_nanxiang', '南翔馒头店', 'restaurant', 'shanghai', '上海', '上海市黄浦区豫园老街85号', 31.2275, 121.4925, 'Asia/Shanghai', '{"rating": 4.2, "description": "百年老店，小笼包名店", "avgPrice": 5000}'),
-- 上海酒店
('place_hotel_ritz', '上海浦东丽思卡尔顿', 'hotel', 'shanghai', '上海', '上海市浦东新区陆家嘴世纪大道8号', 31.2355, 121.5055, 'Asia/Shanghai', '{"rating": 4.9, "description": "超五星级酒店", "priceRange": "1500-3000元/晚"}'),
('place_hotel_jj_sh', '上海全季酒店(外滩店)', 'hotel', 'shanghai', '上海', '上海市黄浦区南京东路', 31.2350, 121.4900, 'Asia/Shanghai', '{"rating": 4.1, "description": "中档商务酒店", "priceRange": "350-500元/晚"}'),
-- 上海交通站点
('place_sh_hongqiao', '上海虹桥站', 'station', 'shanghai', '上海', '上海市闵行区申虹路', 31.1949, 121.3200, 'Asia/Shanghai', NULL),
('place_sh_pudong_airport', '上海浦东国际机场', 'station', 'shanghai', '上海', '上海市浦东新区迎宾大道', 31.1434, 121.8053, 'Asia/Shanghai', NULL),
-- 北京景点
('place_gugong', '故宫博物院', 'attraction', 'beijing', '北京', '北京市东城区景山前街4号', 39.9163, 116.3972, 'Asia/Shanghai', '{"rating": 4.9, "description": "世界文化遗产，明清皇宫", "openHours": "08:30-17:00", "ticketPrice": 6000}'),
('place_changcheng', '长城(八达岭)', 'attraction', 'beijing', '北京', '北京市延庆区G6京藏高速', 40.3519, 116.0156, 'Asia/Shanghai', '{"rating": 4.8, "description": "世界文化遗产", "openHours": "06:30-19:00", "ticketPrice": 4000}'),
('place_yiheyuan', '颐和园', 'attraction', 'beijing', '北京', '北京市海淀区新建宫门路19号', 39.9996, 116.2751, 'Asia/Shanghai', '{"rating": 4.7, "description": "皇家园林博物馆", "openHours": "06:30-18:00", "ticketPrice": 3000}'),
-- 北京餐厅
('place_quanjude', '全聚德(前门店)', 'restaurant', 'beijing', '北京', '北京市东城区前门大街30号', 39.8994, 116.3983, 'Asia/Shanghai', '{"rating": 4.1, "description": "北京烤鸭老字号", "avgPrice": 18000}'),
-- 北京酒店
('place_hotel_mandarin', '北京王府井文华东方', 'hotel', 'beijing', '北京', '北京市东城区王府井大街', 39.9140, 116.4100, 'Asia/Shanghai', '{"rating": 4.8, "description": "五星级豪华酒店", "priceRange": "1200-2500元/晚"}'),
-- 北京交通站点
('place_bj_south', '北京南站', 'station', 'beijing', '北京', '北京市丰台区永外大街', 39.8650, 116.3780, 'Asia/Shanghai', NULL),
('place_bj_capital_airport', '北京首都国际机场', 'station', 'beijing', '北京', '北京市顺义区天竺镇', 40.0799, 116.6031, 'Asia/Shanghai', NULL),
-- 南京景点
('place_zhongshanling', '中山陵', 'attraction', 'nanjing', '南京', '南京市玄武区石象路7号', 32.0617, 118.8489, 'Asia/Shanghai', '{"rating": 4.7, "description": "孙中山先生陵寝", "openHours": "08:30-17:00", "ticketPrice": 0}'),
('place_fuzimiao', '夫子庙', 'attraction', 'nanjing', '南京', '南京市秦淮区贡院西街', 32.0224, 118.7876, 'Asia/Shanghai', '{"rating": 4.4, "description": "秦淮河畔历史文化街区", "openHours": "全天开放", "ticketPrice": 0}'),
('place_zongtongfu', '总统府', 'attraction', 'nanjing', '南京', '南京市玄武区长江路292号', 32.0459, 118.7929, 'Asia/Shanghai', '{"rating": 4.5, "description": "中国近代遗址博物馆", "openHours": "08:30-17:00", "ticketPrice": 3500}'),
-- 南京餐厅
('place_dapaidang', '南京大牌档', 'restaurant', 'nanjing', '南京', '南京市秦淮区中山南路', 32.0350, 118.7860, 'Asia/Shanghai', '{"rating": 4.3, "description": "正宗南京菜", "avgPrice": 10000}'),
-- 南京酒店
('place_hotel_jinling', '南京金陵饭店', 'hotel', 'nanjing', '南京', '南京市鼓楼区汉中路2号', 32.0480, 118.7840, 'Asia/Shanghai', '{"rating": 4.6, "description": "五星级经典酒店", "priceRange": "500-900元/晚"}'),
-- 南京交通站点
('place_nj_south', '南京南站', 'station', 'nanjing', '南京', '南京市雨花台区南站大道', 31.9720, 118.7890, 'Asia/Shanghai', NULL),
-- 昆明景点
('place_shilin', '石林风景区', 'attraction', 'kunming', '昆明', '昆明市石林彝族自治县', 24.7869, 103.2726, 'Asia/Shanghai', '{"rating": 4.6, "description": "世界自然遗产", "openHours": "07:00-18:00", "ticketPrice": 13000}'),
('place_dianchi', '滇池', 'attraction', 'kunming', '昆明', '昆明市西山区滇池路', 24.9860, 102.6640, 'Asia/Shanghai', '{"rating": 4.3, "description": "高原明珠", "openHours": "全天开放", "ticketPrice": 0}'),
('place_cuihu', '翠湖公园', 'attraction', 'kunming', '昆明', '昆明市五华区翠湖南路', 25.0440, 102.7110, 'Asia/Shanghai', '{"rating": 4.4, "description": "昆明市区休闲公园", "openHours": "全天开放", "ticketPrice": 0}'),
-- 昆明餐厅
('place_zhuanxin', '篆新农贸市场', 'restaurant', 'kunming', '昆明', '昆明市盘龙区篆正街', 25.0330, 102.7210, 'Asia/Shanghai', '{"rating": 4.5, "description": "本地特色小吃聚集地", "avgPrice": 3000}'),
-- 昆明酒店
('place_hotel_intercon_km', '昆明洲际酒店', 'hotel', 'kunming', '昆明', '昆明市官渡区滇池国家旅游度假区', 25.0200, 102.7250, 'Asia/Shanghai', '{"rating": 4.7, "description": "五星级度假酒店", "priceRange": "600-1200元/晚"}'),
-- 昆明交通站点
('place_km_south', '昆明南站', 'station', 'kunming', '昆明', '昆明市呈贡区', 24.8600, 102.8450, 'Asia/Shanghai', NULL),
('place_km_airport', '昆明长水国际机场', 'station', 'kunming', '昆明', '昆明市官渡区长水村', 25.1025, 102.9290, 'Asia/Shanghai', NULL)
ON CONFLICT ("id") DO NOTHING;
