# 需求文档

## 简介

将现有的 UUID 生成器工具扩展为一个综合性的随机生成器工具，支持多种随机数据生成功能，包括 UUID、NanoID、ULID、ObjectId、雪花 ID、随机字符串、随机数字、MD5 哈希值等。该工具将为开发者提供一站式的随机数据生成解决方案。

## 术语表

- **Random_Generator**: 随机生成器系统，负责生成各种类型的随机数据
- **UUID**: 通用唯一识别码（Universally Unique Identifier），128 位标准格式
- **NanoID**: 一种小巧、安全、URL 友好的唯一字符串 ID 生成器
- **ULID**: 可排序的唯一标识符（Universally Unique Lexicographically Sortable Identifier）
- **ObjectId**: MongoDB 风格的 12 字节（24 位十六进制字符）唯一标识符
- **Snowflake_ID**: 雪花 ID，Twitter 开发的分布式唯一 ID 生成算法，64 位整数
- **MD5**: 消息摘要算法第五版，一种广泛使用的哈希函数，输出 128 位哈希值
- **Character_Set**: 字符集，定义可用于生成随机字符串的字符范围

## 需求

### 需求 1

**用户故事:** 作为开发者，我希望能够生成各种格式的 UUID，以便在不同场景下使用唯一标识符。

#### 验收标准

1. WHEN 用户选择 UUID v4 格式 THEN Random_Generator SHALL 生成符合 RFC 4122 标准的 UUID v4 字符串
2. WHEN 用户选择 UUID v1 格式 THEN Random_Generator SHALL 生成基于时间戳的 UUID v1 字符串
3. WHEN 用户选择"不带连字符"选项 THEN Random_Generator SHALL 生成移除所有连字符的 32 位 UUID 字符串
4. WHEN 用户指定生成数量（1-100）THEN Random_Generator SHALL 生成指定数量的 UUID

### 需求 2

**用户故事:** 作为开发者，我希望能够生成自定义的随机字符串，以便用于测试数据、临时标识符等场景。

#### 验收标准

1. WHEN 用户选择大写字母选项 THEN Random_Generator SHALL 在生成的字符串中包含 A-Z 字符
2. WHEN 用户选择小写字母选项 THEN Random_Generator SHALL 在生成的字符串中包含 a-z 字符
3. WHEN 用户选择数字选项 THEN Random_Generator SHALL 在生成的字符串中包含 0-9 字符
4. WHEN 用户选择特殊符号选项 THEN Random_Generator SHALL 在生成的字符串中包含 !@#$%^&*()_+-=[]{}|;:,.<>? 字符
5. WHEN 用户指定字符串长度（1-256）THEN Random_Generator SHALL 生成指定长度的随机字符串
6. WHEN 用户未选择任何字符集选项 THEN Random_Generator SHALL 显示错误提示并阻止生成

### 需求 3

**用户故事:** 作为开发者，我希望能够生成指定范围内的随机数字，以便用于测试和模拟数据。

#### 验收标准

1. WHEN 用户输入最小值和最大值 THEN Random_Generator SHALL 生成该范围内（包含边界）的随机整数
2. WHEN 用户输入的最小值大于最大值 THEN Random_Generator SHALL 显示错误提示并阻止生成
3. WHEN 用户指定生成数量（1-100）THEN Random_Generator SHALL 生成指定数量的随机数字
4. WHEN 用户输入非整数值 THEN Random_Generator SHALL 显示错误提示并阻止生成

### 需求 4

**用户故事:** 作为开发者，我希望能够生成文本的 MD5 哈希值，以便进行数据校验和加密相关工作。

#### 验收标准

1. WHEN 用户输入文本内容 THEN Random_Generator SHALL 计算并显示该文本的 MD5 哈希值
2. WHEN 用户选择大写输出选项 THEN Random_Generator SHALL 以大写形式显示 MD5 哈希值
3. WHEN 用户选择小写输出选项 THEN Random_Generator SHALL 以小写形式显示 MD5 哈希值
4. WHEN 用户输入空文本 THEN Random_Generator SHALL 计算空字符串的 MD5 哈希值（d41d8cd98f00b204e9800998ecf8427e）

### 需求 5

