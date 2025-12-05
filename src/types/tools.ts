/**
 * 工具类型定义
 * 定义实用工具页面的核心类型和元数据
 */

/**
 * 工具标识符枚举
 */
export enum ToolId {
  JSON_FORMATTER = 'json-formatter',
  BARK_NOTIFIER = 'bark-notifier',
  TEXT_CRYPTOR = 'text-cryptor',
  TIMESTAMP_CONVERTER = 'timestamp-converter',
  BASE64_CONVERTER = 'base64-converter',
  URL_CODEC = 'url-codec',
  CRON_BUILDER = 'cron-builder',
  // 新增工具
  RANDOM_GENERATOR = 'random-generator',
  HASH_CALCULATOR = 'hash-calculator',
  REGEX_TESTER = 'regex-tester',
  COLOR_CONVERTER = 'color-converter',
  QRCODE_GENERATOR = 'qrcode-generator',
  DIFF_VIEWER = 'diff-viewer',
  LOREM_IPSUM = 'lorem-ipsum',
  NUMBER_BASE = 'number-base',
  JWT_DECODER = 'jwt-decoder',
  MARKDOWN_PREVIEW = 'markdown-preview',
  HTML_ENTITY = 'html-entity',
  PASSWORD_GENERATOR = 'password-generator',
  HTML_TO_MARKDOWN = 'html-to-markdown',
  IMAGE_CONVERTER = 'image-converter',
  SVG_TOOL = 'svg-tool',
  HTTP_URL_TESTER = 'http-url-tester',
  YAML_TOML_CONVERTER = 'yaml-toml-converter',
}

/**
 * 工具元数据接口
 */
export interface ToolMetadata {
  id: ToolId;
  nameKey: string; // i18n key for tool name
  descriptionKey: string; // i18n key for tool description
  icon: string; // Material Symbols icon name
  category: 'developer' | 'utility' | 'network';
}

/**
 * 工具配置接口
 */
export interface ToolConfig {
  enabledTools: ToolId[];
  toolOrder?: ToolId[];
}

/**
 * 默认工具顺序（按枚举定义顺序）
 */
export const DEFAULT_TOOL_ORDER: ToolId[] = Object.values(ToolId);

/**
 * 工具顺序存储键
 */
export const TOOL_ORDER_STORAGE_KEY = 'tool_order';

/**
 * 验证并补全工具顺序
 * - 过滤无效的工具 ID
 * - 补全缺失的工具（追加到末尾）
 * - 去除重复项
 */
export function getValidToolOrder(stored: unknown): ToolId[] {
  const allToolIds = Object.values(ToolId);
  
  // 非数组输入返回默认顺序
  if (!Array.isArray(stored)) {
    return [...allToolIds];
  }
  
  // 过滤无效的工具 ID 并去重
  const seen = new Set<ToolId>();
  const validIds: ToolId[] = [];
  
  for (const id of stored) {
    if (allToolIds.includes(id as ToolId) && !seen.has(id as ToolId)) {
      seen.add(id as ToolId);
      validIds.push(id as ToolId);
    }
  }
  
  // 添加缺失的新工具到末尾
  const missingIds = allToolIds.filter(id => !seen.has(id));
  
  return [...validIds, ...missingIds];
}

/**
 * 工具组件 Props 接口
 */
export interface ToolComponentProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
}

/**
 * 所有工具的元数据常量
 */
