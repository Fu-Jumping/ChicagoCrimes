export const locationTypeMap: Record<string, string> = {
  STREET: '街道',
  RESIDENCE: '住宅',
  APARTMENT: '公寓',
  SIDEWALK: '人行道',
  OTHER: '其他',
  'PARKING LOT/GARAGE(NON.RESID.)': '停车场/车库',
  ALLEY: '小巷',
  'SCHOOL, PUBLIC, BUILDING': '公立学校建筑',
  'RESIDENCE-GARAGE': '住宅车库',
  'RESIDENCE PORCH/HALLWAY': '住宅门廊/走廊',
  'SMALL RETAIL STORE': '小型零售店',
  RESTAURANT: '餐厅',
  'VEHICLE NON-COMMERCIAL': '非商用车辆',
  'GROCERY FOOD STORE': '杂货店',
  'DEPARTMENT STORE': '百货公司',
  'GAS STATION': '加油站',
  'RESIDENTIAL YARD (FRONT/BACK)': '住宅庭院',
  'PARK PROPERTY': '公园',
  'COMMERCIAL / BUSINESS OFFICE': '商业/办公楼',
  'HOTEL/MOTEL': '酒店/汽车旅馆',
  'HOSPITAL BUILDING/GROUNDS': '医院',
  'CTA TRAIN': 'CTA列车',
  'CTA BUS': 'CTA公交',
  'BAR OR TAVERN': '酒吧',
  'DRUG STORE': '药店',
  'CONVENIENCE STORE': '便利店',
  'VACANT LOT/LAND': '空地',
  'SCHOOL, PUBLIC, GROUNDS': '公立学校场地',
  BANK: '银行',
  'CHURCH/SYNAGOGUE/PLACE OF WORSHIP': '教堂/宗教场所',
  'NURSING HOME/RETIREMENT HOME': '疗养院',
  'CONSTRUCTION SITE': '建筑工地',
  'ATHLETIC CLUB': '体育俱乐部',
  'DAY CARE CENTER': '日托中心',
  AUTO: '汽车',
  TAXICAB: '出租车',
  'ABANDONED BUILDING': '废弃建筑',
  WAREHOUSE: '仓库',
  'AIRPORT/AIRCRAFT': '机场/飞机',
  'CLEANING STORE': '洗衣店',
  'COIN OPERATED MACHINE': '投币机',
  'COLLEGE/UNIVERSITY GROUNDS': '大学场地',
  'COLLEGE/UNIVERSITY RESIDENCE HALL': '大学宿舍',
  'CREDIT UNION': '信用社',
  'CURRENCY EXCHANGE': '货币兑换处',
  'FACTORY/MANUFACTURING BUILDING': '工厂/制造厂',
  'FIRE STATION': '消防站',
  'FOREST PRESERVE': '森林保护区',
  'GOVERNMENT BUILDING/PROPERTY': '政府大楼/财产',
  'HIGHWAY/EXPRESSWAY': '高速公路',
  LIBRARY: '图书馆',
  'MEDICAL/DENTAL CLINIC': '医疗/牙科诊所',
  'MOVIE HOUSE/THEATER': '电影院',
  'PAWN SHOP': '当铺',
  'POLICE FACILITY/VEH PARKING LOT': '警察设施/停车场',
  'POOL ROOM': '台球室',
  'SAVINGS AND LOAN': '储蓄贷款机构',
  'SPORTS ARENA/STADIUM': '体育馆',
  'TAVERN/LIQUOR STORE': '酒馆/酒类商店',
  'VEHICLE-COMMERCIAL': '商用车辆',
  WATERWAY: '水道',
  YMCA: '基督教青年会',
  'BOWLING ALLEY': '保龄球馆',
  'CAR WASH': '洗车场',
  CEMETARY: '墓地',
  'DRIVEWAY - RESIDENTIAL': '住宅车道',
  ELEVATOR: '电梯',
  'GAS STATION DRIVE-UP WINDOW': '加油站免下车窗口',
  'LAKEFRONT/WATERFRONT/RIVERBANK': '湖畔/水滨/河岸',
  NEWSSTAND: '报摊',
  'PARKING LOT': '停车场',
  'PUBLIC GRAMMAR SCHOOL': '公立小学',
  'PUBLIC HIGH SCHOOL': '公立高中',
  'RIVER BANK': '河岸',
  SEWER: '下水道',
  STAIRWELL: '楼梯间',
  TRAILER: '拖车',
  'WOODED AREA': '林区',
  YARD: '院子'
}

const normalizeLocationTypeKey = (type: string): string =>
  type
    .trim()
    .toUpperCase()
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+\(/g, '(')
    .replace(/\)\s+/g, ')')
    .replace(/\s+/g, ' ')

const locationTypeAliases: Record<string, string> = {
  'CHA PARKING LOT/GROUNDS': 'CHA停车场/场地',
  'CHA APARTMENT': 'CHA公寓',
  'CHA HALLWAY/STAIRWELL/ELEVATOR': 'CHA走廊/楼梯间/电梯',
  'CTA PLATFORM': 'CTA站台',
  'PARKING LOT/GARAGE(NON RESIDENTIAL)': '停车场/车库',
  'PARKING LOT / GARAGE (NON RESIDENTIAL)': '停车场/车库'
}

export function translateLocationType(type: string): string {
  if (!type) return ''
  const normalizedType = normalizeLocationTypeKey(type)
  return locationTypeAliases[normalizedType] || locationTypeMap[normalizedType] || type.trim()
}
