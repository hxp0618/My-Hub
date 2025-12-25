/**
 * 农历服务
 * 提供公历转农历日期转换功能
 */
import { Solar, Lunar } from 'lunar-javascript';
import { LunarDate } from '../types/subscription';

/**
 * 农历月份名称
 */
const LUNAR_MONTH_NAMES = [
  '', '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月'
];

/**
 * 农历日期名称
 */
const LUNAR_DAY_NAMES = [
  '', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

/**
 * 将公历日期转换为农历日期
 * @param date 公历日期
 * @returns 农历日期对象
 */
export function toLunar(date: Date): LunarDate {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();
  
  const month = lunar.getMonth();
  const day = lunar.getDay();
  const isLeapMonth = lunar.getMonth() < 0; // 负数表示闰月
  const absMonth = Math.abs(month);
  
  return {
    year: lunar.getYear(),
    month: absMonth,
    day: day,
    isLeapMonth: isLeapMonth,
    monthName: (isLeapMonth ? '闰' : '') + LUNAR_MONTH_NAMES[absMonth],
    dayName: LUNAR_DAY_NAMES[day],
  };
}

/**
 * 将农历日期转换为公历日期
 * @param lunar 农历日期对象
 * @returns 公历日期
 */
export function toSolar(lunar: LunarDate): Date {
  const lunarObj = Lunar.fromYmd(
    lunar.year,
    lunar.isLeapMonth ? -lunar.month : lunar.month,
    lunar.day
  );
  const solar = lunarObj.getSolar();
  return new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
}

/**
 * 格式化农历日期为字符串
 * @param lunar 农历日期对象
 * @returns 格式化的农历日期字符串
 */
export function formatLunarDate(lunar: LunarDate): string {
  return `${lunar.monthName}${lunar.dayName}`;
}

/**
 * 格式化农历日期为完整字符串（包含年份）
 * @param lunar 农历日期对象
 * @returns 格式化的完整农历日期字符串
 */
export function formatLunarDateFull(lunar: LunarDate): string {
  return `${lunar.year}年${lunar.monthName}${lunar.dayName}`;
}

/**
 * 从时间戳获取农历日期
 * @param timestamp 时间戳（毫秒）
 * @returns 农历日期对象
 */
export function getLunarFromTimestamp(timestamp: number): LunarDate {
  return toLunar(new Date(timestamp));
}

/**
 * 从时间戳获取格式化的农历日期字符串
 * @param timestamp 时间戳（毫秒）
 * @returns 格式化的农历日期字符串
 */
export function formatLunarFromTimestamp(timestamp: number): string {
  const lunar = getLunarFromTimestamp(timestamp);
  return formatLunarDate(lunar);
}

// 导出服务对象
export const lunarService = {
  toLunar,
  toSolar,
  formatLunarDate,
  formatLunarDateFull,
  getLunarFromTimestamp,
  formatLunarFromTimestamp,
};

export default lunarService;
