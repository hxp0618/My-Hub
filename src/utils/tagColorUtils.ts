/**
 * 标签色卡数量
 * 使用 Neo-Brutalism 装饰色板（rose / peach / mint / sky / lavender / sand），
 * 不复用 4 个语义强调色，避免与"主操作 / 成功 / 危险 / 信息"语义冲突。
 */
const TAG_COLOR_COUNT = 6;

/**
 * 根据标签索引获取对应的色卡编号（1-6）
 * @param index 标签在列表中的索引（从 0 开始）
 * @returns 色卡编号（1-6）
 * @example
 * getTagColorNumber(0) // 返回 1
 * getTagColorNumber(5) // 返回 6
 * getTagColorNumber(6) // 返回 1（循环）
 */
export function getTagColorNumber(index: number): number {
  return (Math.abs(index) % TAG_COLOR_COUNT) + 1;
}

/**
 * 根据标签索引获取对应的颜色类名
 * @param index 标签在列表中的索引（从 0 开始）
 * @returns 颜色类名字符串（如 'tag-color-1'）
 * @example
 * getTagColorClass(0) // 返回 'tag-color-1'
 * getTagColorClass(5) // 返回 'tag-color-6'
 */
export function getTagColorClass(index: number): string {
  return `tag-color-${getTagColorNumber(index)}`;
}

/**
 * 为标签生成完整的类名字符串
 * @param index 标签在列表中的索引（从 0 开始）
 * @param additionalClasses 额外的类名（可选）
 * @returns 完整的类名字符串
 * @example
 * getTagClassName(0) // 返回 'tag-badge tag-color-1'
 * getTagClassName(1, 'flex items-center') // 返回 'tag-badge tag-color-2 flex items-center'
 */
export function getTagClassName(index: number, additionalClasses: string = ''): string {
  const colorClass = getTagColorClass(index);
  return `tag-badge ${colorClass} ${additionalClasses}`.trim();
}
