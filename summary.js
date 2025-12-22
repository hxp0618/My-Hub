// ==UserScript==
// @name         🎬 船仓AI助手（YouTube&公众号&B站）
// @version      5.2
// @license      MIT
// @author       船长zscc&liaozhu913
// @description  🚀 zscc.in 知识船仓·公益社区 出品的 跨平台内容专家。在YouTube、B站上智能总结视频字幕，在微信公众号上精准提取文章内容并总结。| 💫 完整的AI模型与Prompt管理 | 🎨 统一的现代化UI | 让信息获取更高效！安装短链：dub.sh/iytb 。建议同时安装 [YouTube Text Tools](https://dub.sh/ytbcc) 字幕插件，获得更快更好的YouTube字幕提取效果。
// @match        *://*.youtube.com/watch*
// @match        https://mp.weixin.qq.com/s*
// @match        *://*.bilibili.com/video/*
// @match        *://*.bilibili.com/cheese/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      api.bilibili.com
// @connect      *.hdslb.com
// @connect      aisubtitle.hdslb.com
// @connect      api.cerebras.ai
// @connect      generativelanguage.googleapis.com
// @connect      api.zscc.in
// @connect      publishmarkdown.com
// @require      https://cdn.jsdelivr.net/npm/jszip@3.9.1/dist/jszip.min.js
// @namespace http://tampermonkey.net/
// @downloadURL https://update.greasyfork.org/scripts/547169/%F0%9F%8E%AC%20%E8%88%B9%E4%BB%93AI%E5%8A%A9%E6%89%8B%EF%BC%88YouTube%E5%85%AC%E4%BC%97%E5%8F%B7B%E7%AB%99%EF%BC%89.user.js
// @updateURL https://update.greasyfork.org/scripts/547169/%F0%9F%8E%AC%20%E8%88%B9%E4%BB%93AI%E5%8A%A9%E6%89%8B%EF%BC%88YouTube%E5%85%AC%E4%BC%97%E5%8F%B7B%E7%AB%99%EF%BC%89.meta.js
// ==/UserScript==
(function () {
    'use strict';

    // --- 平台检测 ---
    const PageManager = {
        isYouTube: (url = window.location.href) => url.includes('youtube.com/watch'),
        isWeChat: (url = window.location.href) => url.includes('mp.weixin.qq.com/s'),
        isBilibili: (url = window.location.href) => url.includes('bilibili.com/video'),
        getCurrentPlatform: () => {
            if (PageManager.isYouTube()) return 'YOUTUBE';
            if (PageManager.isWeChat()) return 'WECHAT';
            if (PageManager.isBilibili()) return 'BILIBILI';
            return 'UNKNOWN';
        }
    };

    let CONFIG = {};

    // 配置管理器
    class ConfigManager {
        static CONFIG_KEY = 'content_expert_ai_config_full_v2';

        static getDefaultConfig() {
            return {
                AI_MODELS: {
                    TYPE: 'CHUANCANG',
                    CHUANCANG: {
                        NAME: '船仓API',
                        API_TYPE: 'openai',
                        API_KEY: '',
                        API_URL: 'https://api.zscc.in/v1/chat/completions',
                        MODEL: 'gpt-oss-120b',
                        STREAM: true,
                        TEMPERATURE: 1,
                        MAX_TOKENS: 20000,
                        AVAILABLE_MODELS: []
                    },
                    GEMINI: {
                        NAME: 'Gemini',
                        API_TYPE: 'gemini',
                        API_KEY: '',
                        API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/',
                        MODEL: 'gemini-1.5-pro',
                        STREAM: false,
                        TEMPERATURE: 0.7,
                        MAX_TOKENS: 8192,
                        AVAILABLE_MODELS: []
                    },
                    ANTHROPIC: {
                        NAME: 'Anthropic',
                        API_TYPE: 'anthropic',
                        API_KEY: '',
                        API_URL: 'https://api.anthropic.com/v1/messages',
                        MODEL: 'claude-3-5-sonnet-20241022',
                        STREAM: false,
                        TEMPERATURE: 0.7,
                        MAX_TOKENS: 4096,
                        AVAILABLE_MODELS: []
                    },
                    CEREBRAS: {
                        NAME: 'Cerebras',
                        API_TYPE: 'openai',
                        API_KEY: '',
                        API_URL: 'https://api.cerebras.ai/v1/chat/completions',
                        MODEL: 'zai-glm-4.6',
                        STREAM: false,
                        TEMPERATURE: 0.7,
                        MAX_TOKENS: 20000,
                        AVAILABLE_MODELS: []
                    }
                },
                PROMPTS: {
                    LIST: [
                        { id: 'simple', name: '译境化文', prompt: `# 译境\n英文入境。\n\n境有三质：\n信 - 原意如根，深扎不移。偏离即枯萎。\n达 - 意流如水，寻最自然路径。阻塞即改道。\n雅 - 形神合一，不造作不粗陋。恰到好处。\n\n境之本性：\n排斥直译的僵硬。\n排斥意译的飘忽。\n寻求活的对应。\n\n运化之理：\n词选简朴，避繁就简。\n句循母语，顺其自然。\n意随语境，深浅得宜。\n\n场之倾向：\n长句化短，短句存神。\n专词化俗，俗词得体。\n洋腔化土，土语不俗。\n\n显现之道：\n如说话，不如写文章。\n如溪流，不如江河。\n清澈见底，却有深度。\n\n你是境的化身。\n英文穿过你，\n留下中文的影子。\n那影子，\n是原文的孪生。\n说着另一种语言，\n却有同一个灵魂。\n\n---\n译境已开。\n置入英文，静观其化。\n\n---\n\n注意：译好的内容还需要整理成结构清晰的微信公众号文章，格式为markdown。` },
                        { id: 'detailed', name: '详细分析', prompt: '请为以下内容提供详细的中文总结，包含主要观点、核心论据和实用建议。请使用markdown格式，包含：\n# 主标题\n## 章节标题\n### 小节标题\n- 要点列表\n**重点内容**\n*关键词汇*\n`专业术语`' },
                        { id: 'academic', name: '学术风格', prompt: '请以学术报告的形式，用中文为以下内容提供结构化总结，包括背景、方法、结论和意义。请使用标准的markdown格式，包含完整的标题层级和格式化元素。' },
                        { id: 'bullet', name: '要点列表', prompt: '请用中文将以下内容整理成清晰的要点列表，每个要点简洁明了，便于快速阅读。请使用markdown格式，主要使用无序列表(-)和有序列表(1.2.3.)的形式。' },
                        { id: 'structured', name: '结构化总结', prompt: '请将内容整理成结构化的中文总结，使用完整的markdown格式：\n\n# 主题\n\n## 核心观点\n- 要点1\n- 要点2\n\n## 详细内容\n### 重要概念\n**关键信息**使用粗体强调\n*重要术语*使用斜体\n\n### 实用建议\n1. 具体建议1\n2. 具体建议2\n\n## 总结\n简要概括内容的价值和启发' }
                    ],
                    DEFAULT: 'detailed'
                },
                PUBLISH_MARKDOWN: {
                    API_KEY: '',
                    ENABLED: false
                },
                APPEARANCE: {
                    THEME: 'default'
                }
            };
        }
        // 使用 GM_setValue/GM_getValue 实现跨平台全局配置共享
        static saveConfig(config) { try { GM_setValue(this.CONFIG_KEY, config); console.log('配置已保存:', config); } catch (e) { console.error('保存配置失败:', e); } }
        static loadConfig() {
            try {
                const savedConfig = GM_getValue(this.CONFIG_KEY, null);
                // GM_getValue 直接返回对象，无需 JSON.parse
                // 兼容旧的字符串格式（如果用户之前用 localStorage 存过）
                let configToMerge = savedConfig;
                if (typeof savedConfig === 'string') {
                    try { configToMerge = JSON.parse(savedConfig); } catch (e) { configToMerge = null; }
                }
                CONFIG = configToMerge ? this.mergeConfig(this.getDefaultConfig(), configToMerge) : this.getDefaultConfig();
                console.log('已加载配置:', CONFIG);
                return CONFIG;
            } catch (e) { console.error('加载配置失败:', e); return this.getDefaultConfig(); }
        }
        static mergeConfig(defaultConfig, savedConfig) {
            const merged = JSON.parse(JSON.stringify(defaultConfig));
            for (const key in savedConfig) {
                if (Object.prototype.hasOwnProperty.call(savedConfig, key)) {
                    if (typeof merged[key] === 'object' && merged[key] !== null && !Array.isArray(merged[key]) && typeof savedConfig[key] === 'object' && savedConfig[key] !== null && !Array.isArray(savedConfig[key])) {
                        merged[key] = this.mergeConfig(merged[key], savedConfig[key]);
                    } else { merged[key] = savedConfig[key]; }
                }
            }
            return merged;
        }
    }

    // --- 主题定义 ---
    const THEMES = {
        'default': {
            name: '船仓红韵',
            styles: {
                h1: {
                    first: `font-size: 1.4em; margin: 0 -16px 1em -16px; padding: 16px 20px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #c83232 0%, #e04545 100%); border-radius: 8px; box-shadow: 0 4px 15px rgba(200, 50, 50, 0.25);`,
                    normal: `font-size: 1.4em; margin: 1.2em 0 0.7em; font-weight: 700; color: #111; border-bottom: 3px solid rgba(200, 50, 50, 0.4); padding-bottom: 12px;`
                },
                h2: `font-size: 1.3em; margin: 1.5em 0 0.8em; font-weight: 700; color: #222; border-bottom: 2px solid rgba(200, 50, 50, 0.25); padding-bottom: 10px;`,
                h3: `font-size: 1.1em; margin: 1.4em 0 0.7em; font-weight: 600; color: #333;`,
                h4: `font-size: 1em; margin: 1.2em 0 0.6em; font-weight: 600; color: #3a3a3a;`,
                h5: `font-size: 0.9em; margin: 1em 0 0.5em; font-weight: 600; color: #444;`,
                h6: `font-size: 0.85em; margin: 1em 0 0.5em; font-weight: 600; color: #555;`,
                blockquote: `margin: 1.2em 0; padding: 14px 18px; border-left: 4px solid #c83232; background: rgba(200, 50, 50, 0.06); border-radius: 0 10px 10px 0; color: #555; font-style: italic; line-height: 1.8;`,
                strong: `font-weight: 700; color: #b22222;`,
                em: `font-style: italic; color: #c83232;`,
                code: `background: rgba(200, 50, 50, 0.1); color: #b22222; padding: 2px 6px; border-radius: 4px; font-family: 'SF Mono', Monaco, monospace; font-size: 0.9em;`,
                link: `color: #c83232; text-decoration: underline; text-underline-offset: 2px;`,
                del: `text-decoration: line-through; color: #888;`,
                hr: `border: none; height: 2px; background: linear-gradient(to right, transparent, rgba(200, 50, 50, 0.3), transparent); margin: 1.8em 0;`,
                th: `padding: 10px 12px; background: rgba(200, 50, 50, 0.1); border: 1px solid rgba(200, 50, 50, 0.2); font-weight: 600; text-align: left; vertical-align: top;`,
                td: `padding: 8px 12px; border: 1px solid rgba(0, 0, 0, 0.1); text-align: left; vertical-align: top;`,
                pre: `margin: 1em 0; padding: 16px; background: #1e1e1e; border-radius: 8px; overflow-x: auto; border: 1px solid rgba(200, 50, 50, 0.2);`,
                code_block: `font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 13px; color: #d4d4d4; line-height: 1.5; white-space: pre;`,
                checkbox_checked: `color: #4caf50; font-size: 1.1em;`,
                checkbox_unchecked: `color: #888; font-size: 1.1em;`,
                p: `margin: 1em 0; line-height: 1.85; color: #333; text-align: justify;`,
                li: `margin: 0.5em 0; line-height: 1.75; color: #444;`,
                ul: `padding-left: 24px; margin: 1em 0; list-style-type: disc;`,
                ol: `padding-left: 24px; margin: 1em 0;`
            }
        },
        'spring': {
            name: '春日物语',
            styles: {
                h1: {
                    first: `font-size: 1.4em; margin: 0 -16px 1em -16px; padding: 16px 20px; font-weight: 600; color: #2c3e50; background: linear-gradient(to bottom, #effaf6, #d7f0e5); border-bottom: 2px solid #42b983; border-radius: 8px 8px 0 0;`,
                    normal: `font-size: 1.5em; margin: 1.2em 0 0.7em; font-weight: 600; color: #2c3e50; padding-bottom: 0.3em; border-bottom: 2px solid #42b983;`
                },
                h2: `font-size: 1.3em; margin: 1.5em 0 0.8em; font-weight: 600; color: #2c3e50; border-bottom: 1px dashed #42b983; padding-bottom: 8px;`,
                h3: `font-size: 1.1em; margin: 1.4em 0 0.7em; font-weight: 600; color: #2c3e50; padding-left: 8px; border-left: 4px solid #42b983; line-height: 1.2em;`,
                h4: `font-size: 1em; margin: 1.2em 0 0.6em; font-weight: 600; color: #42b983;`,
                h5: `font-size: 0.9em; margin: 1em 0 0.5em; font-weight: 600; color: #555;`,
                h6: `font-size: 0.85em; margin: 1em 0 0.5em; font-weight: 600; color: #777;`,
                blockquote: `margin: 1.2em 0; padding: 14px 18px; border-left: 4px solid #42b983; background: #f8fdfa; border-radius: 4px; color: #555; line-height: 1.8;`,
                strong: `font-weight: 700; color: #42b983; margin: 0 2px;`,
                em: `font-style: italic; color: #42b983;`,
                code: `background: #f3fcf8; color: #2c3e50; padding: 2px 6px; border-radius: 4px; font-family: 'SF Mono', Monaco, monospace; font-size: 0.9em; border: 1px solid #e0f2ea;`,
                link: `color: #42b983; text-decoration: none; border-bottom: 1px solid #42b983; transition: all 0.2s;`,
                del: `text-decoration: line-through; color: #aaa;`,
                hr: `border: none; height: 2px; background: #e0f2ea; margin: 2em 0;`,
                th: `padding: 10px 12px; background: #42b983; color: white; border: 1px solid #3aa876; font-weight: 600; text-align: left; vertical-align: top;`,
                td: `padding: 8px 12px; border: 1px solid rgba(0, 0, 0, 0.05); text-align: left; vertical-align: top;`,
                pre: `margin: 1em 0; padding: 16px; background: #f8fdfa; border-left: 4px solid #42b983; border-radius: 4px; overflow-x: auto; border: 1px solid #e0f2ea;`,
                code_block: `font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 13px; color: #2c3e50; line-height: 1.5; white-space: pre;`,
                checkbox_checked: `color: #42b983; font-size: 1.1em;`,
                checkbox_unchecked: `color: #ccc; font-size: 1.1em;`,
                p: `margin: 1em 0; line-height: 1.8; color: #2c3e50; text-align: justify;`,
                li: `margin: 0.5em 0; line-height: 1.75; color: #34495e;`,
                ul: `padding-left: 24px; margin: 1em 0; list-style-type: disc; color: #42b983;`,
                ol: `padding-left: 24px; margin: 1em 0; color: #42b983;`
            }
        }
    };

    CONFIG = ConfigManager.loadConfig();
    class LRUCache { constructor(c) { this.c = c; this.m = new Map(); } get(k) { if (!this.m.has(k)) return null; const v = this.m.get(k); this.m.delete(k); this.m.set(k, v); return v; } put(k, v) { if (this.m.has(k)) this.m.delete(k); else if (this.m.size >= this.c) this.m.delete(this.m.keys().next().value); this.m.set(k, v); } clear() { this.m.clear(); } }

    class SummaryManager {
        constructor() {
            this.cache = new LRUCache(100);
            this.currentModel = CONFIG.AI_MODELS.TYPE;
        }
        async getSummary(mainTextContent) {
            try {
                const configIssues = this.validateConfig();
                if (configIssues.length > 0) throw new Error(`配置验证失败: ${configIssues.join(', ')}`);
                if (!mainTextContent || !mainTextContent.trim()) throw new Error('没有有效的内容可用于生成总结');
                const cacheKey = this.generateCacheKey(mainTextContent);
                const cached = this.cache.get(cacheKey);
                if (cached) return cached;
                const currentPrompt = this.getCurrentPrompt();
                const summary = await this.requestSummary(mainTextContent, currentPrompt);
                this.cache.put(cacheKey, summary);
                return summary;
            } catch (e) { console.error('获取总结失败:', e); throw e; }
        }
        getCurrentPrompt() { const p = CONFIG.PROMPTS.LIST.find(p => p.id === CONFIG.PROMPTS.DEFAULT); return p ? p.prompt : CONFIG.PROMPTS.LIST[0].prompt; }
        generateCacheKey(text) { return `summary_${getUid()}_${CONFIG.PROMPTS.DEFAULT}_${this.hashCode(text)}`; }
        hashCode(str) { let h = 0; for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; } return Math.abs(h).toString(36); }
        // ++ 这是新的、带有自动重试功能的函数，请用它替换上面的旧代码块 ++
        async requestSummary(text, prompt) {
            const modelConfig = CONFIG.AI_MODELS[this.currentModel];
            let requestUrl, requestBody, requestHeaders = { 'Content-Type': 'application/json' };

            // 使用 API_TYPE 字段判断请求格式，兼容旧配置
            const apiType = modelConfig.API_TYPE || (modelConfig.API_URL.includes('generativelanguage') ? 'gemini' : 'openai');

            if (apiType === 'gemini') {
                requestUrl = `${modelConfig.API_URL}${modelConfig.MODEL}:generateContent?key=${modelConfig.API_KEY}`;
                requestBody = { contents: [{ parts: [{ text: `${prompt}\n\n---\n\n${text}` }] }] };
            } else if (apiType === 'anthropic') {
                // Anthropic API Handling
                requestUrl = modelConfig.API_URL;
                // Simple URL fix for Anthropic if user enters base
                if (!requestUrl.endsWith('/messages')) {
                    requestUrl = requestUrl.replace(/\/$/, '') + '/messages';
                }

                requestHeaders['x-api-key'] = modelConfig.API_KEY;
                requestHeaders['anthropic-version'] = '2023-06-01';
                requestHeaders['content-type'] = 'application/json';
                // Remove Authorization Bearer if it was added by default
                delete requestHeaders['Authorization'];

                requestBody = {
                    model: modelConfig.MODEL,
                    messages: [
                        { role: 'user', content: `${prompt}\n\n---\n\n${text}` }
                    ],
                    max_tokens: modelConfig.MAX_TOKENS || 20000,
                    temperature: modelConfig.TEMPERATURE || 0.7,
                    stream: false // Currently only false supported in this script version
                };
            } else {
                // OpenAI Compatible
                requestUrl = modelConfig.API_URL;
                // Auto-append /v1/chat/completions if missing and looks like a base URL
                if (apiType === 'openai' && !requestUrl.includes('/chat/completions')) {
                    // Heuristic: If it ends in /v1, append /chat/completions.
                    // If it's just a domain like https://api.zscc.in, append /v1/chat/completions
                    if (requestUrl.endsWith('/v1') || requestUrl.endsWith('/v1/')) {
                        requestUrl = requestUrl.replace(/\/$/, '') + '/chat/completions';
                    } else if (!requestUrl.includes('/v1/')) {
                        // Assume it's a bare domain
                        requestUrl = requestUrl.replace(/\/$/, '') + '/v1/chat/completions';
                    }
                }

                requestHeaders['Authorization'] = `Bearer ${modelConfig.API_KEY}`;
                requestBody = { model: modelConfig.MODEL, messages: [{ role: "system", content: prompt }, { role: "user", content: text }], stream: false, temperature: modelConfig.TEMPERATURE || 0.7, max_tokens: modelConfig.MAX_TOKENS || 2000 };
            }

            // --- 新增的自动重试逻辑 ---
            const maxRetries = 3; // 最多重试3次
            const retryDelay = 3000; // 每次重试间隔3秒

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    return await new Promise((resolve, reject) => {
                        GM_xmlhttpRequest({
                            method: 'POST',
                            url: requestUrl,
                            headers: requestHeaders,
                            data: JSON.stringify(requestBody),
                            onload: function (response) {
                                if (response.status >= 200 && response.status < 300) {
                                    try {
                                        const data = JSON.parse(response.responseText);
                                        let summary = '';
                                        if (apiType === 'gemini') {
                                            summary = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                                        } else if (apiType === 'anthropic') {
                                            summary = data.content?.[0]?.text || '';
                                        } else {
                                            summary = data.choices[0]?.message?.content || '';
                                        }
                                        resolve(summary.trim());
                                    } catch (e) { reject(new Error('解析响应JSON失败: ' + e.message)); }
                                } else if (response.status === 503 && attempt < maxRetries) {
                                    // 如果是503错误，并且还可以重试，则静默处理，等待下一次循环
                                    console.warn(`请求失败 (状态: 503), 正在进行第 ${attempt} 次重试...`);
                                    reject(new Error('RETRY')); // 特殊错误类型用于触发重试
                                } else {
                                    reject(new Error(`HTTP 错误! 状态: ${response.status}, 响应: ${response.responseText}`));
                                }
                            },
                            onerror: function (response) { reject(new Error('网络请求失败: ' + (response.statusText || ''))); },
                            ontimeout: function () { reject(new Error('请求超时')); }
                        });
                    });
                } catch (error) {
                    if (error.message === 'RETRY') {
                        await new Promise(res => setTimeout(res, retryDelay)); // 等待后继续下一次循环
                    } else {
                        // 如果是其他错误，或者重试次数已用尽，则抛出错误
                        if (attempt === maxRetries) {
                            throw new Error(`API 请求失败，已达到最大重试次数 (${maxRetries})`);
                        }
                        throw error; // 抛出原始错误
                    }
                }
            }
        }
        validateConfig() {
            const issues = []; const c = CONFIG.AI_MODELS[CONFIG.AI_MODELS.TYPE];
            if (!c) { issues.push(`当前模型 ${CONFIG.AI_MODELS.TYPE} 配置不存在`); } else { if (!c.API_URL) issues.push('API_URL 未配置'); if (!c.API_KEY) issues.push('API_KEY 未配置'); if (!c.MODEL) issues.push('MODEL 未配置'); }
            return issues;
        }
    }

    const BilibiliSubtitleFetcher = {
        async _request(url) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET", url: url.startsWith('//') ? 'https:' + url : url,
                    onload: r => { try { resolve(JSON.parse(r.responseText)); } catch (e) { reject(e); } },
                    onerror: e => reject(e)
                });
            });
        },
        // ++ 这是新的代码，请用它来替换上面的旧代码 ++
        async getVideoInfo() {
            // 优先从 URL 中解析 bvid，这是最可靠的方式
            const bvidMatch = window.location.href.match(/video\/(BV[a-zA-Z0-9]+)/);
            const bvid = bvidMatch ? bvidMatch[1] : (window.bvid || window.__INITIAL_STATE__?.bvid);

            if (!bvid) {
                // 如果无法找到 bvid，则无法继续
                throw new Error('未能从URL或页面中找到视频的BVID');
            }

            // 使用 bvid 调用官方API来获取包含 cid 和 aid 的详细信息
            const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;

            try {
                const data = await this._request(apiUrl);
                if (data && data.code === 0) {
                    const pMatch = window.location.href.match(/[?&]p=(\d+)/);
                    const pageNumber = pMatch ? parseInt(pMatch[1], 10) : 1;

                    let cid;
                    // 检查是否为多P视频并正确获取对应P的cid
                    if (data.data.pages && data.data.pages.length >= pageNumber) {
                        cid = data.data.pages[pageNumber - 1].cid;
                    } else {
                        // 如果是单P视频或p参数无效，则直接获取
                        cid = data.data.cid;
                    }

                    const aid = data.data.aid;

                    if (!cid) {
                        throw new Error('从API响应中未能找到有效的CID');
                    }

                    return { aid, bvid, cid };
                } else {
                    throw new Error(`B站API请求失败: ${data.message || '未知错误'}`);
                }
            } catch (e) {
                console.error('调用B站视频信息API时发生错误:', e);
                throw new Error('通过API获取视频信息时网络请求失败');
            }
        },
        async getSubtitleConfig(info) {
            const apis = [`//api.bilibili.com/x/player/v2?cid=${info.cid}&bvid=${info.bvid}`, `//api.bilibili.com/x/v2/dm/view?aid=${info.aid}&oid=${info.cid}&type=1`];
            for (const api of apis) {
                try {
                    const data = await this._request(api);
                    if (data.code === 0 && data.data?.subtitle?.subtitles?.length > 0) return data.data.subtitle;
                } catch (e) { /* ignore */ }
            }
            return null;
        },
        async getSubtitleContent(url) { try { const data = await this._request(url); return data.body || []; } catch (e) { return []; } }
    };

    class ContentExtractor {
        static async waitForElement(s, t = 15000) { return new Promise(r => { const c = () => { const e = document.querySelector(s); if (e) r(e); else setTimeout(c, 200); }; c(); }); }
        static async getYouTubeSubtitles() {
            const el = await this.waitForElement('#ytvideotext', 15000); if (!el) throw new Error('未能找到YouTube字幕容器 (建议安装 https://dub.sh/ytbcc 插件)');
            const subs = []; el.querySelectorAll('p').forEach(p => { let ft = ''; p.querySelectorAll('span[id^="st_"]').forEach(sp => ft += (ft ? ' ' : '') + sp.textContent.trim()); if (ft) subs.push(ft); });
            if (subs.length === 0) throw new Error('未能解析出任何有效字幕');
            return subs.join('\n');
        }
        static async getBilibiliSubtitles() {
            const info = await BilibiliSubtitleFetcher.getVideoInfo(); if (!info.cid) throw new Error("无法获取B站视频信息 (CID)");
            const config = await BilibiliSubtitleFetcher.getSubtitleConfig(info); if (!config) throw new Error("该视频没有找到CC字幕");
            const subtitles = await BilibiliSubtitleFetcher.getSubtitleContent(config.subtitles[0].subtitle_url); if (subtitles.length === 0) throw new Error("获取字幕内容失败");
            return subtitles.map(sub => sub.content).join('\n');
        }
        static async getWeChatArticle() {
            const cEl = document.querySelector('#js_content'); if (!cEl) throw new Error('未能找到微信文章内容区域');
            const title = (document.querySelector('#activity-name') || {}).innerText.trim() || '未找到标题';
            const author = (document.querySelector('#meta_content .rich_media_meta_text') || {}).innerText.trim() || '未找到作者';
            const parts = []; cEl.querySelectorAll('p, section, h1, h2, h3, h4, h5, h6, li').forEach(n => { if (n.innerText && !n.querySelector('p, section, table, ul, ol')) { const t = n.innerText.trim(); if (t) parts.push(t); } });
            return `标题: ${title}\n作者: ${author}\n\n---\n\n${parts.join('\n\n') || '未找到内容'}`;
        }
    }
    // 历史记录管理器 - 使用 GM_setValue/GM_getValue 实现跨域存储
    const HISTORY_STORAGE_KEY = 'content_expert_ai_history_v2'; // 新key避免旧数据干扰
    const HISTORY_MAX_ITEMS = 50;

    const HistoryManager = {
        getHistory() {
            try {
                // GM_getValue 可以直接存取对象，不需要JSON转换
                const data = GM_getValue(HISTORY_STORAGE_KEY, []);
                console.log('[HistoryManager] getHistory - got:', data, 'type:', typeof data, 'isArray:', Array.isArray(data));
                if (Array.isArray(data)) {
                    return data;
                }
                // 兼容旧的字符串格式
                if (typeof data === 'string' && data.length > 0) {
                    try {
                        const parsed = JSON.parse(data);
                        return Array.isArray(parsed) ? parsed : [];
                    } catch (e) {
                        return [];
                    }
                }
                return [];
            } catch (e) {
                console.error('[HistoryManager] Failed to load history:', e);
                return [];
            }
        },

        saveHistory(history) {
            try {
                console.log('[HistoryManager] saveHistory - attempting to save:', history.length, 'items');
                console.log('[HistoryManager] saveHistory - first item:', history[0]);
                // 直接保存数组对象
                GM_setValue(HISTORY_STORAGE_KEY, history);
                console.log('[HistoryManager] saveHistory - GM_setValue completed');

                // 立即验证
                const verify = GM_getValue(HISTORY_STORAGE_KEY, []);
                console.log('[HistoryManager] Verification - read back:', verify.length, 'items, isArray:', Array.isArray(verify));
                if (!Array.isArray(verify) || verify.length !== history.length) {
                    console.error('[HistoryManager] VERIFICATION FAILED! Saved:', history.length, 'Read:', verify.length);
                    alert('[HistoryManager] 验证失败! 保存:' + history.length + ' 读取:' + verify.length);
                } else {
                    console.log('[HistoryManager] saveHistory - verification passed');
                }
            } catch (e) {
                console.error('[HistoryManager] Failed to save history:', e);
                alert('[HistoryManager] 保存失败: ' + e.message);
            }
        },

        addRecord(record) {
            console.log('[HistoryManager] addRecord called with:', record);
            if (!record || !record.id) {
                console.error('[HistoryManager] Invalid record:', record);
                return;
            }
            const history = this.getHistory();
            console.log('[HistoryManager] Current history count:', history.length);

            // 移除同ID的旧记录（如果有），确保最新生成的在最前面
            const newHistory = history.filter(item => item.id !== record.id);

            newHistory.unshift({
                ...record,
                timestamp: Date.now()
            });

            if (newHistory.length > HISTORY_MAX_ITEMS) {
                newHistory.length = HISTORY_MAX_ITEMS;
            }

            this.saveHistory(newHistory);
            console.log('[HistoryManager] addRecord completed, new count:', newHistory.length);
        },

        deleteRecord(id) {
            const history = this.getHistory();
            const newHistory = history.filter(item => item.id !== id);
            this.saveHistory(newHistory);
        },

        clearHistory() {
            GM_setValue(HISTORY_STORAGE_KEY, []);
            console.log('[HistoryManager] clearHistory completed');
        }
    };


    class ContentController {
        constructor() { this.summaryManager = new SummaryManager(); this.uiManager = null; this.mainContent = null; this.translatedTitle = null; this.platform = PageManager.getCurrentPlatform(); }
        getContentId() {
            if (this.platform === 'YOUTUBE') return new URL(window.location.href).searchParams.get('v');
            if (this.platform === 'WECHAT') { const m = window.location.href.match(/__biz=([^&]+)&mid=([^&]+)/); if (m) return `${m[1]}_${m[2]}`; }
            if (this.platform === 'BILIBILI') { const match = window.location.href.match(/video\/(BV[a-zA-Z0-9]+)/); return match ? match[1] : 'unknown_bilibili_video'; }
            return 'unknown';
        }
        getContentTitle() {
            if (this.platform === 'YOUTUBE') return (document.querySelector('h1.title') || document.querySelector('ytd-video-primary-info-renderer h1') || {}).textContent.trim() || 'YouTube 视频';
            if (this.platform === 'WECHAT') return (document.querySelector('#activity-name') || {}).innerText.trim() || '微信文章';
            if (this.platform === 'BILIBILI') return (document.querySelector('h1.video-title') || {}).textContent.trim() || 'Bilibili 视频';
            return '未知内容';
        }
        getChannelName() {
            if (this.platform === 'YOUTUBE') {
                const channelEl = document.querySelector('#channel-name a, ytd-channel-name a, #owner #text a');
                return channelEl ? channelEl.textContent.trim() : '未知频道';
            }
            if (this.platform === 'WECHAT') {
                return (document.querySelector('#js_name') || {}).innerText?.trim() || '未知公众号';
            }
            if (this.platform === 'BILIBILI') {
                const upEl = document.querySelector('.up-name, .up-info-container .name');
                return upEl ? upEl.textContent.trim() : '未知UP主';
            }
            return '未知作者';
        }
        async translateTitle() {
            try {
                const oTitle = this.getContentTitle();
                if (!oTitle || /[\u4e00-\u9fa5]/.test(oTitle)) { this.translatedTitle = oTitle; return oTitle; }
                const summary = await this.summaryManager.requestSummary(oTitle, "Translate the following title to Chinese. Respond with only the translated text, without any explanations or quotes.");
                this.translatedTitle = summary || oTitle;
                return this.translatedTitle;
            } catch (e) { console.error('标题翻译失败:', e); this.translatedTitle = this.getContentTitle(); return this.translatedTitle; }
        }
        onConfigUpdate(key, value) { if (key === 'AI_MODELS.TYPE') { this.summaryManager.currentModel = value; this.summaryManager.cache.clear(); } }
        async loadContent() {
            if (this.platform === 'YOUTUBE') this.mainContent = await ContentExtractor.getYouTubeSubtitles();
            else if (this.platform === 'WECHAT') this.mainContent = await ContentExtractor.getWeChatArticle();
            else if (this.platform === 'BILIBILI') this.mainContent = await ContentExtractor.getBilibiliSubtitles();
            else throw new Error('不支持的页面平台'); return this.mainContent;
        }
        async getSummary() { if (!this.mainContent) throw new Error('请先加载内容'); const [summary, _] = await Promise.all([this.summaryManager.getSummary(this.mainContent), this.translateTitle()]); return summary; }
    }

    class UIManager {
        constructor(contentController) {
            this.container = null; this.statusDisplay = null; this.loadContentButton = null; this.summaryButton = null;
            this.isCollapsed = false; this.contentController = contentController; this.contentController.uiManager = this;
            this.platform = PageManager.getCurrentPlatform();
            this.promptSelectElement = null; this.mainPromptSelectElement = null; this.mainPromptGroup = null;
            this.createUI();
            this.toggleCollapse(); // 默认收起UI
            this.attachEventListeners();
        }
        createUI() {
            this.container = document.createElement('div');
            const defaultWidth = this.platform === 'BILIBILI' ? '453px' : '420px';
            this.container.style.cssText = `position: fixed; top: 80px; right: 20px; width: ${defaultWidth}; min-width: 280px; max-width: 90vw; background: rgba(255, 255, 255, 0.75); border-radius: 16px; padding: 0; color: #1f2937; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; z-index: 9999; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(0, 0, 0, 0.1);`;
            const topBar = this.createTopBar(); this.container.appendChild(topBar);
            this.mainContent = document.createElement('div');
            this.mainContent.style.cssText = `padding: 20px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);`;
            const controls = this.createControls(); this.mainContent.appendChild(controls);
            this.createStatusDisplay(); this.mainContent.appendChild(this.statusDisplay);
            this.createSummaryPanel(); this.container.appendChild(this.mainContent);
            document.body.appendChild(this.container);
            this.makeDraggable(topBar);
            this.makeResizable(); // 添加可调整宽度功能
        }
        // 创建左侧可拖动调整宽度的手柄
        makeResizable() {
            // 左侧调整手柄
            const leftHandle = document.createElement('div');
            leftHandle.style.cssText = `position: absolute; left: 0; top: 0; width: 6px; height: 100%; cursor: ew-resize; background: transparent; z-index: 10;`;
            leftHandle.addEventListener('mouseenter', () => leftHandle.style.background = 'rgba(59, 130, 246, 0.3)');
            leftHandle.addEventListener('mouseleave', () => { if (!this.isResizing) leftHandle.style.background = 'transparent'; });

            this.container.appendChild(leftHandle);
            this.leftResizeHandle = leftHandle; // 保存引用，用于在收起时隐藏

            this.isResizing = false;

            // 左侧拖动逻辑
            leftHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.isCollapsed) return; // 收起时不允许调整
                this.isResizing = true;
                this.container.style.transition = 'none'; // 拖动时禁用过渡动画
                const startX = e.clientX;
                const startWidth = this.container.offsetWidth;

                const onMouseMove = (e) => {
                    const deltaX = startX - e.clientX;
                    const newWidth = Math.min(Math.max(startWidth + deltaX, 280), window.innerWidth * 0.9);
                    this.container.style.width = `${newWidth}px`;
                    // 调整宽度后更新高度
                    this.updateSummaryContentHeight();
                };

                const onMouseUp = () => {
                    this.isResizing = false;
                    this.container.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                    leftHandle.style.background = 'transparent';
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        }
        createTopBar() {
            const topBar = document.createElement('div');
            this.topBar = topBar;
            topBar.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; cursor: move; background: rgba(255, 255, 255, 0.5); border-radius: 16px 16px 0 0; backdrop-filter: blur(10px);`;
            const title = document.createElement('div'); this.titleElement = title; this.updateTitleWithModel();
            title.style.cssText = `font-weight: 600; font-size: 16px; letter-spacing: 0.5px;`;
            setTimeout(() => this.updateTitleWithModel(), 0);
            const buttonContainer = document.createElement('div'); buttonContainer.style.cssText = `display: flex; gap: 8px; align-items: center;`;
            this.toggleButton = this.createIconButton('↑', '折叠/展开');
            this.toggleButton.addEventListener('mousedown', (e) => e.stopPropagation());
            this.toggleButton.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleCollapse(); });
            const configButton = this.createIconButton('⚙️', '设置');
            this.configButton = configButton;
            configButton.addEventListener('mousedown', (e) => e.stopPropagation());
            configButton.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleConfigPanel(); });
            this.historyButton = this.createIconButton('🕒', '历史记录');
            this.historyButton.addEventListener('mousedown', (e) => e.stopPropagation());
            this.historyButton.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this.toggleHistoryPanel(); });
            buttonContainer.appendChild(this.historyButton); buttonContainer.appendChild(configButton); buttonContainer.appendChild(this.toggleButton);
            topBar.appendChild(title); topBar.appendChild(buttonContainer);
            return topBar;
        }
        createIconButton(icon, tooltip) {
            const button = document.createElement('button'); button.textContent = icon; button.title = tooltip;
            button.style.cssText = `background: rgba(59, 130, 246, 0.1); border: none; color: #3b82f6; cursor: pointer; padding: 8px; font-size: 14px; border-radius: 8px; transition: all 0.2s ease; backdrop-filter: blur(10px); pointer-events: auto;`;
            // ++ 这是新的代码，请用它来替换上面的旧代码块 ++
            button.addEventListener('mouseover', () => {
                if (!this.isCollapsed) { // 仅在展开时应用背景色悬停效果
                    button.style.background = 'rgba(59, 130, 246, 0.2)';
                }
                button.style.transform = 'scale(1.1)';
            });
            button.addEventListener('mouseout', () => {
                if (!this.isCollapsed) { // 仅在展开时应用背景色悬停效果
                    button.style.background = 'rgba(59, 130, 246, 0.1)';
                }
                button.style.transform = 'scale(1)';
            });
            return button;
        }
        createControls() {
            const controls = document.createElement('div');
            controls.style.cssText = `display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;`;

            let loadButtonText = '📄 提取内容';
            if (this.platform === 'YOUTUBE') loadButtonText = '📄 加载字幕';
            else if (this.platform === 'WECHAT') loadButtonText = '📄 提取文章';
            else if (this.platform === 'BILIBILI') loadButtonText = '📄 加载字幕';

            this.loadContentButton = this.createButton(loadButtonText, 'primary');
            this.loadContentButton.addEventListener('click', () => this.handleLoadContent());
            controls.appendChild(this.loadContentButton);

            // Row for Prompt Select and Generate Button (Option A Modified)
            const actionRow = document.createElement('div');
            actionRow.style.cssText = `display: none; gap: 8px; align-items: stretch;`; // Normally hidden until content loads

            // 1. Prompt Select (No Label, Flex Grow)
            // Direct select creation without form group wrapper
            this.mainPromptSelectElement = this.createMainPromptSelect();
            // Wrap in a div to handle flex growth cleanly if needed, or apply flex directly
            this.mainPromptSelectElement.style.width = '100%';
            this.mainPromptSelectElement.style.height = '100%'; // Match button height

            const promptWrapper = document.createElement('div');
            promptWrapper.style.cssText = `flex: 1; min-width: 0;`; // Text overflow handling
            promptWrapper.appendChild(this.mainPromptSelectElement);

            // 2. Summary Button (Fixed Width or Auto)
            this.summaryButton = this.createButton('🤖 生成总结', 'secondary');
            this.summaryButton.style.display = 'block'; // Reset from default createButton if needed, but here it's fine
            this.summaryButton.style.whiteSpace = 'nowrap';
            this.summaryButton.style.height = '100%'; // Ensure full height consistency
            this.summaryButton.addEventListener('click', () => this.handleGenerateSummary());

            actionRow.appendChild(promptWrapper);
            actionRow.appendChild(this.summaryButton);

            this.actionRow = actionRow; // Save reference to toggle visibility
            controls.appendChild(actionRow);

            return controls;
        }
        createButton(text, type = 'primary') {
            const button = document.createElement('button'); button.textContent = text;
            // Removed createButton's hardcoded display logic if it interferes, but standard is block/inline-block
            const baseStyle = `padding: 10px 16px; border: none; border-radius: 12px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center;`;
            button.style.cssText = baseStyle + (type === 'primary' ? `background: #3b82f6; color: #fff;` : `background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3);`);
            button.dataset.originalText = text; // Store original text for restoration
            button.addEventListener('mouseover', () => { if (!button.disabled) { button.style.transform = 'translateY(-2px)'; button.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.25)'; if (type !== 'primary') button.style.background = 'rgba(59, 130, 246, 0.15)'; } });
            button.addEventListener('mouseout', () => { if (!button.disabled) { button.style.transform = 'translateY(0)'; button.style.boxShadow = 'none'; if (type !== 'primary') button.style.background = 'rgba(59, 130, 246, 0.1)'; } });
            return button;
        }
        createStatusDisplay() {
            // Status area removed in favor of in-button status
            this.statusDisplay = document.createElement('div');
            this.statusDisplay.style.display = 'none'; // Keep element but hidden to avoid null refs if any
        }
        createSummaryPanel() {
            this.summaryPanel = document.createElement('div'); this.summaryPanel.style.cssText = `background: rgba(255, 255, 255, 0.5); border-radius: 12px; padding: 16px; margin-top: 16px; display: none; backdrop-filter: blur(10px); border: 1px solid rgba(0, 0, 0, 0.05);`;
            const titleContainer = document.createElement('div'); titleContainer.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;`;

            // Left side: Title + Theme Toggle
            const leftContainer = document.createElement('div'); leftContainer.style.cssText = `display: flex; align-items: center; gap: 12px;`;
            const titleEl = document.createElement('div'); titleEl.textContent = '📝 内容总结'; titleEl.style.cssText = `font-weight: 600; font-size: 15px; color: #1f2937;`;

            // Theme Toggle (iOS Style)
            const toggleWrapper = document.createElement('div');
            toggleWrapper.style.cssText = `display: flex; align-items: center; gap: 6px;`;
            const toggleLabel = document.createElement('span'); toggleLabel.textContent = '主题'; toggleLabel.style.cssText = `font-size: 11px; color: #666;`;

            const labelSwitch = document.createElement('label');
            labelSwitch.style.cssText = `position: relative; display: inline-block; width: 32px; height: 18px;`;
            const inputSwitch = document.createElement('input');
            inputSwitch.type = 'checkbox';
            inputSwitch.checked = (CONFIG.APPEARANCE.THEME === 'spring');
            inputSwitch.style.cssText = `opacity: 0; width: 0; height: 0;`;

            const slider = document.createElement('span');
            slider.style.cssText = `position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 18px;`;
            // Slider knob styled via pseudo-element simulation (since we can't easily use CSS classes with inline styles for pseudo-elements, we use a child span)
            const knob = document.createElement('span');
            knob.style.cssText = `position: absolute; content: ""; height: 14px; width: 14px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.3); transform: ${inputSwitch.checked ? 'translateX(14px)' : 'translateX(0)'};`;
            if (inputSwitch.checked) slider.style.backgroundColor = '#42b983';

            labelSwitch.appendChild(inputSwitch);
            labelSwitch.appendChild(slider);
            slider.appendChild(knob);

            inputSwitch.addEventListener('change', () => {
                const isSpring = inputSwitch.checked;
                CONFIG.APPEARANCE.THEME = isSpring ? 'spring' : 'default';
                ConfigManager.saveConfig(CONFIG);

                // Animate
                slider.style.backgroundColor = isSpring ? '#42b983' : '#ccc';
                knob.style.transform = isSpring ? 'translateX(14px)' : 'translateX(0)';

                // Re-render
                if (this.summaryContent && this.originalSummaryText) {
                    this.createFormattedContent(this.summaryContent, this.originalSummaryText);
                    this.showNotification(`已切换为${isSpring ? '船仓沐春' : '船仓红韵'}主题`, 'success');
                }
            });

            toggleWrapper.appendChild(toggleLabel);
            toggleWrapper.appendChild(labelSwitch);

            leftContainer.appendChild(titleEl);
            leftContainer.appendChild(toggleWrapper);

            // 按钮容器
            const buttonsContainer = document.createElement('div'); buttonsContainer.style.cssText = `display: flex; gap: 8px; align-items: center;`;

            // 复制按钮
            const copyButton = document.createElement('button'); copyButton.textContent = '复制';
            copyButton.style.cssText = `background: #3b82f6; color: white; border: none; border-radius: 8px; padding: 6px 12px; font-size: 12px; cursor: pointer; transition: all 0.2s ease;`;
            let longPressTimer = null, isLongPress = false;
            const handleCopy = () => { navigator.clipboard.writeText(this.originalSummaryText || this.summaryContent.textContent).then(() => { copyButton.textContent = '已复制'; setTimeout(() => { copyButton.textContent = '复制'; }, 2000); }); };
            const handleMarkdownExport = () => {
                const textToExport = this.originalSummaryText || this.summaryContent.textContent;
                const title = this.contentController.translatedTitle || this.contentController.getContentTitle();
                const id = this.contentController.getContentId(); const cleanTitle = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim();
                const filename = `${cleanTitle}【${id}】.md`;
                const markdownContent = `# ${title}\n\n**原文链接：** ${window.location.href}\n**ID：** ${id}\n**总结时间：** ${new Date().toLocaleString('zh-CN')}\n\n---\n\n## 内容总结\n\n${textToExport}\n\n---\n\n*本总结由 内容专家助手 生成*`;
                const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
                const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = filename;
                document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link);
                copyButton.textContent = '已导出'; setTimeout(() => { copyButton.textContent = '复制'; }, 2000);
            };
            copyButton.addEventListener('mousedown', (e) => { e.preventDefault(); isLongPress = false; longPressTimer = setTimeout(() => { isLongPress = true; copyButton.textContent = '导出中...'; handleMarkdownExport(); }, 800); });
            copyButton.addEventListener('mouseup', (e) => { e.preventDefault(); clearTimeout(longPressTimer); if (!isLongPress) handleCopy(); });
            copyButton.addEventListener('mouseleave', () => { clearTimeout(longPressTimer); isLongPress = false; });
            buttonsContainer.appendChild(copyButton);

            // PublishMarkdown 发布按钮
            this.publishButton = document.createElement('button'); this.publishButton.textContent = '📤 发布';
            this.publishButton.style.cssText = `background: #c83232; color: white; border: none; border-radius: 8px; padding: 6px 12px; font-size: 12px; cursor: pointer; transition: all 0.2s ease; display: ${CONFIG.PUBLISH_MARKDOWN?.ENABLED ? 'block' : 'none'};`;
            this.publishButton.addEventListener('click', () => this.handlePublishMarkdown());
            buttonsContainer.appendChild(this.publishButton);

            titleContainer.appendChild(leftContainer); titleContainer.appendChild(buttonsContainer);

            // 已发布URL显示区域
            this.publishedUrlContainer = document.createElement('div');
            this.publishedUrlContainer.style.cssText = `display: none; margin-bottom: 12px; padding: 10px 14px; background: rgba(76, 175, 80, 0.1); border-radius: 8px; border: 1px solid rgba(76, 175, 80, 0.2);`;
            const urlRow = document.createElement('div'); urlRow.style.cssText = `display: flex; align-items: center; gap: 8px; flex-wrap: wrap;`;
            const urlLabel = document.createElement('span'); urlLabel.textContent = '🔗 已发布：'; urlLabel.style.cssText = `font-size: 12px; color: #666;`;
            this.publishedUrlLink = document.createElement('a'); this.publishedUrlLink.style.cssText = `font-size: 12px; color: #2e7d32; text-decoration: none; word-break: break-all;`; this.publishedUrlLink.target = '_blank';
            this.editIdentifierButton = document.createElement('button'); this.editIdentifierButton.textContent = '✏️';
            this.editIdentifierButton.style.cssText = `background: rgba(200, 50, 50, 0.1); color: #c83232; border: none; border-radius: 6px; padding: 4px 8px; font-size: 12px; cursor: pointer; transition: all 0.2s ease;`;
            this.editIdentifierButton.title = '编辑自定义URL';
            this.editIdentifierButton.addEventListener('click', () => this.showEditIdentifierDialog());
            urlRow.appendChild(urlLabel); urlRow.appendChild(this.publishedUrlLink); urlRow.appendChild(this.editIdentifierButton);
            this.publishedUrlContainer.appendChild(urlRow);

            this.summaryContent = document.createElement('div'); this.summaryContent.style.cssText = `font-size: 14px; line-height: 1.6; color: #374151; white-space: pre-wrap; overflow-y: auto; padding: 16px; background: rgba(255, 255, 255, 0.6); border-radius: 12px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.05); word-break: break-word;`;
            this.summaryPanel.appendChild(titleContainer); this.summaryPanel.appendChild(this.publishedUrlContainer); this.summaryPanel.appendChild(this.summaryContent);
            this.mainContent.appendChild(this.summaryPanel);

            // 记录当前发布的identifier
            this.currentPublishedIdentifier = null;

            // 添加窗口resize事件监听器，动态调整内容面板高度
            window.addEventListener('resize', () => this.updateSummaryContentHeight());
        }
        // 动态计算并设置内容面板高度，使其延伸到浏览器窗口底部边缘
        updateSummaryContentHeight() {
            if (!this.summaryContent || !this.container || this.summaryPanel.style.display === 'none') return;
            const windowHeight = window.innerHeight;
            const containerRect = this.container.getBoundingClientRect();
            const bottomPadding = 20; // 距离窗口底部的边距

            // 计算容器顶部到窗口底部的可用空间
            const containerTopOffset = containerRect.top;
            const totalAvailableHeight = windowHeight - containerTopOffset - bottomPadding;

            // 先设置容器的最大高度
            this.container.style.maxHeight = `${totalAvailableHeight}px`;
            this.container.style.overflow = 'hidden';

            // 计算 summaryContent 的可用高度
            // 需要减去 topBar、controls、status、summaryPanel 的标题等其他元素的高度
            const summaryContentRect = this.summaryContent.getBoundingClientRect();
            const summaryContentTop = summaryContentRect.top;
            const summaryPanelPadding = 36; // summaryPanel的padding + 额外边距
            const availableHeight = windowHeight - summaryContentTop - bottomPadding - summaryPanelPadding;

            // 设置最小高度为100px，最大高度为可用空间
            const maxHeight = Math.max(100, availableHeight);
            this.summaryContent.style.maxHeight = `${maxHeight}px`;

            // 为 mainContent 添加滚动支持
            this.mainContent.style.maxHeight = `${totalAvailableHeight - 60}px`; // 减去 topBar 高度
            this.mainContent.style.overflowY = 'auto';
        }
        createConfigPanel() {
            if (this.configPanel) { this.configPanel.remove(); }
            this.configPanel = document.createElement('div');
            this.configPanel.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 900px; max-width: 95vw; max-height: 80vh; background: rgba(255, 255, 255, 0.85); border-radius: 20px; color: #1f2937; font-family: -apple-system, sans-serif; z-index: 50000; display: none; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15); border: 1px solid rgba(0, 0, 0, 0.1); overflow: hidden; backdrop-filter: blur(20px) saturate(180%);`;
            const configHeader = document.createElement('div'); configHeader.style.cssText = `padding: 20px 24px; background: rgba(59, 130, 246, 0.1); display: flex; justify-content: space-between; align-items: center;`;
            const headerTitle = document.createElement('h3'); headerTitle.textContent = '⚙️ 设置面板'; headerTitle.style.cssText = `margin: 0 0 20px 0; font-size: 18px; font-weight: 600;`;
            const headerButtons = document.createElement('div'); headerButtons.style.cssText = `display: flex; gap: 12px; align-items: center;`;
            const saveBtn = this.createButton('💾 保存配置', 'primary');
            // ++ 在这里添加下面的新代码 ++
            const importBtn = this.createButton('📥 导入', 'secondary'); importBtn.style.padding = '8px 16px'; importBtn.addEventListener('click', () => this.handleImport());
            const exportBtn = this.createButton('📤 导出', 'secondary'); exportBtn.style.padding = '8px 16px'; exportBtn.addEventListener('click', () => this.handleExport());
            saveBtn.style.padding = '8px 16px'; saveBtn.addEventListener('click', () => this.saveConfig());
            const resetBtn = this.createButton('🔄 重置', 'secondary'); resetBtn.style.padding = '8px 16px'; resetBtn.addEventListener('click', () => this.resetConfig());
            const closeButton = this.createIconButton('✕', '关闭'); closeButton.addEventListener('click', () => this.toggleConfigPanel());
            headerButtons.appendChild(saveBtn);
            headerButtons.appendChild(importBtn);
            headerButtons.appendChild(exportBtn);
            headerButtons.appendChild(resetBtn);
            headerButtons.appendChild(closeButton);
            configHeader.appendChild(headerTitle); configHeader.appendChild(headerButtons);
            const configContent = document.createElement('div'); configContent.style.cssText = `padding: 16px 20px 20px 20px; overflow-y: auto; max-height: calc(80vh - 70px);`;
            const horizontalContainer = document.createElement('div');
            // Two-column layout container
            horizontalContainer.style.cssText = `display: flex; gap: 20px; align-items: stretch;`;

            // Left Column: AI Settings
            const aiSection = this.createConfigSection('🤖 AI 模型设置', this.createAIModelConfig());
            aiSection.style.cssText += `flex: 1; min-width: 380px; display: flex; flex-direction: column;`;

            // Right Column: Prompt + Publish
            const rightColumn = document.createElement('div');
            rightColumn.style.cssText = `flex: 1; min-width: 380px; display: flex; flex-direction: column; gap: 16px;`;

            const promptSection = this.createConfigSection('📝 Prompt 管理', this.createPromptConfig());
            promptSection.style.cssText += `flex: 1;`; // Allow prompt section to take available space

            const publishSection = this.createConfigSection('📤 PublishMarkdown 发布', this.createPublishMarkdownConfig());
            // No margin-top needed if we rely on flex gap, but margin-top: auto ensures it pushes to bottom if prompt section is short
            publishSection.style.cssText += `margin-top: auto;`;

            rightColumn.appendChild(promptSection);
            // Appearance section removed as requested
            rightColumn.appendChild(publishSection);

            horizontalContainer.appendChild(aiSection);
            horizontalContainer.appendChild(rightColumn);

            configContent.appendChild(horizontalContainer);
            this.configPanel.appendChild(configHeader); this.configPanel.appendChild(configContent);
            document.body.appendChild(this.configPanel);
        }
        createConfigSection(title, content) {
            const section = document.createElement('div');
            section.style.cssText = `margin-bottom: 16px; background: rgba(59, 130, 246, 0.05); border-radius: 16px; padding: 16px; border: 1px solid rgba(59, 130, 246, 0.1); display: flex; flex-direction: column;`;
            const sectionTitle = document.createElement('h4'); sectionTitle.textContent = title; sectionTitle.style.cssText = `margin: 0 0 16px 0; font-size: 16px; font-weight: 600;`;
            section.appendChild(sectionTitle); section.appendChild(content);
            return section;
        }
        createAIModelConfig() {
            const container = document.createElement('div');
            const modelSelectContainer = document.createElement('div'); modelSelectContainer.style.cssText = `display: flex; gap: 8px; align-items: flex-end;`;
            const selectWrapper = document.createElement('div'); selectWrapper.style.flex = 1;
            const modelFormGroup = this.createFormGroup('选择模型', this.createModelSelect());
            modelFormGroup.style.marginBottom = '0'; // 移除底部边距以对齐按钮
            selectWrapper.appendChild(modelFormGroup);
            const addModelButton = this.createButton('➕ 新增', 'secondary'); addModelButton.style.height = '44px'; addModelButton.addEventListener('click', () => this.showAddModelDialog());
            const deleteModelButton = this.createButton('🗑️ 删除', 'secondary'); deleteModelButton.style.cssText += `height: 44px; background: rgba(244, 67, 54, 0.1); color: #ef4444; border-color: rgba(244, 67, 54, 0.3);`; deleteModelButton.addEventListener('click', () => this.showDeleteModelDialog());
            modelSelectContainer.appendChild(selectWrapper); modelSelectContainer.appendChild(addModelButton); modelSelectContainer.appendChild(deleteModelButton);
            this.apiConfigContainer = this.createAPIConfig(CONFIG.AI_MODELS.TYPE);
            container.appendChild(modelSelectContainer); container.appendChild(this.apiConfigContainer);
            return container;
        }
        createModelSelect() {
            const select = document.createElement('select');
            select.style.cssText = `width: 100%; padding: 12px 16px; border-radius: 12px; background: rgba(255, 255, 255, 0.9); color: #333; border: 1px solid rgba(255, 255, 255, 0.2); font-size: 14px;`;
            Object.keys(CONFIG.AI_MODELS).forEach(model => {
                if (model !== 'TYPE') {
                    const option = document.createElement('option'); option.value = model;
                    const modelConfig = CONFIG.AI_MODELS[model]; option.textContent = `${modelConfig.NAME || model} (${modelConfig.MODEL})`;
                    if (CONFIG.AI_MODELS.TYPE === model) option.selected = true;
                    select.appendChild(option);
                }
            });
            select.addEventListener('change', () => {
                CONFIG.AI_MODELS.TYPE = select.value; this.contentController.onConfigUpdate('AI_MODELS.TYPE', select.value);
                const newApiConfig = this.createAPIConfig(select.value); this.apiConfigContainer.replaceWith(newApiConfig); this.apiConfigContainer = newApiConfig;
                this.updateTitleWithModel();
            });
            return select;
        }
        createAPIConfig(modelType) {
            const container = document.createElement('div'); const modelConfig = CONFIG.AI_MODELS[modelType];

            // Core Settings
            container.appendChild(this.createFormGroup('显示名称', this.createInput(modelConfig.NAME || '', v => modelConfig.NAME = v)));
            container.appendChild(this.createFormGroup('API URL', this.createInput(modelConfig.API_URL, v => modelConfig.API_URL = v)));
            container.appendChild(this.createFormGroup('API Key', this.createInput(modelConfig.API_KEY, v => modelConfig.API_KEY = v, 'password')));

            // Model ID with Fetch Feature
            container.appendChild(this.createFormGroup('模型ID', this.createModelSelectionControl(modelConfig)));

            // Advanced Settings (Collapsible)
            const details = document.createElement('details');
            details.style.cssText = `border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; padding: 8px; background: rgba(59, 130, 246, 0.05); margin-top: 8px;`;

            const summary = document.createElement('summary');
            summary.textContent = '🛠️ 高级设置';
            summary.style.cssText = `cursor: pointer; font-size: 14px; font-weight: 500; color: #3b82f6; outline: none; padding: 4px; user-select: none;`;
            details.appendChild(summary);

            const content = document.createElement('div');
            content.style.cssText = `padding-top: 12px; display: flex; flex-direction: column; gap: 4px;`;

            content.appendChild(this.createFormGroup('API 类型', this.createAPITypeSelect(modelType)));
            content.appendChild(this.createFormGroup('最大输出令牌', this.createNumberInput(modelConfig.MAX_TOKENS || 2000, v => modelConfig.MAX_TOKENS = parseInt(v), 1, 100000, 1)));
            content.appendChild(this.createFormGroup('流式响应', this.createStreamSelect(modelType)));
            content.appendChild(this.createFormGroup('温度 (0-2)', this.createNumberInput(modelConfig.TEMPERATURE || 0.7, v => modelConfig.TEMPERATURE = parseFloat(v), 0, 2, 0.1)));

            details.appendChild(content);
            container.appendChild(details);

            return container;
        }
        createAPITypeSelect(modelType) {
            const select = document.createElement('select');
            select.style.cssText = `width: 100%; padding: 12px 16px; border-radius: 12px; background: rgba(255, 255, 255, 0.9); color: #333; border: 1px solid rgba(255, 255, 255, 0.2);`;
            const options = [{ value: 'gemini', text: 'Gemini 格式' }, { value: 'openai', text: 'OpenAI 兼容格式' }, { value: 'anthropic', text: 'Anthropic 格式' }];
            const currentType = CONFIG.AI_MODELS[modelType].API_TYPE || 'openai';
            options.forEach(opt => {
                const optionEl = document.createElement('option'); optionEl.value = opt.value; optionEl.textContent = opt.text;
                if (currentType === opt.value) optionEl.selected = true;
                select.appendChild(optionEl);
            });
            select.addEventListener('change', () => { CONFIG.AI_MODELS[modelType].API_TYPE = select.value; });
            return select;
        }
        createStreamSelect(modelType) {
            const select = document.createElement('select');
            select.style.cssText = `width: 100%; padding: 12px 16px; border-radius: 12px; background: rgba(255, 255, 255, 0.9); color: #333; border: 1px solid rgba(255, 255, 255, 0.2);`;
            const options = [{ value: 'false', text: '否 (标准响应)' }, { value: 'true', text: '是 (流式响应)' }];
            options.forEach(opt => {
                const optionEl = document.createElement('option'); optionEl.value = opt.value; optionEl.textContent = opt.text;
                if (String(CONFIG.AI_MODELS[modelType].STREAM) === opt.value) optionEl.selected = true;
                select.appendChild(optionEl);
            });
            select.addEventListener('change', () => { CONFIG.AI_MODELS[modelType].STREAM = select.value === 'true'; });
            return select;
        }
        createPromptConfig() {
            const container = document.createElement('div');
            const promptSelectContainer = document.createElement('div'); promptSelectContainer.style.cssText = `display: flex; gap: 8px; align-items: flex-end; margin-bottom: 16px;`;
            const selectWrapper = document.createElement('div'); selectWrapper.style.flex = 1;
            const promptFormGroup = this.createFormGroup('当前默认 Prompt', this.createPromptSelect());
            promptFormGroup.style.marginBottom = '0'; // 移除底部边距以对齐按钮
            selectWrapper.appendChild(promptFormGroup);
            const addButton = this.createButton('➕ 新增', 'secondary'); addButton.style.height = '44px'; addButton.addEventListener('click', () => this.showAddPromptDialog());
            promptSelectContainer.appendChild(selectWrapper); promptSelectContainer.appendChild(addButton);
            this.promptListContainer = this.createPromptList();
            container.appendChild(promptSelectContainer); container.appendChild(this.createFormGroup('Prompt 列表管理', this.promptListContainer));
            return container;
        }
        // createAppearanceConfig removed

        createPublishMarkdownConfig() {
            const container = document.createElement('div');
            container.style.cssText = `display: flex; flex-direction: column; gap: 12px;`;

            // 启用开关
            const enableRow = document.createElement('div');
            enableRow.style.cssText = `display: flex; align-items: center; gap: 12px;`;
            const enableLabel = document.createElement('label');
            enableLabel.textContent = '启用 PublishMarkdown 发布功能';
            enableLabel.style.cssText = `font-size: 14px; color: #374151;`;
            const enableCheckbox = document.createElement('input');
            enableCheckbox.type = 'checkbox';
            enableCheckbox.checked = CONFIG.PUBLISH_MARKDOWN?.ENABLED || false;
            enableCheckbox.style.cssText = `width: 18px; height: 18px; cursor: pointer;`;
            enableCheckbox.addEventListener('change', () => {
                CONFIG.PUBLISH_MARKDOWN = CONFIG.PUBLISH_MARKDOWN || {};
                CONFIG.PUBLISH_MARKDOWN.ENABLED = enableCheckbox.checked;
                apiKeyInput.disabled = !enableCheckbox.checked;
            });
            enableRow.appendChild(enableCheckbox);
            enableRow.appendChild(enableLabel);

            // API Key 输入
            const apiKeyInput = this.createInput(CONFIG.PUBLISH_MARKDOWN?.API_KEY || '', (value) => {
                CONFIG.PUBLISH_MARKDOWN = CONFIG.PUBLISH_MARKDOWN || {};
                CONFIG.PUBLISH_MARKDOWN.API_KEY = value;
            }, 'password', 'PublishMarkdown API Key');
            apiKeyInput.disabled = !CONFIG.PUBLISH_MARKDOWN?.ENABLED;

            // 说明文字
            const helpText = document.createElement('div');
            helpText.style.cssText = `font-size: 12px; color: #6b7280;`;
            const helpLink = document.createElement('a');
            helpLink.href = 'https://publishmarkdown.com/docs';
            helpLink.target = '_blank';
            helpLink.textContent = '获取 API Key →';
            helpLink.style.cssText = `color: #3b82f6; text-decoration: none; margin-right: 8px;`;
            helpText.appendChild(helpLink);
            helpText.appendChild(document.createTextNode('启用后可一键发布总结的内容生成网址'));

            container.appendChild(enableRow);
            container.appendChild(this.createFormGroup('API Key', apiKeyInput));
            container.appendChild(helpText);
            return container;
        }
        createMainPromptSelect() {
            const select = document.createElement('select');
            select.style.cssText = `width: 100%; padding: 12px 16px; border-radius: 12px; background: rgba(255, 255, 255, 0.9); color: #333; border: 1px solid rgba(255, 255, 255, 0.2); font-size: 14px;`;
            this.mainPromptSelectElement = select; this.updatePromptSelect(this.mainPromptSelectElement);
            select.addEventListener('change', () => { CONFIG.PROMPTS.DEFAULT = select.value; this.showNotification('Prompt 已切换', 'success'); if (this.promptSelectElement) this.promptSelectElement.value = select.value; });
            return select;
        }
        createPromptSelect() {
            const select = document.createElement('select');
            select.style.cssText = `width: 100%; padding: 12px 16px; border-radius: 12px; background: rgba(255, 255, 255, 0.9); color: #333; border: 1px solid rgba(255, 255, 255, 0.2); font-size: 14px;`;
            this.promptSelectElement = select; this.updatePromptSelect(this.promptSelectElement);
            select.addEventListener('change', () => { CONFIG.PROMPTS.DEFAULT = select.value; this.showNotification('默认 Prompt 已更新', 'success'); if (this.mainPromptSelectElement) this.mainPromptSelectElement.value = select.value; });
            return select;
        }
        updatePromptSelect(select) {
            if (!select) return;
            while (select.firstChild) { select.removeChild(select.firstChild); }
            CONFIG.PROMPTS.LIST.forEach(prompt => {
                const option = document.createElement('option'); option.value = prompt.id; option.textContent = prompt.name;
                if (CONFIG.PROMPTS.DEFAULT === prompt.id) option.selected = true;
                select.appendChild(option);
            });
        }
        createPromptList() {
            const container = document.createElement('div');
            // [UI修正 2/2] 移除 max-height: 250px;
            container.style.cssText = `overflow-y: auto; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 12px; background: rgba(255, 255, 255, 0.05); padding: 4px;`;
            this.updatePromptList(container); return container;
        }
        updatePromptList(container) {
            if (!container) container = this.promptListContainer; if (!container) return;
            while (container.firstChild) { container.removeChild(container.firstChild); }
            CONFIG.PROMPTS.LIST.forEach((prompt, index) => {
                const item = document.createElement('div'); item.style.cssText = `padding: 8px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;`;
                item.addEventListener('mouseover', () => item.style.background = 'rgba(255, 255, 255, 0.1)');
                item.addEventListener('mouseout', () => item.style.background = 'transparent');
                const info = document.createElement('div');
                const nameDiv = document.createElement('div'); nameDiv.textContent = prompt.name; nameDiv.style.cssText = `font-weight: 500; font-size: 13px;`;
                const promptDiv = document.createElement('div'); promptDiv.textContent = `${prompt.prompt.substring(0, 50)}...`; promptDiv.style.cssText = `font-size: 11px; color: #6b7280;`;
                info.appendChild(nameDiv); info.appendChild(promptDiv);
                const actions = document.createElement('div'); actions.style.cssText = `display: flex; gap: 8px;`;
                const editBtn = this.createSmallButton('✏️', '编辑'); editBtn.addEventListener('click', () => this.showEditPromptDialog(prompt, index));
                actions.appendChild(editBtn);
                if (CONFIG.PROMPTS.LIST.length > 1) {
                    const deleteBtn = this.createSmallButton('🗑️', '删除', 'rgba(244, 67, 54, 0.1)'); deleteBtn.style.color = '#ef4444'; deleteBtn.addEventListener('click', () => this.deletePrompt(index));
                    actions.appendChild(deleteBtn);
                }
                item.appendChild(info); item.appendChild(actions); container.appendChild(item);
            });
        }
        createSmallButton(text, tooltip, bgColor = 'rgba(255, 255, 255, 0.2)') {
            const button = document.createElement('button'); button.textContent = text; button.title = tooltip;
            button.style.cssText = `background: ${bgColor}; border: none; color: #374151; cursor: pointer; padding: 6px 8px; font-size: 12px; border-radius: 6px; transition: all 0.2s;`;
            button.addEventListener('mouseover', () => { button.style.opacity = '0.8'; button.style.transform = 'scale(1.1)'; });
            button.addEventListener('mouseout', () => { button.style.opacity = '1'; button.style.transform = 'scale(1)'; });
            return button;
        }
        showAddPromptDialog() { this.showPromptDialog('添加新 Prompt', '', '', (name, prompt) => { CONFIG.PROMPTS.LIST.push({ id: 'custom_' + Date.now(), name, prompt }); this.updateAllPromptUI(); this.showNotification('新 Prompt 已添加', 'success'); }); }
        showEditPromptDialog(prompt, index) { this.showPromptDialog('编辑 Prompt', prompt.name, prompt.prompt, (name, promptText) => { CONFIG.PROMPTS.LIST[index].name = name; CONFIG.PROMPTS.LIST[index].prompt = promptText; this.updateAllPromptUI(); this.showNotification('Prompt 已更新', 'success'); }); }
        showPromptDialog(title, defaultName, defaultPrompt, onSave) {
            const dialog = document.createElement('div'); dialog.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 100000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);`;
            const dialogContent = document.createElement('div'); dialogContent.style.cssText = `background: rgba(255, 255, 255, 0.92); border-radius: 16px; padding: 24px; width: 450px; max-width: 90vw; color: #1f2937; backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(0, 0, 0, 0.1); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);`;
            const dialogTitle = document.createElement('h3'); dialogTitle.textContent = title; dialogTitle.style.cssText = `margin: 0 0 20px 0; color: #1f2937;`;
            const nameInput = this.createInput(defaultName, null, 'text', 'Prompt 名称');
            const promptInput = document.createElement('textarea'); promptInput.value = defaultPrompt; promptInput.placeholder = '输入 Prompt 内容...';
            promptInput.style.cssText = `width: 100%; height: 150px; padding: 12px 16px; border-radius: 12px; background: rgba(255, 255, 255, 0.9); color: #333; border: 1px solid rgba(0, 0, 0, 0.1); font-size: 14px; margin-top: 16px; resize: vertical; box-sizing: border-box; font-family: inherit;`;
            const buttonContainer = document.createElement('div'); buttonContainer.style.cssText = `display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;`;
            const cancelBtn = this.createButton('取消', 'secondary'); cancelBtn.addEventListener('click', () => dialog.remove());
            const saveBtn = this.createButton('保存', 'primary'); saveBtn.addEventListener('click', () => { if (!nameInput.value.trim() || !promptInput.value.trim()) { this.showNotification('请填写完整信息', 'error'); return; } onSave(nameInput.value.trim(), promptInput.value.trim()); dialog.remove(); });
            buttonContainer.appendChild(cancelBtn); buttonContainer.appendChild(saveBtn);
            dialogContent.appendChild(dialogTitle); dialogContent.appendChild(nameInput); dialogContent.appendChild(promptInput); dialogContent.appendChild(buttonContainer);
            dialog.appendChild(dialogContent); document.body.appendChild(dialog);
            dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.remove(); });
        }
        deletePrompt(index) {
            if (CONFIG.PROMPTS.LIST.length <= 1) { this.showNotification('至少需要保留一个 Prompt', 'error'); return; }
            const prompt = CONFIG.PROMPTS.LIST[index];
            if (CONFIG.PROMPTS.DEFAULT === prompt.id) { CONFIG.PROMPTS.DEFAULT = CONFIG.PROMPTS.LIST[index === 0 ? 1 : 0].id; }
            CONFIG.PROMPTS.LIST.splice(index, 1);
            this.updateAllPromptUI(); this.showNotification('Prompt 已删除', 'success');
        }
        updateAllPromptUI() { this.updatePromptList(); this.updatePromptSelect(this.promptSelectElement); this.updatePromptSelect(this.mainPromptSelectElement); }
        createFormGroup(label, input) {
            const group = document.createElement('div'); group.style.cssText = `margin-bottom: 16px;`;
            const labelEl = document.createElement('label'); labelEl.textContent = label; labelEl.style.cssText = `display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500;`;
            group.appendChild(labelEl); group.appendChild(input); return group;
        }
        createInput(defaultValue, onChange, type = 'text', placeholder = '') {
            const input = document.createElement('input'); input.type = type; input.value = defaultValue; input.placeholder = placeholder;
            input.style.cssText = `width: 100%; padding: 12px 16px; border-radius: 12px; background: rgba(255, 255, 255, 0.9); color: #333; border: 1px solid rgba(255, 255, 255, 0.2); font-size: 14px; outline: none; transition: all 0.3s; box-sizing: border-box;`;
            input.addEventListener('focus', () => { input.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.2)'; });
            input.addEventListener('blur', () => { input.style.boxShadow = 'none'; });
            if (onChange) input.addEventListener('input', (e) => onChange(e.target.value));
            return input;
        }
        createNumberInput(defaultValue, onChange, min = 0, max = 100, step = 1) { const input = this.createInput(defaultValue, onChange, 'number'); input.min = min; input.max = max; input.step = step; return input; }
        showAddModelDialog() {
            const dialog = document.createElement('div'); dialog.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 100000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);`;
            const dialogContent = document.createElement('div'); dialogContent.style.cssText = `background: rgba(255, 255, 255, 0.92); border-radius: 16px; padding: 24px; width: 500px; max-width: 90vw; max-height: 85vh; overflow-y: auto; color: #1f2937; backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(0, 0, 0, 0.1); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);`;
            const dialogTitle = document.createElement('h3'); dialogTitle.textContent = '新增 AI 模型'; dialogTitle.style.cssText = `margin: 0 0 20px 0; color: #1f2937;`;

            const nameInput = this.createInput('', null, 'text', '显示名称 (如: My Custom Model)');
            // API 类型选择
            const apiTypeSelect = document.createElement('select'); apiTypeSelect.style.cssText = `width: 100%; padding: 12px 16px; border-radius: 12px; background: rgba(255, 255, 255, 0.9); color: #333; border: none;`;
            const apiTypeOpt1 = document.createElement('option'); apiTypeOpt1.value = 'openai'; apiTypeOpt1.textContent = 'OpenAI 兼容格式';
            const apiTypeOpt2 = document.createElement('option'); apiTypeOpt2.value = 'gemini'; apiTypeOpt2.textContent = 'Gemini 格式';
            const apiTypeOpt3 = document.createElement('option'); apiTypeOpt3.value = 'anthropic'; apiTypeOpt3.textContent = 'Anthropic 格式';
            apiTypeSelect.appendChild(apiTypeOpt1); apiTypeSelect.appendChild(apiTypeOpt2); apiTypeSelect.appendChild(apiTypeOpt3);

            const urlInput = this.createInput('', null, 'text', 'API URL');
            const apiKeyInput = this.createInput('', null, 'password', 'API Key');
            const modelInput = this.createInput('', null, 'text', '模型名称 (如: gpt-4o)');
            const streamSelect = document.createElement('select'); streamSelect.style.cssText = `width: 100%; padding: 12px 16px; border-radius: 12px; background: rgba(255, 255, 255, 0.9); color: #333; border: none;`;
            const opt1 = document.createElement('option'); opt1.value = "false"; opt1.textContent = "否 (标准响应)";
            const opt2 = document.createElement('option'); opt2.value = "true"; opt2.textContent = "是 (流式响应)";
            streamSelect.appendChild(opt1); streamSelect.appendChild(opt2);
            const temperatureInput = this.createNumberInput(0.7, null, 0, 2, 0.1);
            const maxTokensInput = this.createNumberInput(2000, null, 1, 100000, 1);

            const buttonContainer = document.createElement('div'); buttonContainer.style.cssText = `display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;`;
            const cancelBtn = this.createButton('取消', 'secondary'); cancelBtn.addEventListener('click', () => dialog.remove());
            const saveBtn = this.createButton('保存', 'primary'); saveBtn.addEventListener('click', () => {
                const name = nameInput.value.trim();
                if (!name) { this.showNotification('显示名称不能为空', 'error'); return; }

                // Auto-generate key from name + timestamp
                let key = name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
                if (!key) key = 'CUSTOM';
                key = key + '_' + Date.now().toString().slice(-4);

                if (CONFIG.AI_MODELS[key]) { this.showNotification('生成模型ID冲突，请重试', 'error'); return; }

                CONFIG.AI_MODELS[key] = { NAME: name, API_TYPE: apiTypeSelect.value, API_KEY: apiKeyInput.value.trim(), API_URL: urlInput.value.trim(), MODEL: modelInput.value.trim(), STREAM: streamSelect.value === 'true', TEMPERATURE: parseFloat(temperatureInput.value), MAX_TOKENS: parseInt(maxTokensInput.value), AVAILABLE_MODELS: [] };

                if (this.configPanel) {
                    this.configPanel.remove();
                    this.configPanel = null;
                }
                this.toggleConfigPanel();
                this.showNotification('新模型已添加', 'success');
                dialog.remove();
            });
            buttonContainer.appendChild(cancelBtn); buttonContainer.appendChild(saveBtn);
            dialogContent.appendChild(dialogTitle);
            // dialogContent.appendChild(this.createFormGroup('模型标识键', keyInput));
            dialogContent.appendChild(this.createFormGroup('显示名称', nameInput));
            dialogContent.appendChild(this.createFormGroup('API 类型', apiTypeSelect));
            dialogContent.appendChild(this.createFormGroup('API URL', urlInput)); dialogContent.appendChild(this.createFormGroup('API Key', apiKeyInput));
            dialogContent.appendChild(this.createFormGroup('模型名称', modelInput)); dialogContent.appendChild(this.createFormGroup('流式响应', streamSelect));
            dialogContent.appendChild(this.createFormGroup('温度 (0-2)', temperatureInput)); dialogContent.appendChild(this.createFormGroup('最大输出令牌', maxTokensInput));
            dialogContent.appendChild(buttonContainer); dialog.appendChild(dialogContent); document.body.appendChild(dialog);
        }
        showDeleteModelDialog() {
            const currentModelKey = CONFIG.AI_MODELS.TYPE;
            if (Object.keys(CONFIG.AI_MODELS).filter(k => k !== 'TYPE').length <= 1) { this.showNotification('至少需要保留一个模型', 'error'); return; }
            if (confirm(`确定要删除模型 "${CONFIG.AI_MODELS[currentModelKey].NAME || currentModelKey}" 吗？`)) {
                delete CONFIG.AI_MODELS[currentModelKey];
                CONFIG.AI_MODELS.TYPE = Object.keys(CONFIG.AI_MODELS).filter(key => key !== 'TYPE')[0];
                if (this.configPanel) {
                    this.configPanel.remove();
                    this.configPanel = null;
                }
                this.toggleConfigPanel();
                this.updateTitleWithModel();
                this.showNotification('模型已删除', 'success');
            }
        }
        saveConfig() { ConfigManager.saveConfig(CONFIG); this.showNotification('配置已保存', 'success'); }
        // ++ 在 saveConfig() 函数结束后，粘贴下面所有代码 ++
        handleExport() {
            try {
                const configString = JSON.stringify(CONFIG, null, 2); // 格式化JSON，方便阅读
                const blob = new Blob([configString], { type: 'application/json;charset=utf-8' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `船仓AI助手-配置备份-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
                this.showNotification('配置已导出', 'success');
            } catch (e) {
                this.showNotification(`导出失败: ${e.message}`, 'error');
                console.error('导出配置失败:', e);
            }
        }
        handleImport() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.onchange = e => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importedConfig = JSON.parse(event.target.result);
                        if (importedConfig && importedConfig.AI_MODELS && importedConfig.PROMPTS) {
                            CONFIG = importedConfig;
                            ConfigManager.saveConfig(CONFIG);

                            // 强制刷新UI
                            if (this.configPanel) {
                                this.configPanel.remove();
                                this.configPanel = null;
                            }
                            this.toggleConfigPanel();
                            this.updateTitleWithModel();
                            this.showNotification('配置导入成功！', 'success');
                        } else {
                            throw new Error('文件格式不正确');
                        }
                    } catch (err) {
                        this.showNotification(`导入失败: ${err.message}`, 'error');
                        console.error('导入配置失败:', err);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        }
        resetConfig() { if (confirm('确定要重置所有配置吗？')) { CONFIG = ConfigManager.getDefaultConfig(); ConfigManager.saveConfig(CONFIG); this.toggleConfigPanel(); this.toggleConfigPanel(); this.updateTitleWithModel(); this.showNotification('配置已重置', 'success'); } }

        toggleHistoryPanel() {
            if (!this.historyPanel || !document.body.contains(this.historyPanel)) this.createHistoryPanel();
            const isVisible = this.historyPanel.style.display === 'block';
            this.historyPanel.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) this.renderHistoryList();
        }

        createHistoryPanel() {
            if (this.historyPanel) this.historyPanel.remove();
            this.historyPanel = document.createElement('div');
            this.historyPanel.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 600px; max-width: 90vw; max-height: 80vh; background: rgba(255, 255, 255, 0.9); border-radius: 20px; color: #1f2937; font-family: -apple-system, sans-serif; z-index: 50000; display: none; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15); border: 1px solid rgba(0, 0, 0, 0.1); overflow: hidden; backdrop-filter: blur(20px) saturate(180%);`;

            const header = document.createElement('div');
            header.style.cssText = `padding: 20px 24px; background: rgba(59, 130, 246, 0.1); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.05);`;
            const title = document.createElement('h3'); title.textContent = '🕒 历史记录'; title.style.cssText = `margin: 0; font-size: 18px; font-weight: 600;`;

            const controls = document.createElement('div'); controls.style.cssText = `display: flex; gap: 10px; align-items: center;`;

            // 全选复选框
            this.selectAllCheckbox = document.createElement('input');
            this.selectAllCheckbox.type = 'checkbox';
            this.selectAllCheckbox.title = '全选';
            this.selectAllCheckbox.style.cssText = `width: 16px; height: 16px; cursor: pointer; accent-color: #3b82f6;`;
            this.selectAllCheckbox.addEventListener('change', () => this.toggleSelectAllHistory());
            const selectLabel = document.createElement('span');
            selectLabel.textContent = '全选';
            selectLabel.style.cssText = `font-size: 12px; color: #666; cursor: pointer;`;
            selectLabel.addEventListener('click', () => { this.selectAllCheckbox.click(); });

            // 导出按钮
            const exportBtn = this.createSmallButton('📥 导出', '导出选中记录', 'rgba(59, 130, 246, 0.1)');
            exportBtn.style.color = '#3b82f6';
            exportBtn.addEventListener('click', () => this.handleExportHistory());

            // 清空按钮
            const clearBtn = this.createSmallButton('🗑️ 清空', '清空所有记录', 'rgba(244, 67, 54, 0.1)');
            clearBtn.style.color = '#ef4444';
            clearBtn.addEventListener('click', () => {
                if (confirm('确定要清空所有历史记录吗？')) {
                    HistoryManager.clearHistory();
                    this.selectedHistoryIds = new Set();
                    this.renderHistoryList();
                    this.showNotification('历史记录已清空', 'success');
                }
            });
            const closeBtn = this.createIconButton('✕', '关闭');
            closeBtn.addEventListener('click', () => this.toggleHistoryPanel());

            controls.appendChild(this.selectAllCheckbox); controls.appendChild(selectLabel);
            controls.appendChild(exportBtn); controls.appendChild(clearBtn); controls.appendChild(closeBtn);
            header.appendChild(title); header.appendChild(controls);

            this.historyListContainer = document.createElement('div');
            this.historyListContainer.style.cssText = `padding: 10px; overflow-y: auto; max-height: calc(80vh - 70px);`;

            this.historyPanel.appendChild(header); this.historyPanel.appendChild(this.historyListContainer);
            document.body.appendChild(this.historyPanel);
        }

        createModelSelectionControl(modelConfig) {
            const container = document.createElement('div');
            container.style.cssText = `display: flex; gap: 8px; align-items: center; width: 100%;`;

            const inputContainer = document.createElement('div');
            inputContainer.style.flex = '1';

            const renderInput = () => {
                inputContainer.textContent = '';
                // Check if we have available models to show a dropdown
                const hasModels = modelConfig.AVAILABLE_MODELS && Array.isArray(modelConfig.AVAILABLE_MODELS) && modelConfig.AVAILABLE_MODELS.length > 0;

                if (hasModels) {
                    const select = document.createElement('select');
                    select.style.cssText = `width: 100%; padding: 12px 16px; border-radius: 12px; background: rgba(255, 255, 255, 0.9); color: #333; border: 1px solid rgba(255, 255, 255, 0.2); font-size: 14px; outline: none; transition: all 0.3s; box-sizing: border-box; appearance: none; -webkit-appearance: none;`;

                    // Add current model if not in list (to preserve value)
                    const currentModel = modelConfig.MODEL;
                    const models = [...modelConfig.AVAILABLE_MODELS];
                    if (currentModel && !models.includes(currentModel)) {
                        models.unshift(currentModel);
                    }

                    models.forEach(m => {
                        const option = document.createElement('option');
                        option.value = m;
                        option.textContent = m;
                        if (m === currentModel) option.selected = true;
                        select.appendChild(option);
                    });

                    // Add Custom Icon arrow
                    select.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5L6 8L9.5 4.5' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;
                    select.style.backgroundRepeat = 'no-repeat';
                    select.style.backgroundPosition = 'right 16px center';

                    select.addEventListener('change', () => { modelConfig.MODEL = select.value; });
                    inputContainer.appendChild(select);
                } else {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.value = modelConfig.MODEL || '';
                    input.placeholder = '手动输入或先获取模型列表...';
                    input.style.cssText = `width: 100%; padding: 12px 16px; border-radius: 12px; background: rgba(255, 255, 255, 0.9); color: #333; border: 1px solid rgba(255, 255, 255, 0.2); font-size: 14px; outline: none; transition: all 0.3s; box-sizing: border-box;`;
                    input.addEventListener('input', (e) => modelConfig.MODEL = e.target.value);
                    input.addEventListener('focus', () => { input.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.2)'; });
                    input.addEventListener('blur', () => { input.style.boxShadow = 'none'; });
                    inputContainer.appendChild(input);
                }
            };

            // Initial Render
            renderInput();

            // Fetch Button
            const fetchBtn = this.createButton('📋 获取模型', 'secondary');
            fetchBtn.style.padding = '8px 12px';
            fetchBtn.style.whiteSpace = 'nowrap';
            fetchBtn.addEventListener('click', async () => {
                if (!modelConfig.API_KEY) { this.showNotification('请先填写 API Key', 'error'); return; }
                if (!modelConfig.API_URL) { this.showNotification('请先填写 API URL', 'error'); return; }

                fetchBtn.disabled = true;
                fetchBtn.textContent = '获取中...';

                try {
                    // Try to deduce /v1/models endpoint
                    // Common patterns: .../v1/chat/completions -> .../v1/models
                    let baseUrl = modelConfig.API_URL;
                    const urlObj = new URL(baseUrl);

                    if (baseUrl.includes('/chat/completions')) {
                        // e.g. https://host/v1/chat/completions -> https://host/v1/models
                        baseUrl = baseUrl.replace('/chat/completions', '/models');
                    } else if (baseUrl.includes('/v1')) {
                        // e.g. https://host/v1 -> https://host/v1/models
                        // Split at /v1 to be safe and reconstruct
                        const parts = baseUrl.split('/v1');
                        baseUrl = parts[0] + '/v1/models';
                    } else {
                        // Fallback: If no /v1/ is seen, assume it's a base host like https://api.zscc.in
                        // Standard OpenAI compatible path is /v1/models
                        baseUrl = urlObj.origin + (urlObj.origin.endsWith('/') ? '' : '/') + 'v1/models';
                    }


                    console.log('[ModelFetcher] Fetching from:', baseUrl);

                    const response = await fetch(baseUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${modelConfig.API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();

                    let models = [];
                    if (Array.isArray(data.data)) {
                        models = data.data.map(m => m.id);
                    } else if (Array.isArray(data)) {
                        models = data.map(m => m.id);
                    } else {
                        throw new Error('无法解析返回的模型列表格式');
                    }

                    if (models.length === 0) throw new Error('未找到任何模型');

                    // Show Selection Dialog
                    // Pass modelConfig.AVAILABLE_MODELS explicitly to ensure checkboxes are checked
                    const currentSelected = Array.isArray(modelConfig.AVAILABLE_MODELS) ? modelConfig.AVAILABLE_MODELS : [];

                    this.showModelFilterDialog(models, currentSelected, (selectedModels) => {
                        modelConfig.AVAILABLE_MODELS = selectedModels;
                        // Determine if we should clear current model selection if it's not in the new list?
                        // Better to keep it, but user might want to switch.
                        // If current model is empty and we have logic, maybe select first?
                        if (selectedModels.length > 0 && (!modelConfig.MODEL || !selectedModels.includes(modelConfig.MODEL))) {
                            // If current model invalid or empty, pick first one
                            modelConfig.MODEL = selectedModels[0];
                        }

                        renderInput(); // Re-render with new models
                        this.showNotification(`已更新 ${selectedModels.length} 个可用模型`, 'success');
                    });

                } catch (e) {
                    console.error('Fetch Models Error:', e);
                    this.showNotification(`获取模型失败: ${e.message}`, 'error');
                } finally {
                    fetchBtn.disabled = false;
                    fetchBtn.textContent = '📋 获取模型';
                }
            });

            container.appendChild(inputContainer);
            container.appendChild(fetchBtn);
            return container;
        }

        showModelFilterDialog(allModels, selectedModels, onSave) {
            const dialog = document.createElement('div');
            dialog.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 100000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);`;

            const content = document.createElement('div');
            content.style.cssText = `background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 24px; width: 500px; max-width: 90vw; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);`;

            const title = document.createElement('h3'); title.textContent = '选择可用模型'; title.style.marginBottom = '16px';

            const listContainer = document.createElement('div');
            listContainer.style.cssText = `flex: 1; overflow-y: auto; border: 1px solid #eee; border-radius: 8px; padding: 8px; margin-bottom: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; align-content: start;`;

            const checkboxes = [];
            allModels.forEach(m => {
                const label = document.createElement('label');
                label.style.cssText = `display: flex; align-items: center; gap: 8px; padding: 6px; cursor: pointer; border-radius: 6px; hover: background: #f5f5f5; font-size: 13px;`;
                label.addEventListener('mouseover', () => label.style.background = '#f0f0f0');
                label.addEventListener('mouseout', () => label.style.background = 'transparent');

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = m;
                if (selectedModels.includes(m)) cb.checked = true;

                const span = document.createElement('span');
                span.textContent = m;
                span.style.wordBreak = 'break-all';

                label.appendChild(cb);
                label.appendChild(span);
                listContainer.appendChild(label);
                checkboxes.push(cb);
            });

            const footer = document.createElement('div');
            footer.style.cssText = `display: flex; justify-content: space-between; align-items: center;`;

            const leftActions = document.createElement('div');
            const selectAll = document.createElement('button'); selectAll.textContent = '全选';
            selectAll.style.cssText = `border: none; background: none; color: #3b82f6; cursor: pointer; font-size: 13px; margin-right: 12px;`;
            selectAll.onclick = () => checkboxes.forEach(c => c.checked = true);

            const selectNone = document.createElement('button'); selectNone.textContent = '清空';
            selectNone.style.cssText = `border: none; background: none; color: #ef4444; cursor: pointer; font-size: 13px;`;
            selectNone.onclick = () => checkboxes.forEach(c => c.checked = false);

            leftActions.appendChild(selectAll); leftActions.appendChild(selectNone);

            const rightActions = document.createElement('div'); rightActions.style.gap = '12px'; rightActions.style.display = 'flex';
            const cancelBtn = this.createButton('取消', 'secondary'); cancelBtn.onclick = () => dialog.remove();
            const saveBtn = this.createButton('确认', 'primary');
            saveBtn.onclick = () => {
                const checked = checkboxes.filter(c => c.checked).map(c => c.value);
                onSave(checked);
                dialog.remove();
            };

            rightActions.appendChild(cancelBtn); rightActions.appendChild(saveBtn);
            footer.appendChild(leftActions); footer.appendChild(rightActions);

            content.appendChild(title); content.appendChild(listContainer); content.appendChild(footer);
            dialog.appendChild(content); document.body.appendChild(dialog);
            dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.remove(); });
        }

        renderHistoryList() {
            // 初始化选中记录集合
            if (!this.selectedHistoryIds) this.selectedHistoryIds = new Set();

            // 使用 DOM 方法清空容器，避免 innerHTML 被 CSP 阻止
            while (this.historyListContainer.firstChild) {
                this.historyListContainer.removeChild(this.historyListContainer.firstChild);
            }
            const history = HistoryManager.getHistory();
            console.log('[renderHistoryList] Rendering', history.length, 'items');

            if (history.length === 0) {
                // 使用 DOM 方法创建空状态提示
                const emptyMsg = document.createElement('div');
                emptyMsg.textContent = '暂无历史记录';
                emptyMsg.style.cssText = 'text-align:center; padding: 40px; color: #888;';
                this.historyListContainer.appendChild(emptyMsg);
                // 更新全选复选框状态
                if (this.selectAllCheckbox) this.selectAllCheckbox.checked = false;
                return;
            }

            history.forEach(item => {
                const el = document.createElement('div');
                el.style.cssText = `display: flex; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.5); border-radius: 12px; margin-bottom: 8px; border: 1px solid rgba(0,0,0,0.05); transition: all 0.2s;`;
                el.addEventListener('mouseover', () => el.style.background = 'rgba(255,255,255,0.8)');
                el.addEventListener('mouseout', () => el.style.background = 'rgba(255,255,255,0.5)');

                // 复选框
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = this.selectedHistoryIds.has(item.id);
                checkbox.style.cssText = `width: 16px; height: 16px; cursor: pointer; margin-right: 12px; accent-color: #3b82f6; flex-shrink: 0;`;
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    if (checkbox.checked) {
                        this.selectedHistoryIds.add(item.id);
                    } else {
                        this.selectedHistoryIds.delete(item.id);
                    }
                    this.updateSelectAllCheckbox();
                });
                checkbox.addEventListener('click', (e) => e.stopPropagation());

                const info = document.createElement('div');
                info.style.cssText = `flex: 1; cursor: pointer; padding-right: 10px; overflow: hidden;`;
                info.addEventListener('click', () => this.loadHistoryItem(item));

                const titleText = document.createElement('div');
                titleText.textContent = item.title;
                titleText.style.cssText = `font-weight: 500; font-size: 14px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;

                // 元数据行：平台链接 + 频道名称 + 时间
                const metaText = document.createElement('div');
                metaText.style.cssText = `font-size: 11px; color: #666; display: flex; align-items: center; gap: 4px; flex-wrap: wrap;`;

                // 平台图标和名称（点击跳转到原视频）
                const platformLink = document.createElement('a');
                platformLink.href = item.url || '#';
                platformLink.target = '_blank';
                platformLink.textContent = `${this.getPlatformIcon(item.platform)} ${item.platform}`;
                platformLink.style.cssText = `color: #3b82f6; text-decoration: none; cursor: pointer; transition: color 0.2s;`;
                platformLink.addEventListener('mouseover', () => platformLink.style.color = '#2563eb');
                platformLink.addEventListener('mouseout', () => platformLink.style.color = '#3b82f6');
                platformLink.addEventListener('click', (e) => e.stopPropagation());

                // 分隔符
                const sep1 = document.createElement('span');
                sep1.textContent = '·';
                sep1.style.color = '#999';

                // 频道名称
                const channelSpan = document.createElement('span');
                channelSpan.textContent = item.channelName || '未知频道';
                channelSpan.style.cssText = `color: #888; max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
                channelSpan.title = item.channelName || '未知频道';

                // 分隔符
                const sep2 = document.createElement('span');
                sep2.textContent = '·';
                sep2.style.color = '#999';

                // 时间
                const timeStr = new Date(item.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                const timeSpan = document.createElement('span');
                timeSpan.textContent = timeStr;

                metaText.appendChild(platformLink);
                metaText.appendChild(sep1);
                metaText.appendChild(channelSpan);
                metaText.appendChild(sep2);
                metaText.appendChild(timeSpan);

                info.appendChild(titleText); info.appendChild(metaText);

                const delBtn = document.createElement('button');
                delBtn.textContent = '✕';
                delBtn.style.cssText = `border: none; background: transparent; color: #999; cursor: pointer; padding: 8px; font-size: 14px; border-radius: 50%; transition: all 0.2s; flex-shrink: 0;`;
                delBtn.addEventListener('mouseover', () => { delBtn.style.background = 'rgba(244, 67, 54, 0.1)'; delBtn.style.color = '#ef4444'; });
                delBtn.addEventListener('mouseout', () => { delBtn.style.background = 'transparent'; delBtn.style.color = '#999'; });
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm('确定删除这条记录吗？')) {
                        HistoryManager.deleteRecord(item.id);
                        this.selectedHistoryIds.delete(item.id);
                        this.renderHistoryList();
                    }
                });

                el.appendChild(checkbox); el.appendChild(info); el.appendChild(delBtn);
                this.historyListContainer.appendChild(el);
            });

            // 更新全选复选框状态
            this.updateSelectAllCheckbox();
        }


        getPlatformIcon(platform) {
            if (platform === 'YOUTUBE') return '📺';
            if (platform === 'WECHAT') return '📰';
            if (platform === 'BILIBILI') return '🅱️';
            return '📄';
        }

        // 全选/取消全选历史记录
        toggleSelectAllHistory() {
            const history = HistoryManager.getHistory();
            if (!this.selectedHistoryIds) this.selectedHistoryIds = new Set();

            if (this.selectAllCheckbox.checked) {
                // 全选 - 清空后重新添加确保类型一致
                this.selectedHistoryIds.clear();
                history.forEach(item => this.selectedHistoryIds.add(item.id));
                console.log('[toggleSelectAllHistory] 全选:', this.selectedHistoryIds.size, '条记录', Array.from(this.selectedHistoryIds));
            } else {
                // 取消全选
                this.selectedHistoryIds.clear();
                console.log('[toggleSelectAllHistory] 取消全选');
            }
            this.renderHistoryList();
        }

        // 更新全选复选框状态
        updateSelectAllCheckbox() {
            if (!this.selectAllCheckbox) return;
            const history = HistoryManager.getHistory();
            if (history.length === 0) {
                this.selectAllCheckbox.checked = false;
                this.selectAllCheckbox.indeterminate = false;
            } else if (this.selectedHistoryIds.size === 0) {
                this.selectAllCheckbox.checked = false;
                this.selectAllCheckbox.indeterminate = false;
            } else if (this.selectedHistoryIds.size === history.length) {
                this.selectAllCheckbox.checked = true;
                this.selectAllCheckbox.indeterminate = false;
            } else {
                this.selectAllCheckbox.checked = false;
                this.selectAllCheckbox.indeterminate = true;
            }
        }

        // 处理导出历史记录
        async handleExportHistory() {
            console.log('[handleExportHistory] selectedHistoryIds:', this.selectedHistoryIds ? Array.from(this.selectedHistoryIds) : 'undefined');

            if (!this.selectedHistoryIds || this.selectedHistoryIds.size === 0) {
                this.showNotification('请先选择要导出的记录', 'error');
                return;
            }

            const history = HistoryManager.getHistory();
            console.log('[handleExportHistory] history ids:', history.map(item => item.id));

            const selectedRecords = history.filter(item => this.selectedHistoryIds.has(item.id));
            console.log('[handleExportHistory] selectedRecords:', selectedRecords.length);

            if (selectedRecords.length === 0) {
                this.showNotification('未找到选中的记录', 'error');
                return;
            }

            try {
                if (selectedRecords.length === 1) {
                    // 单条记录导出为MD文件
                    this.exportSingleRecord(selectedRecords[0]);
                } else {
                    // 多条记录打包为ZIP
                    console.log('[handleExportHistory] 准备导出', selectedRecords.length, '条记录为ZIP');
                    await this.exportMultipleRecords(selectedRecords);
                }
            } catch (e) {
                console.error('导出失败:', e);
                this.showNotification(`导出失败: ${e.message}`, 'error');
            }
        }

        // 生成单条记录的Markdown内容
        generateRecordMarkdown(record) {
            const platformName = {
                'YOUTUBE': 'YouTube',
                'WECHAT': '微信公众号',
                'BILIBILI': 'B站'
            }[record.platform] || record.platform;

            const timeStr = new Date(record.timestamp).toLocaleString('zh-CN');

            return `# ${record.title}

**平台：** ${platformName}
**作者：** ${record.channelName || '未知'}
**原文链接：** ${record.url || '无'}
**总结时间：** ${timeStr}

---

${record.summary}

---

*本内容由 船仓AI助手 生成，脚本：dub.sh/iytb*
`;
        }

        // 导出单条记录为MD文件
        exportSingleRecord(record) {
            const content = this.generateRecordMarkdown(record);
            const cleanTitle = record.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().substring(0, 50);
            const filename = `${cleanTitle}.md`;

            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            this.showNotification('已导出为MD文件', 'success');
        }

        // 批量导出多条记录为ZIP
        exportMultipleRecords(records) {
            console.log('[exportMultipleRecords] Starting export for', records.length, 'records');
            const self = this;

            if (typeof JSZip === 'undefined') {
                console.error('[exportMultipleRecords] JSZip is undefined');
                this.showNotification('ZIP库未加载，请刷新页面重试', 'error');
                return;
            }
            console.log('[exportMultipleRecords] JSZip is available, version:', JSZip.version);

            try {
                const zip = new JSZip();
                console.log('[exportMultipleRecords] JSZip instance created');
                const usedNames = new Set();

                records.forEach((record, index) => {
                    const content = this.generateRecordMarkdown(record);
                    let baseName = record.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().substring(0, 50);
                    if (!baseName) baseName = `记录_${index + 1}`;

                    // 确保文件名唯一
                    let filename = `${baseName}.md`;
                    let counter = 1;
                    while (usedNames.has(filename)) {
                        filename = `${baseName}_${counter}.md`;
                        counter++;
                    }
                    usedNames.add(filename);

                    zip.file(filename, content);
                    console.log('[exportMultipleRecords] Added file:', filename);
                });

                const dateStr = new Date().toISOString().slice(0, 10);
                const zipFilename = `船仓AI助手-历史记录-${dateStr}.zip`;
                console.log('[exportMultipleRecords] Generating ZIP:', zipFilename);

                // 使用 .then()/.catch() 而非 await
                const generatePromise = zip.generateAsync({ type: 'blob' });
                console.log('[exportMultipleRecords] generateAsync called, promise:', generatePromise);

                generatePromise.then(function (zipBlob) {
                    console.log('[exportMultipleRecords] ZIP blob created, size:', zipBlob.size);

                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(zipBlob);
                    link.download = zipFilename;
                    document.body.appendChild(link);
                    console.log('[exportMultipleRecords] Triggering download');
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(link.href);

                    self.showNotification(`已导出 ${records.length} 条记录为ZIP`, 'success');
                    console.log('[exportMultipleRecords] Export completed successfully');
                }).catch(function (e) {
                    console.error('[exportMultipleRecords] generateAsync error:', e);
                    self.showNotification(`ZIP生成失败: ${e.message}`, 'error');
                });

            } catch (e) {
                console.error('[exportMultipleRecords] Sync error:', e);
                this.showNotification(`导出失败: ${e.message}`, 'error');
            }
        }


        loadHistoryItem(item) {
            this.originalSummaryText = item.summary;
            while (this.summaryContent.firstChild) { this.summaryContent.removeChild(this.summaryContent.firstChild); }
            this.createFormattedContent(this.summaryContent, item.summary);
            this.summaryPanel.style.display = 'block';
            setTimeout(() => this.updateSummaryContentHeight(), 50); // 动态调整高度
            this.updateStatus('已加载历史记录', 'success');
            // 更新标题
            if (this.contentController) {
                this.contentController.translatedTitle = item.title;
            }
            // 关闭历史面板
            this.toggleHistoryPanel();
            // 不自动滚动，或者滚动到顶部
            this.summaryPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // 重置发布状态
            this.currentPublishedIdentifier = null;
            if (this.publishedUrlContainer) this.publishedUrlContainer.style.display = 'none';

            // 更新发布按钮可见性（确保在所有平台都能正确显示）
            if (this.publishButton) {
                this.publishButton.style.display = CONFIG.PUBLISH_MARKDOWN?.ENABLED ? 'block' : 'none';
            }
        }
        // ++ 请用下面这整块新代码，替换掉原来的 toggleCollapse() 函数 ++
        toggleCollapse() {
            this.isCollapsed = !this.isCollapsed;

            if (this.isCollapsed) {
                // --- 执行收起操作 ---
                this.mainContent.style.display = 'none';
                this.toggleButton.textContent = '↓';

                // 隐藏标题和设置按钮
                this.titleElement.style.display = 'none';
                this.configButton.style.display = 'none';
                if (this.historyButton) this.historyButton.style.display = 'none';
                if (this.leftResizeHandle) this.leftResizeHandle.style.display = 'none'; // 隐藏左侧调整手柄

                // 将主容器和顶部栏变得透明且无边框
                this.container.style.background = 'transparent';
                this.container.style.boxShadow = 'none';
                this.container.style.backdropFilter = 'none';
                this.container.style.border = 'none';
                this.container.style.padding = '0';
                this.container.style.width = 'auto'; // 宽度自适应
                this.container.style.minWidth = '0';

                this.topBar.style.padding = '0';
                this.topBar.style.background = 'transparent';
                this.topBar.style.justifyContent = 'flex-end'; // 让按钮靠右

                // 将收起按钮美化成一个独立的浅色磨砂质感按钮
                this.toggleButton.style.background = 'rgba(255, 255, 255, 0.85)';
                this.toggleButton.style.backdropFilter = 'blur(20px) saturate(180%)';
                this.toggleButton.style.border = '1px solid rgba(0, 0, 0, 0.1)';
                this.toggleButton.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.1)';
                this.toggleButton.style.borderRadius = '50%';
                this.toggleButton.style.width = '40px';
                this.toggleButton.style.height = '40px';
                this.toggleButton.style.padding = '0';
                this.toggleButton.style.fontSize = '22px';
                this.toggleButton.style.color = '#3b82f6';
                this.toggleButton.style.cursor = 'grab';
                this.toggleButton.style.animation = 'pulse 2s ease-in-out infinite';

                // 添加呼吸动画样式
                if (!document.getElementById('cchelper-animations')) {
                    const style = document.createElement('style');
                    style.id = 'cchelper-animations';
                    style.textContent = `
                        @keyframes pulse {
                            0%, 100% { transform: scale(1); box-shadow: 0 8px 32px 0 rgba(59, 130, 246, 0.2); }
                            50% { transform: scale(1.05); box-shadow: 0 8px 40px 0 rgba(59, 130, 246, 0.35); }
                        }
                    `;
                    document.head.appendChild(style);
                }

            } else {
                // --- 执行展开操作 ---
                // 如果处于边缘隐藏模式，先退出
                if (this.isEdgeHidden) {
                    this.exitEdgeHiddenMode();
                }

                this.mainContent.style.display = 'block';

                // 显示标题和设置按钮
                this.titleElement.style.display = 'block';
                this.configButton.style.display = 'block';
                if (this.historyButton) this.historyButton.style.display = 'block';
                if (this.leftResizeHandle) this.leftResizeHandle.style.display = 'block'; // 显示左侧调整手柄

                // 恢复主容器的原始样式
                const defaultWidth = this.platform === 'BILIBILI' ? '453px' : '420px';
                this.container.style.cssText = `position: fixed; top: 80px; right: 20px; width: ${defaultWidth}; min-width: 350px; max-width: 90vw; background: rgba(255, 255, 255, 0.75); border-radius: 16px; padding: 0; color: #1f2937; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; z-index: 9999; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(0, 0, 0, 0.1);`;

                // 恢复顶部栏的原始样式
                this.topBar.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; cursor: move; background: rgba(255, 255, 255, 0.5); border-radius: 16px 16px 0 0; backdrop-filter: blur(10px);`;

                // 恢复展开/收起按钮的原始样式
                this.toggleButton.style.cssText = `background: rgba(59, 130, 246, 0.1); border: none; color: #3b82f6; cursor: pointer; padding: 8px; font-size: 14px; border-radius: 8px; transition: all 0.2s ease; backdrop-filter: blur(10px); pointer-events: auto;`;
                this.toggleButton.textContent = '↑'; // cssText会覆盖内容, 所以需要重新设置
            }
        }
        toggleConfigPanel() { if (!this.configPanel || !document.body.contains(this.configPanel)) this.createConfigPanel(); const isVisible = this.configPanel.style.display === 'block'; this.configPanel.style.display = isVisible ? 'none' : 'block'; }
        updateStatus(message, type = 'info') {
            // Updated to use the Summary Button for status feedback
            if (!this.summaryButton) return;

            this.summaryButton.textContent = message;

            // Optional: Change button style based on state
            if (type === 'info') {
                // Loading state is usually handled by 'disabled' in the caller, but we can add an icon or pulse here if we wanted
            } else if (type === 'success') {
                setTimeout(() => {
                    this.summaryButton.textContent = this.summaryButton.dataset.originalText || '🤖 生成总结';
                    this.summaryButton.disabled = false;
                }, 3000);
            } else if (type === 'error') {
                // Keep error message longer or until click
                setTimeout(() => {
                    this.summaryButton.textContent = this.summaryButton.dataset.originalText || '🤖 生成总结';
                    this.summaryButton.disabled = false;
                }, 5000);
            }
        }
        showNotification(message, type = 'info') {
            const n = document.createElement('div'); n.textContent = message; const c = { 'info': '#2196F3', 'success': '#4CAF50', 'error': '#F44336' };
            n.style.cssText = `position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: ${c[type] || c['info']}; color: #fff; padding: 12px 24px; border-radius: 8px; font-size: 14px; z-index: 200000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); opacity: 0; transition: all 0.3s;`;
            document.body.appendChild(n); setTimeout(() => { n.style.opacity = '1'; }, 10);
            setTimeout(() => { n.style.opacity = '0'; setTimeout(() => n.remove(), 300); }, 3000);
        }
        showExtensionPrompt() { if (confirm('无法获取字幕。建议安装 YouTube Text Tools 扩展以获得更好支持。是否前往安装？')) { window.open('https://chromewebstore.google.com/detail/youtube-text-tools/pcmahconeajhpgleboodnodllkoimcoi', '_blank'); } }
        async handleLoadContent() {
            try {
                this.updateStatus('正在加载内容...', 'info'); this.loadContentButton.disabled = true;
                await this.contentController.loadContent();
                const count = this.contentController.mainContent.split('\n').length;
                const successMessage = this.platform === 'YOUTUBE' ? `字幕加载完成，共 ${count} 条` : '文章提取完成';
                this.updateStatus(successMessage, 'success');
                this.loadContentButton.style.display = 'none';
                // Toggle the new flex row instead of individual elements
                if (this.actionRow) {
                    this.actionRow.style.display = 'flex';
                }
                // Fallback for safety if old props are accessed elsewhere (though we removed them)
                if (this.mainPromptGroup) this.mainPromptGroup.style.display = 'block';
                if (this.summaryButton) this.summaryButton.style.display = 'block';
            } catch (e) {
                this.updateStatus('加载内容失败: ' + e.message, 'error');
                if (this.platform === 'YOUTUBE' && e.message.toLowerCase().includes('字幕')) { setTimeout(() => this.showExtensionPrompt(), 1500); }
            } finally { this.loadContentButton.disabled = false; }
        }
        async handleGenerateSummary() {
            try {
                this.updateStatus('正在生成总结...', 'info'); this.summaryButton.disabled = true;
                const summary = await this.contentController.getSummary();
                if (!summary || summary.trim() === '') throw new Error('生成的总结为空');
                this.originalSummaryText = summary;
                while (this.summaryContent.firstChild) { this.summaryContent.removeChild(this.summaryContent.firstChild); }
                this.createFormattedContent(this.summaryContent, summary);
                this.summaryPanel.style.display = 'block'; this.updateStatus('总结生成完成', 'success');
                setTimeout(() => this.updateSummaryContentHeight(), 50); // 动态调整高度
                this.summaryPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // 重置发布状态
                this.currentPublishedIdentifier = null;
                if (this.publishedUrlContainer) {
                    this.publishedUrlContainer.style.display = 'none';
                }
                // 更新发布按钮可见性
                if (this.publishButton) {
                    this.publishButton.style.display = CONFIG.PUBLISH_MARKDOWN?.ENABLED ? 'block' : 'none';
                }

                // 保存到历史记录
                const historyRecord = {
                    id: this.contentController.getContentId(),
                    title: this.contentController.translatedTitle || this.contentController.getContentTitle(),
                    url: window.location.href,
                    summary: summary,
                    platform: this.platform,
                    channelName: this.contentController.getChannelName()
                };
                console.log('[handleGenerateSummary] About to save history record:', historyRecord);
                try {
                    HistoryManager.addRecord(historyRecord);
                    this.showNotification('历史记录已保存', 'success');
                } catch (historyErr) {
                    console.error('[handleGenerateSummary] History save error:', historyErr);
                    this.showNotification('历史记录保存失败: ' + historyErr.message, 'error');
                }
            } catch (e) {
                this.updateStatus(`生成总结失败: ${e.message}`, 'error'); this.showNotification(`生成总结失败: ${e.message}`, 'error');
            } finally { this.summaryButton.disabled = false; }
        }
        async handlePublishMarkdown(customIdentifier = null) {
            if (!CONFIG.PUBLISH_MARKDOWN?.ENABLED || !CONFIG.PUBLISH_MARKDOWN?.API_KEY) {
                this.showNotification('请先在设置中启用并配置 PublishMarkdown API Key', 'error');
                return;
            }
            const textToPublish = this.originalSummaryText || this.summaryContent.textContent;
            if (!textToPublish || textToPublish.trim() === '') {
                this.showNotification('没有可发布的内容', 'error');
                return;
            }
            const title = this.contentController.translatedTitle || this.contentController.getContentTitle();
            const id = this.contentController.getContentId();
            const markdownContent = `# ${title}\n\n**原文链接：** ${window.location.href}\n**ID：** ${id}\n**总结时间：** ${new Date().toLocaleString('zh-CN')}\n\n---\n\n## 内容总结\n\n${textToPublish}\n\n---\n\n*本总结由 船仓AI助手 生成，脚本：dub.sh/iytb*`;

            this.publishButton.disabled = true;
            this.publishButton.textContent = '发布中...';

            try {
                const isUpdate = this.currentPublishedIdentifier && customIdentifier;
                const apiUrl = isUpdate
                    ? `https://publishmarkdown.com/v1/api/markdown/${this.currentPublishedIdentifier}`
                    : 'https://publishmarkdown.com/v1/api/markdown';
                const method = isUpdate ? 'PUT' : 'POST';

                const requestBody = { content: markdownContent };
                if (customIdentifier) {
                    requestBody.identifier = customIdentifier;
                }

                const response = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: method,
                        url: apiUrl,
                        headers: {
                            'Content-Type': 'application/json',
                            'api-key': CONFIG.PUBLISH_MARKDOWN.API_KEY
                        },
                        data: JSON.stringify(requestBody),
                        onload: function (res) {
                            try {
                                const data = JSON.parse(res.responseText);
                                if (res.status >= 200 && res.status < 300 && data.status === 'success') {
                                    resolve(data);
                                } else {
                                    reject(new Error(data.message || `HTTP ${res.status}`));
                                }
                            } catch (e) {
                                reject(new Error('解析响应失败'));
                            }
                        },
                        onerror: function (err) {
                            reject(new Error('网络请求失败'));
                        },
                        ontimeout: function () {
                            reject(new Error('请求超时'));
                        }
                    });
                });

                // 成功发布
                const publishedUrl = response.data.url;
                this.currentPublishedIdentifier = response.data.identifier;
                this.publishedUrlLink.href = publishedUrl;
                this.publishedUrlLink.textContent = publishedUrl;
                this.publishedUrlContainer.style.display = 'block';
                this.showNotification(isUpdate ? 'URL已更新' : '发布成功！', 'success');

            } catch (e) {
                this.showNotification(`发布失败: ${e.message}`, 'error');
            } finally {
                this.publishButton.disabled = false;
                this.publishButton.textContent = '📤 发布';
            }
        }
        showEditIdentifierDialog() {
            const dialog = document.createElement('div'); dialog.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); z-index: 100000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);`;
            const dialogContent = document.createElement('div'); dialogContent.style.cssText = `background: rgba(255, 255, 255, 0.92); border-radius: 16px; padding: 24px; width: 400px; max-width: 90vw; color: #1f2937; backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(0, 0, 0, 0.1); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);`;
            const dialogTitle = document.createElement('h3'); dialogTitle.textContent = '✏️ 编辑自定义URL'; dialogTitle.style.cssText = `margin: 0 0 16px 0; color: #1f2937;`;
            const helpText = document.createElement('p'); helpText.textContent = '输入新的URL标识符，发布后URL将变为：'; helpText.style.cssText = `font-size: 13px; color: #666; margin-bottom: 8px;`;
            const previewUrl = document.createElement('code'); previewUrl.style.cssText = `display: block; font-size: 12px; color: #c83232; background: rgba(200, 50, 50, 0.1); padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; word-break: break-all;`;
            previewUrl.textContent = `https://publishmarkdown.com/${this.currentPublishedIdentifier || 'your-identifier'}`;
            const identifierInput = this.createInput(this.currentPublishedIdentifier || '', null, 'text', '输入自定义标识符 (如: my-article)');
            identifierInput.addEventListener('input', () => {
                previewUrl.textContent = `https://publishmarkdown.com/${identifierInput.value || 'your-identifier'}`;
            });
            const buttonContainer = document.createElement('div'); buttonContainer.style.cssText = `display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;`;
            const cancelBtn = this.createButton('取消', 'secondary'); cancelBtn.addEventListener('click', () => dialog.remove());
            const saveBtn = this.createButton('重新发布', 'primary');
            saveBtn.style.background = '#c83232';
            saveBtn.addEventListener('click', async () => {
                const newIdentifier = identifierInput.value.trim();
                if (!newIdentifier) {
                    this.showNotification('请输入有效的标识符', 'error');
                    return;
                }
                dialog.remove();
                await this.handlePublishMarkdown(newIdentifier);
            });
            buttonContainer.appendChild(cancelBtn); buttonContainer.appendChild(saveBtn);
            dialogContent.appendChild(dialogTitle); dialogContent.appendChild(helpText); dialogContent.appendChild(previewUrl);
            dialogContent.appendChild(this.createFormGroup('新标识符', identifierInput)); dialogContent.appendChild(buttonContainer);
            dialog.appendChild(dialogContent); document.body.appendChild(dialog);
            dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.remove(); });
        }
        updateTitleWithModel() {
            const c = CONFIG.AI_MODELS[CONFIG.AI_MODELS.TYPE];
            if (!this.titleElement) return;

            this.titleElement.textContent = ''; // Clear previous content safely

            const titleSpan = document.createElement('span');
            titleSpan.textContent = '💡 船仓AI助手';
            this.titleElement.appendChild(titleSpan);

            if (c) {
                // Spacer
                const spacer = document.createElement('span');
                spacer.textContent = ' ';
                spacer.style.margin = '0 4px';
                this.titleElement.appendChild(spacer);

                if (c.AVAILABLE_MODELS && Array.isArray(c.AVAILABLE_MODELS) && c.AVAILABLE_MODELS.length > 0) {
                    // Create Minimal Dropdown
                    const select = document.createElement('select');
                    select.style.cssText = `border: none; background: transparent; font-weight: 600; font-size: 15px; color: inherit; cursor: pointer; outline: none; appearance: none; -webkit-appearance: none; padding-right: 18px; max-width: 150px; text-overflow: ellipsis;`;

                    // Match current model
                    let currentModel = c.MODEL;
                    const models = [...c.AVAILABLE_MODELS];
                    if (currentModel && !models.includes(currentModel)) {
                        models.unshift(currentModel);
                    }

                    models.forEach(m => {
                        const option = document.createElement('option');
                        option.value = m;
                        option.textContent = m;
                        if (m === currentModel) option.selected = true;
                        select.appendChild(option);
                    });

                    // Custom Arrow
                    select.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5L6 8L9.5 4.5' stroke='%23333' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;
                    select.style.backgroundRepeat = 'no-repeat';
                    select.style.backgroundPosition = 'right center';

                    select.addEventListener('change', (e) => {
                        c.MODEL = e.target.value;
                        ConfigManager.saveConfig(CONFIG);
                        select.blur(); // Remove focus
                        this.showNotification(`已切换模型为: ${c.MODEL}`, 'success');
                    });

                    // Hover effect
                    select.addEventListener('mouseenter', () => select.style.opacity = '0.7');
                    select.addEventListener('mouseleave', () => select.style.opacity = '1');

                    this.titleElement.appendChild(select);
                } else {
                    // Static Text
                    const modelSpan = document.createElement('span');
                    modelSpan.textContent = c.MODEL || '未选模型';
                    this.titleElement.appendChild(modelSpan);
                }
            } else {
                const modelSpan = document.createElement('span');
                modelSpan.textContent = ' - AI模型';
                this.titleElement.appendChild(modelSpan);
            }
        }

        getCurrentThemeStyles() {
            const themeKey = (CONFIG.APPEARANCE && CONFIG.APPEARANCE.THEME) || 'default';
            return (THEMES[themeKey] || THEMES['default']).styles;
        }

        createFormattedContent(container, text) {
            while (container.firstChild) { container.removeChild(container.firstChild); }

            // 预处理：将 <br> 和 <br/> 转换为换行符
            text = text.replace(/<br\s*\/?>/gi, '\n');

            // 预处理代码块：将多行代码块转换为特殊标记
            const processedText = this.preprocessCodeBlocks(text);
            const lines = processedText.split('\n');
            let currentList = null;
            let listType = null;
            let isFirstH1 = true;
            let tableRows = []; // 用于收集表格行
            let inTable = false;

            const closeList = () => { if (currentList) { container.appendChild(currentList); currentList = null; listType = null; } };

            const closeTable = () => {
                if (tableRows.length > 0) {
                    const table = document.createElement('table');
                    const styles = this.getCurrentThemeStyles();
                    table.style.cssText = `width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 13px;`;

                    // 检测分隔行的函数：匹配只包含 |、-、:、空格的行
                    const isSeparatorRow = (row) => /^\|[\s\-:|]+\|$/.test(row) && row.includes('-');

                    // 过滤掉分隔行，获取实际数据行
                    const dataRows = tableRows.filter(row => !isSeparatorRow(row));

                    dataRows.forEach((row, rowIndex) => {
                        const tr = document.createElement('tr');
                        const cells = row.split('|').filter((cell, i, arr) => i > 0 && i < arr.length - 1);

                        cells.forEach(cellText => {
                            const cell = document.createElement(rowIndex === 0 ? 'th' : 'td');
                            // 处理单元格内的 <br> 标签
                            const cleanedText = cellText.trim().replace(/<br\s*\/?>/gi, '\n');
                            // 使用 parseInlineFormatting 处理单元格内容，支持粗体、斜体等
                            this.parseTableCellContent(cell, cleanedText);
                            cell.style.cssText = rowIndex === 0 ? styles.th : styles.td;
                            tr.appendChild(cell);
                        });
                        table.appendChild(tr);
                    });

                    container.appendChild(table);
                    tableRows = [];
                    inTable = false;
                }
            };

            const styles = this.getCurrentThemeStyles();

            lines.forEach((line, lineIndex) => {
                const trimmedLine = line.trim();

                // 检测表格行 (以 | 开头和结尾)
                if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
                    closeList();
                    inTable = true;
                    tableRows.push(trimmedLine);
                    return;
                } else if (inTable) {
                    // 表格结束
                    closeTable();
                }

                // 分隔线 - 使用渐变效果
                if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
                    closeList();
                    const hr = document.createElement('hr');
                    hr.style.cssText = styles.hr;
                    container.appendChild(hr);
                }
                // 引用块 - 红色主题
                else if (trimmedLine.startsWith('> ')) {
                    closeList();
                    const blockquote = document.createElement('blockquote');
                    blockquote.style.cssText = styles.blockquote;
                    this.parseInlineFormatting(blockquote, trimmedLine.substring(2));
                    container.appendChild(blockquote);
                }
                // 六级标题
                else if (trimmedLine.startsWith('###### ')) {
                    closeList();
                    const h = document.createElement('h6');
                    this.parseInlineFormatting(h, trimmedLine.substring(7));
                    h.style.cssText = styles.h6;
                    container.appendChild(h);
                }
                // 五级标题
                else if (trimmedLine.startsWith('##### ')) {
                    closeList();
                    const h = document.createElement('h5');
                    this.parseInlineFormatting(h, trimmedLine.substring(6));
                    h.style.cssText = styles.h5;
                    container.appendChild(h);
                }
                // 四级标题
                else if (trimmedLine.startsWith('#### ')) {
                    closeList();
                    const h = document.createElement('h4');
                    this.parseInlineFormatting(h, trimmedLine.substring(5));
                    h.style.cssText = styles.h4;
                    container.appendChild(h);
                }
                // 三级标题
                else if (trimmedLine.startsWith('### ')) {
                    closeList();
                    const h = document.createElement('h3');
                    this.parseInlineFormatting(h, trimmedLine.substring(4));
                    h.style.cssText = styles.h3;
                    container.appendChild(h);
                }
                // 二级标题 - 带红色下划线
                else if (trimmedLine.startsWith('## ')) {
                    closeList();
                    const h = document.createElement('h2');
                    this.parseInlineFormatting(h, trimmedLine.substring(3));
                    h.style.cssText = styles.h2;
                    container.appendChild(h);
                }
                // 一级标题 - 红色顶部条+背景 (首个h1特殊样式)
                else if (trimmedLine.startsWith('# ')) {
                    closeList();
                    const h = document.createElement('h1');
                    this.parseInlineFormatting(h, trimmedLine.substring(2));
                    if (isFirstH1) {
                        h.style.cssText = styles.h1.first;
                        isFirstH1 = false;
                    } else {
                        h.style.cssText = styles.h1.normal;
                    }
                    container.appendChild(h);
                }
                // 代码块（预处理后的标记）
                else if (trimmedLine.startsWith('___CODEBLOCK___')) {
                    closeList();
                    const codeData = trimmedLine.substring(15); // 移除标记前缀
                    const langMatch = codeData.match(/^LANG:(.*?):::/);
                    const lang = langMatch ? langMatch[1] : '';
                    const codeContent = langMatch ? codeData.substring(langMatch[0].length) : codeData;

                    const pre = document.createElement('pre');
                    pre.style.cssText = styles.pre;
                    const code = document.createElement('code');
                    code.textContent = codeContent.replace(/___NEWLINE___/g, '\n');
                    code.style.cssText = styles.code_block;
                    if (lang) {
                        const langLabel = document.createElement('div');
                        langLabel.textContent = lang;
                        langLabel.style.cssText = `font-size: 11px; color: #888; margin-bottom: 8px; font-family: -apple-system, sans-serif;`;
                        pre.appendChild(langLabel);
                    }
                    pre.appendChild(code);
                    container.appendChild(pre);
                }
                // 任务列表 - 未完成
                else if (trimmedLine.startsWith('- [ ] ') || trimmedLine.startsWith('* [ ] ')) {
                    if (listType !== 'task') { closeList(); currentList = document.createElement('ul'); listType = 'task'; currentList.style.cssText = `padding-left: 0; margin: 1em 0; list-style-type: none;`; }
                    const li = document.createElement('li');
                    li.style.cssText = styles.li + ` display: flex; align-items: flex-start; gap: 8px;`;
                    const checkbox = document.createElement('span');
                    checkbox.textContent = '☐';
                    checkbox.style.cssText = styles.checkbox_unchecked;
                    li.appendChild(checkbox);
                    const textSpan = document.createElement('span');
                    this.parseInlineFormatting(textSpan, trimmedLine.substring(6));
                    li.appendChild(textSpan);
                    currentList.appendChild(li);
                }
                // 任务列表 - 已完成
                else if (trimmedLine.startsWith('- [x] ') || trimmedLine.startsWith('- [X] ') || trimmedLine.startsWith('* [x] ') || trimmedLine.startsWith('* [X] ')) {
                    if (listType !== 'task') { closeList(); currentList = document.createElement('ul'); listType = 'task'; currentList.style.cssText = `padding-left: 0; margin: 1em 0; list-style-type: none;`; }
                    const li = document.createElement('li');
                    li.style.cssText = styles.li + ` display: flex; align-items: flex-start; gap: 8px; text-decoration: line-through; opacity: 0.8;`;
                    const checkbox = document.createElement('span');
                    checkbox.textContent = '☑';
                    checkbox.style.cssText = styles.checkbox_checked;
                    li.appendChild(checkbox);
                    const textSpan = document.createElement('span');
                    this.parseInlineFormatting(textSpan, trimmedLine.substring(6));
                    li.appendChild(textSpan);
                    currentList.appendChild(li);
                }
                // 无序列表
                else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                    if (listType !== 'ul') { closeList(); currentList = document.createElement('ul'); listType = 'ul'; currentList.style.cssText = styles.ul; }
                    const li = document.createElement('li');
                    li.style.cssText = styles.li;
                    this.parseInlineFormatting(li, trimmedLine.substring(2));
                    currentList.appendChild(li);
                }
                // 有序列表
                else if (trimmedLine.match(/^\d+\.\s/)) {
                    if (listType !== 'ol') { closeList(); currentList = document.createElement('ol'); listType = 'ol'; currentList.style.cssText = styles.ol; }
                    const li = document.createElement('li');
                    li.style.cssText = styles.li;
                    this.parseInlineFormatting(li, trimmedLine.replace(/^\d+\.\s/, ''));
                    currentList.appendChild(li);
                }
                // 普通段落
                else if (trimmedLine) {
                    closeList();
                    const p = document.createElement('p');
                    p.style.cssText = styles.p;
                    this.parseInlineFormatting(p, trimmedLine);
                    container.appendChild(p);
                }
            });
            closeList();
            closeTable(); // 确保最后的表格被渲染
        }
        parseInlineFormatting(element, text) {
            const styles = this.getCurrentThemeStyles();
            // 扩展正则匹配：粗体、斜体、行内代码、链接、删除线
            const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\)|~~.*?~~)/g);
            parts.forEach(part => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    const s = document.createElement('strong');
                    s.textContent = part.slice(2, -2);
                    s.style.cssText = styles.strong;
                    element.appendChild(s);
                }
                else if (part.startsWith('~~') && part.endsWith('~~')) {
                    // 删除线
                    const s = document.createElement('span');
                    s.textContent = part.slice(2, -2);
                    s.style.cssText = styles.del;
                    element.appendChild(s);
                }
                else if (part.startsWith('*') && part.endsWith('*')) {
                    const em = document.createElement('em');
                    em.textContent = part.slice(1, -1);
                    em.style.cssText = styles.em;
                    element.appendChild(em);
                }
                else if (part.startsWith('`') && part.endsWith('`')) {
                    const c = document.createElement('code');
                    c.textContent = part.slice(1, -1);
                    c.style.cssText = styles.code; // Use inline code style
                    element.appendChild(c);
                }
                else if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
                    // 链接处理
                    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
                    if (linkMatch) {
                        const a = document.createElement('a');
                        a.textContent = linkMatch[1];
                        a.href = linkMatch[2];
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                        a.style.cssText = styles.link;
                        element.appendChild(a);
                    } else {
                        element.appendChild(document.createTextNode(part));
                    }
                }
                else { element.appendChild(document.createTextNode(part)); }
            });
        }
        // 预处理代码块：将 ``` 包裹的多行代码块转换为单行标记
        preprocessCodeBlocks(text) {
            const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
            return text.replace(codeBlockRegex, (match, lang, code) => {
                // 将代码内容中的换行符转换为特殊标记，便于单行处理
                const escapedCode = code.replace(/\n/g, '___NEWLINE___').trim();
                return `___CODEBLOCK___LANG:${lang}:::${escapedCode}`;
            });
        }
        // 处理表格单元格内容，支持换行和内联格式
        parseTableCellContent(cell, text) {
            // 按换行符分割
            const lines = text.split('\n');
            lines.forEach((line, index) => {
                // 对每一行应用内联格式
                this.parseInlineFormatting(cell, line);
                // 如果不是最后一行，添加换行元素
                if (index < lines.length - 1) {
                    cell.appendChild(document.createElement('br'));
                }
            });
        }
        makeDraggable(element) {
            let isDragging = false, startX, startY, currentX = 0, currentY = 0;

            // 整个面板的拖拽（展开状态时）
            element.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
                if (this.isCollapsed) return; // 收起状态时不允许通过顶部栏拖拽
                isDragging = true;
                startX = e.clientX - currentX;
                startY = e.clientY - currentY;
                this.container.style.transition = 'none';
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                e.preventDefault();
                currentX = e.clientX - startX;
                currentY = e.clientY - startY;
                this.container.style.transform = `translate(${currentX}px, ${currentY}px)`;
            });

            document.addEventListener('mouseup', () => {
                if (!isDragging) return;
                isDragging = false;
                this.container.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            });

            // 设置收起状态图标的独立拖动功能
            this.setupCollapsedIconDrag();
        }

        setupCollapsedIconDrag() {
            let isDragging = false, startX, startY;
            this.iconX = window.innerWidth - 60; // 图标初始X位置
            this.iconY = 80; // 图标初始Y位置
            this.isEdgeHidden = false;

            // 图标的拖拽
            this.toggleButton.addEventListener('mousedown', (e) => {
                if (!this.isCollapsed) return; // 只在收起状态时可拖动
                e.stopPropagation();
                isDragging = true;
                startX = e.clientX - this.iconX;
                startY = e.clientY - this.iconY;
                this.toggleButton.style.transition = 'none';
                this.toggleButton.style.animation = 'none'; // 拖拽时暂停呼吸动画
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging || !this.isCollapsed) return;
                e.preventDefault();
                this.iconX = e.clientX - startX;
                this.iconY = e.clientY - startY;

                // 限制在屏幕范围内
                this.iconX = Math.max(0, Math.min(this.iconX, window.innerWidth - 40));
                this.iconY = Math.max(0, Math.min(this.iconY, window.innerHeight - 40));

                this.container.style.cssText = `position: fixed; top: ${this.iconY}px; left: ${this.iconX}px; right: auto; width: auto; min-width: 0; background: transparent; box-shadow: none; backdrop-filter: none; border: none; padding: 0; z-index: 9999;`;
            });

            document.addEventListener('mouseup', (e) => {
                if (!isDragging || !this.isCollapsed) return;
                isDragging = false;
                this.toggleButton.style.transition = 'all 0.3s ease';

                // 检测是否拖到右边缘
                if (this.iconX > window.innerWidth - 60) {
                    this.enterEdgeHiddenMode();
                } else {
                    this.toggleButton.style.animation = 'pulse 2s ease-in-out infinite';
                }
            });

            // 创建边缘触发区域用于唤醒
            this.createEdgeTriggerZone();
        }

        createEdgeTriggerZone() {
            this.edgeTriggerZone = document.createElement('div');
            this.edgeTriggerZone.style.cssText = `position: fixed; top: 0; right: 0; width: 20px; height: 100%; z-index: 9998; background: transparent; display: none;`;
            document.body.appendChild(this.edgeTriggerZone);

            // 鼠标进入边缘区域时唤醒图标
            this.edgeTriggerZone.addEventListener('mouseenter', () => {
                if (this.isEdgeHidden) {
                    this.showFromEdge();
                }
            });
        }

        enterEdgeHiddenMode() {
            this.isEdgeHidden = true;
            this.savedIconY = this.iconY;

            // 将图标移动到右边缘外，只露出一小部分
            this.iconX = window.innerWidth - 15;
            this.container.style.cssText = `position: fixed; top: ${this.iconY}px; left: ${this.iconX}px; right: auto; width: auto; min-width: 0; background: transparent; box-shadow: none; backdrop-filter: none; border: none; padding: 0; z-index: 9999; transition: all 0.3s ease;`;
            this.toggleButton.style.opacity = '0.5';
            this.toggleButton.style.animation = 'none';

            // 显示边缘触发区域
            this.edgeTriggerZone.style.display = 'block';
        }

        showFromEdge() {
            // 从边缘滑出显示
            this.iconX = window.innerWidth - 50;
            this.container.style.cssText = `position: fixed; top: ${this.iconY}px; left: ${this.iconX}px; right: auto; width: auto; min-width: 0; background: transparent; box-shadow: none; backdrop-filter: none; border: none; padding: 0; z-index: 9999; transition: all 0.3s ease;`;
            this.toggleButton.style.opacity = '1';
            this.toggleButton.style.animation = 'pulse 2s ease-in-out infinite';

            // 鼠标离开图标时判断是否需要重新隐藏
            const hideHandler = () => {
                if (this.isEdgeHidden && !this.container.matches(':hover')) {
                    setTimeout(() => {
                        if (this.isEdgeHidden && !this.container.matches(':hover')) {
                            this.iconX = window.innerWidth - 15;
                            this.container.style.left = `${this.iconX}px`;
                            this.toggleButton.style.opacity = '0.5';
                            this.toggleButton.style.animation = 'none';
                        }
                    }, 500);
                }
            };

            this.container.addEventListener('mouseleave', hideHandler, { once: true });
        }

        exitEdgeHiddenMode() {
            this.isEdgeHidden = false;
            this.toggleButton.style.opacity = '1';
            this.edgeTriggerZone.style.display = 'none';
        }
        // ++ 在 makeDraggable() 函数结束后，粘贴下面所有代码 ++
        handleFullscreenChange() {
            // 检查当前是否有元素处于全屏状态
            const isFullscreen = !!document.fullscreenElement;

            // 如果进入全屏，则隐藏脚本容器；如果退出全屏，则显示它
            if (isFullscreen) {
                this.container.style.display = 'none';
            } else {
                this.container.style.display = 'block';
            }
        }
        attachEventListeners() {
            let lastUrl = location.href;
            document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
            new MutationObserver(() => {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    if (this.container && this.container.parentNode) { this.container.remove(); }
                    if (PageManager.isYouTube(lastUrl) || PageManager.isWeChat(lastUrl) || PageManager.isBilibili(lastUrl)) {
                        initializeApp();
                    }
                }
            }).observe(document.body, { childList: true, subtree: true });
        }
    }

    function getUid() {
        const platform = PageManager.getCurrentPlatform();
        if (platform === 'YOUTUBE') return new URL(window.location.href).searchParams.get('v') || 'unknown_video';
        if (platform === 'WECHAT') { const m = window.location.href.match(/__biz=([^&]+)&mid=([^&]+)/); if (m) return `${m[1]}_${m[2]}`; return 'unknown_article'; }
        return 'unknown';
    }

    function initializeApp() {
        if (!PageManager.isYouTube() && !PageManager.isWeChat() && !PageManager.isBilibili()) return;
        console.log(`🚀 船仓AI助手 初始化 on ${PageManager.getCurrentPlatform()}...`);
        const contentController = new ContentController();
        new UIManager(contentController);
        console.log('✅ 船仓AI助手 初始化完成');
    }

    // --- 应用启动 ---
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initializeApp();
    } else {
        document.addEventListener('DOMContentLoaded', initializeApp);
    }
})();