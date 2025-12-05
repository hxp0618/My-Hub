/**
 * Bark 通知工具类型定义
 * 定义多密钥管理功能的核心类型和接口
 */

/**
 * Bark 密钥配置接口
 */
export interface BarkKeyConfig {
  id: string;                    // 唯一标识符，格式: bark_key_{timestamp}_{random}
  deviceKey: string;             // 设备密钥
  server: string;                // 服务器地址
  label: string;                 // 备注/标签
  createdAt: number;             // 创建时间戳（毫秒）
  updatedAt: number;             // 更新时间戳（毫秒）
}

/**
 * Bark 通知可选参数
 */
export interface BarkNotificationOptions {
  sound?: string; // 响铃声音，空字符串表示静音
  icon?: string; // 自定义图标 URL
  group?: string; // 消息分组
}

/**
 * Bark 通知历史记录项
 */
export interface BarkNotificationRecord {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  status: 'success' | 'failed';
  errorMessage?: string;
  options?: BarkNotificationOptions;
}

/**
 * 密钥管理器配置
 */
export interface KeyManagerConfig {
  keys: BarkKeyConfig[];         // 密钥配置列表
  selectedKeyId: string | null;  // 当前选中的密钥 ID
}

/**
 * 密钥管理器接口
 */
export interface IKeyManager {
  // 获取所有密钥配置
  getAllKeys(): BarkKeyConfig[];
  
  // 添加新密钥配置
  addKey(config: Omit<BarkKeyConfig, 'id' | 'createdAt' | 'updatedAt'>): BarkKeyConfig;
  
  // 更新密钥配置
  updateKey(id: string, updates: Partial<Omit<BarkKeyConfig, 'id' | 'createdAt'>>): BarkKeyConfig;
  
  // 删除密钥配置
  deleteKey(id: string): void;
  
  // 获取选中的密钥配置
  getSelectedKey(): BarkKeyConfig | null;
  
  // 设置选中的密钥
  setSelectedKey(id: string): void;
  
  // 测试密钥配置
  testKey(id: string): Promise<boolean>;
  
  // 验证密钥是否重复
  isDuplicateKey(deviceKey: string, excludeId?: string): boolean;
}

/**
 * 密钥选择器组件 Props（单选模式）
 */
export interface KeySelectorProps {
  keys: BarkKeyConfig[];
  selectedKeyId: string | null;
  onSelect: (keyId: string) => void;
  disabled?: boolean;
}

/**
 * 密钥选择器组件 Props（多选模式）
 */
export interface KeySelectorMultiProps {
  keys: BarkKeyConfig[];
  selectedKeyIds: string[];
  onMultiSelect: (keyIds: string[]) => void;
  disabled?: boolean;
  multiSelect: true;
}

/**
 * 密钥表单组件 Props
 */
export interface KeyFormProps {
  mode: 'add' | 'edit';
  initialData?: BarkKeyConfig;
  onSubmit: (data: Omit<BarkKeyConfig, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

/**
 * 密钥列表组件 Props
 */
export interface KeyListProps {
  keys: BarkKeyConfig[];
  selectedKeyId: string | null;
  onEdit: (key: BarkKeyConfig) => void;
  onDelete: (keyId: string) => void;
  onTest: (keyId: string) => void;
  onSelect: (keyId: string) => void;
  isTesting?: boolean;
  testingKeyId?: string | null;
}

/**
 * 输入验证结果
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}