export const TOOL_METADATA: Record<ToolId, ToolMetadata> = {
  [ToolId.JSON_FORMATTER]: {
    id: ToolId.JSON_FORMATTER,
    nameKey: 'tools.jsonFormatter.name',
    descriptionKey: 'tools.jsonFormatter.description',
    icon: 'code',
    category: 'developer',
  },
  [ToolId.BARK_NOTIFIER]: {
    id: ToolId.BARK_NOTIFIER,
    nameKey: 'tools.barkNotifier.name',
    descriptionKey: 'tools.barkNotifier.description',
    icon: 'notifications',
    category: 'network',
  },
  [ToolId.TEXT_CRYPTOR]: {
    id: ToolId.TEXT_CRYPTOR,
    nameKey: 'tools.textCryptor.name',
    descriptionKey: 'tools.textCryptor.description',
    icon: 'lock',
    category: 'utility',
  },
  [ToolId.TIMESTAMP_CONVERTER]: {
    id: ToolId.TIMESTAMP_CONVERTER,
    nameKey: 'tools.timestampConverter.name',
    descriptionKey: 'tools.timestampConverter.description',
    icon: 'schedule',
    category: 'developer',
  },
  [ToolId.BASE64_CONVERTER]: {
    id: ToolId.BASE64_CONVERTER,
    nameKey: 'tools.base64Converter.name',
    descriptionKey: 'tools.base64Converter.description',
    icon: 'data_object',
    category: 'developer',
  },
  [ToolId.URL_CODEC]: {
    id: ToolId.URL_CODEC,
    nameKey: 'tools.urlCodec.name',
    descriptionKey: 'tools.urlCodec.description',
    icon: 'link',
    category: 'developer',
  },
  [ToolId.CRON_BUILDER]: {
    id: ToolId.CRON_BUILDER,
    nameKey: 'tools.cronBuilder.name',
    descriptionKey: 'tools.cronBuilder.description',
    icon: 'event_repeat',
    category: 'developer',
  },
  // 新增工具元数据
  [ToolId.RANDOM_GENERATOR]: {
    id: ToolId.RANDOM_GENERATOR,
    nameKey: 'tools.randomGenerator.name',
    descriptionKey: 'tools.randomGenerator.description',
    icon: 'casino',
    category: 'developer',
  },
  [ToolId.HASH_CALCULATOR]: {
    id: ToolId.HASH_CALCULATOR,
    nameKey: 'tools.hashCalculator.name',
    descriptionKey: 'tools.hashCalculator.description',
    icon: 'tag',
    category: 'developer',
  },
  [ToolId.REGEX_TESTER]: {
    id: ToolId.REGEX_TESTER,
    nameKey: 'tools.regexTester.name',
    descriptionKey: 'tools.regexTester.description',
    icon: 'regular_expression',
    category: 'developer',
  },
  [ToolId.COLOR_CONVERTER]: {
    id: ToolId.COLOR_CONVERTER,
    nameKey: 'tools.colorConverter.name',
    descriptionKey: 'tools.colorConverter.description',
    icon: 'palette',
    category: 'utility',
  },
  [ToolId.QRCODE_GENERATOR]: {
    id: ToolId.QRCODE_GENERATOR,
    nameKey: 'tools.qrcodeGenerator.name',
    descriptionKey: 'tools.qrcodeGenerator.description',
    icon: 'qr_code_2',
    category: 'utility',
  },
  [ToolId.DIFF_VIEWER]: {
    id: ToolId.DIFF_VIEWER,
    nameKey: 'tools.diffViewer.name',
    descriptionKey: 'tools.diffViewer.description',
    icon: 'difference',
    category: 'developer',
  },
  [ToolId.LOREM_IPSUM]: {
    id: ToolId.LOREM_IPSUM,
    nameKey: 'tools.loremIpsum.name',
    descriptionKey: 'tools.loremIpsum.description',
    icon: 'article',
    category: 'utility',
  },
  [ToolId.NUMBER_BASE]: {
    id: ToolId.NUMBER_BASE,
    nameKey: 'tools.numberBase.name',
    descriptionKey: 'tools.numberBase.description',
    icon: 'calculate',
    category: 'developer',
  },
  [ToolId.JWT_DECODER]: {
    id: ToolId.JWT_DECODER,
    nameKey: 'tools.jwtDecoder.name',
    descriptionKey: 'tools.jwtDecoder.description',
    icon: 'token',
    category: 'developer',
  },
  [ToolId.MARKDOWN_PREVIEW]: {
    id: ToolId.MARKDOWN_PREVIEW,
    nameKey: 'tools.markdownPreview.name',
    descriptionKey: 'tools.markdownPreview.description',
    icon: 'markdown',
    category: 'developer',
  },
  [ToolId.HTML_ENTITY]: {
    id: ToolId.HTML_ENTITY,
    nameKey: 'tools.htmlEntity.name',
    descriptionKey: 'tools.htmlEntity.description',
    icon: 'code',
    category: 'developer',
  },
  [ToolId.PASSWORD_GENERATOR]: {
    id: ToolId.PASSWORD_GENERATOR,
    nameKey: 'tools.passwordGenerator.name',
    descriptionKey: 'tools.passwordGenerator.description',
    icon: 'password',
    category: 'utility',
  },
  [ToolId.HTML_TO_MARKDOWN]: {
    id: ToolId.HTML_TO_MARKDOWN,
    nameKey: 'tools.htmlToMarkdown.name',
    descriptionKey: 'tools.htmlToMarkdown.description',
    icon: 'swap_horiz',
    category: 'developer',
  },
  [ToolId.IMAGE_CONVERTER]: {
    id: ToolId.IMAGE_CONVERTER,
    nameKey: 'tools.imageConverter.name',
    descriptionKey: 'tools.imageConverter.description',
    icon: 'image',
    category: 'utility',
  },
  [ToolId.SVG_TOOL]: {
    id: ToolId.SVG_TOOL,
    nameKey: 'tools.svgTool.name',
    descriptionKey: 'tools.svgTool.description',
    icon: 'draw',
    category: 'utility',
  },
  [ToolId.HTTP_URL_TESTER]: {
    id: ToolId.HTTP_URL_TESTER,
    nameKey: 'tools.httpTester.name',
    descriptionKey: 'tools.httpTester.description',
    icon: 'http',
    category: 'network',
  },
  [ToolId.YAML_TOML_CONVERTER]: {
    id: ToolId.YAML_TOML_CONVERTER,
    nameKey: 'tools.yamlTomlConverter.name',
    descriptionKey: 'tools.yamlTomlConverter.description',
    icon: 'swap_vert',
    category: 'developer',
  },
};

/**
 * 获取所有工具的元数据数组
 */
export const getAllToolsMetadata = (): ToolMetadata[] => {
  return Object.values(TOOL_METADATA);
};

/**
 * 根据 ID 获取工具元数据
 */
export const getToolMetadata = (id: ToolId): ToolMetadata => {
  return TOOL_METADATA[id];
};