**用户故事:** 作为开发者，我希望能够生成雪花 ID，以便在分布式系统中使用唯一标识符。

#### 验收标准

1. WHEN 用户点击生成雪花 ID THEN Random_Generator SHALL 生成一个 64 位的雪花 ID 字符串
2. WHEN 用户指定生成数量（1-100）THEN Random_Generator SHALL 生成指定数量的雪花 ID
3. WHEN 用户生成雪花 ID THEN Random_Generator SHALL 确保同一毫秒内生成的 ID 具有递增的序列号
4. WHEN 用户查看雪花 ID THEN Random_Generator SHALL 显示该 ID 对应的时间戳信息

### 需求 5.1

**用户故事:** 作为开发者，我希望能够生成 NanoID，以便获得更短、URL 安全的唯一标识符。

#### 验收标准

1. WHEN 用户选择生成 NanoID THEN Random_Generator SHALL 生成默认 21 字符长度的 URL 安全字符串
2. WHEN 用户指定 NanoID 长度（1-64）THEN Random_Generator SHALL 生成指定长度的 NanoID
3. WHEN 用户指定生成数量（1-100）THEN Random_Generator SHALL 生成指定数量的 NanoID
4. WHEN 生成 NanoID THEN Random_Generator SHALL 仅使用 URL 安全字符（A-Za-z0-9_-）

### 需求 5.2

**用户故事:** 作为开发者，我希望能够生成 ULID，以便获得可按时间排序的唯一标识符。

#### 验收标准

1. WHEN 用户选择生成 ULID THEN Random_Generator SHALL 生成 26 字符的 Crockford Base32 编码字符串
2. WHEN 用户指定生成数量（1-100）THEN Random_Generator SHALL 生成指定数量的 ULID
3. WHEN 用户在同一毫秒内生成多个 ULID THEN Random_Generator SHALL 确保生成的 ULID 按字典序递增
4. WHEN 用户查看 ULID THEN Random_Generator SHALL 显示该 ID 对应的时间戳信息

### 需求 5.3

**用户故事:** 作为开发者，我希望能够生成 MongoDB ObjectId，以便在 MongoDB 相关开发中使用。

#### 验收标准

1. WHEN 用户选择生成 ObjectId THEN Random_Generator SHALL 生成 24 位十六进制字符的 ObjectId
2. WHEN 用户指定生成数量（1-100）THEN Random_Generator SHALL 生成指定数量的 ObjectId
3. WHEN 用户查看 ObjectId THEN Random_Generator SHALL 显示该 ID 对应的时间戳信息
4. WHEN 生成 ObjectId THEN Random_Generator SHALL 包含 4 字节时间戳、5 字节随机值和 3 字节递增计数器

### 需求 6

**用户故事:** 作为用户，我希望能够方便地复制生成的结果，以便快速使用这些数据。

#### 验收标准

1. WHEN 用户点击单个结果的复制按钮 THEN Random_Generator SHALL 将该结果复制到剪贴板并显示成功提示
2. WHEN 用户点击"复制全部"按钮 THEN Random_Generator SHALL 将所有结果以换行符分隔复制到剪贴板
3. WHEN 用户点击"清空"按钮 THEN Random_Generator SHALL 清除所有生成的结果

### 需求 7

**用户故事:** 作为用户，我希望工具界面支持中英文国际化，以便不同语言的用户都能方便使用。

#### 验收标准

1. WHEN 用户切换到中文语言 THEN Random_Generator SHALL 以中文显示所有界面文本
2. WHEN 用户切换到英文语言 THEN Random_Generator SHALL 以英文显示所有界面文本
3. WHEN 系统加载工具 THEN Random_Generator SHALL 根据用户的语言偏好自动显示对应语言

### 需求 8

**用户故事:** 作为用户，我希望工具界面遵循 Neo-Brutalism 设计风格，以便与应用整体风格保持一致。

#### 验收标准

1. WHEN 工具界面渲染 THEN Random_Generator SHALL 使用 2px 黑色边框和硬阴影效果
2. WHEN 用户悬停在按钮上 THEN Random_Generator SHALL 显示按下效果（位移和阴影变化）
3. WHEN 工具界面渲染 THEN Random_Generator SHALL 支持浅色和深色主题切换
