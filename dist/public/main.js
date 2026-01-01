'use strict';
{
  const { h } = HFS;
  const pluginConfig = HFS.getPluginConfig?.() || {};
  const audioExts = ['mp3', 'flac', 'wav', 'ape', 'aac', 'ogg', 'm4a', 'alac', 'dsf', 'dsd', 'aif', 'aiff'];
  const videoExts = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'mpeg', 'mpg', 'wmv', 'rmvb', 'rm', 'dat', 'ts', 'vob', 'flv'];
  
  // ========== 集中配置參數 ==========
  const CONFIG = {
    // 懶加載配置
    LAZY_LOAD: {
      ENABLED: true,                     // 啟用懶加載功能
      INITIAL_DELAY: 1000,               // 初始延遲（毫秒），等待頁面基本加載完成
      LIST_STABLE_CHECK_INTERVAL: 500,   // 列表穩定檢查間隔（毫秒）
      LIST_STABLE_THRESHOLD: 2,          // 列表穩定閾值（連續幾次檢查無變化）
      FORCE_ENABLE_TIMEOUT: 3000,        // 強制啟用懶加載的超時時間（毫秒）
    },
    
    // 視窗加載範圍配置
    VIEWPORT: {
      ROOT_MARGIN_TOP: '0px',            // IntersectionObserver 頂部邊距
      ROOT_MARGIN_BOTTOM: '0px',         // IntersectionObserver 底部邊距
      THRESHOLD: 0.99,                   // 觸發可見性回調的閾值（0-1，1表示完全進入視口）
      VISIBLE_RANGE: 0,                  // 額外可見的行數（當前視口上下各0行）
      MAX_VISIBLE_ENTRIES: 3,            // 最大同時加載的封面數
      MANUAL_CHECK_OFFSET: 10,           // 手動檢查偏移量（像素）
    },
    
    // 下載隊列配置
    DOWNLOAD: {
      MAX_CONCURRENT: 1,                 // 最大並發下載數量
      DELAY_BETWEEN: 300,                // 下載隊列處理之間的延遲（毫秒）
      MIN_RANDOM_DELAY: 100,             // 最小隨機延遲（毫秒），用於分散請求
      MAX_RANDOM_DELAY: 500,             // 最大隨機延遲（毫秒），用於分散請求
    },
    
    // 圖片初始化配置
    IMAGE_INIT: {
      GIF_DELAY: 0,                      // GIF 文件加載延遲（毫秒）
      COVER_DELAY: 500,                  // 封面圖片加載延遲（毫秒）
      REGULAR_DELAY: 200,                // 常規圖片加載延遲（毫秒）
    },
    
    // 持久化配置
    PERSISTENCE: {
      ENABLED: true,                     // 啟用持久化緩存功能
      STORAGE_KEY: 'media_cover_cache',  // localStorage 存儲鍵名
      EXPIRY_DAYS: 7,                    // 緩存過期天數（0 表示永不過期）
      MAX_ENTRIES: 0,                    // 最大緩存條目數（0 表示無上限）
    }
  };

  // ========== 簡化緩存機制 ==========
  const errorCache = new Set();           // 存儲加載失敗的 URL
  const thumbCache = new WeakSet();       // 存儲已成功加載的條目（弱引用）
  const processingUrls = new Set();       // 存儲正在處理中的 URL
  const entryFinalUrlCache = new WeakMap(); // 存儲條目的最終成功 URL（弱引用）
  const entryDecisionCache = new WeakMap(); // 存儲條目的 URL 決策狀態（弱引用）
  
  // ========== 新增：持久化鎖定緩存 ==========
  class PersistentCoverCache {
    constructor() {
      this.storageKey = CONFIG.PERSISTENCE.STORAGE_KEY;
      this.cache = this.loadCache();
      this.cleanup();
    }
    
    /**
     * 從 localStorage 加載緩存數據
     * @returns {Map} 緩存數據的 Map 對象
     */
    loadCache() {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          // 驗證數據有效性
          if (data && data.version === 1 && data.entries) {
            return new Map(data.entries);
          }
        }
      } catch (e) {
        console.warn('Failed to load cover cache:', e);
      }
      return new Map();
    }
    
    /**
     * 保存緩存數據到 localStorage
     */
    saveCache() {
      try {
        const data = {
          version: 1,                    // 數據結構版本
          timestamp: Date.now(),         // 保存時間戳
          entries: Array.from(this.cache.entries())  // 所有緩存條目
        };
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      } catch (e) {
        console.warn('Failed to save cover cache:', e);
      }
    }
    
    /**
     * 生成條目的唯一鍵
     * @param {Object} entry - 文件條目對象
     * @returns {string} 唯一鍵
     */
    getEntryKey(entry) {
      // 使用 URI 和文件名創建唯一鍵，確保大小寫一致
      return `${entry.uri || ''}|${entry.name || ''}`.toLowerCase();
    }
    
    /**
     * 獲取條目的緩存封面 URL
     * @param {Object} entry - 文件條目對象
     * @returns {string|null} 緩存的 URL 或 null
     */
    getCoverUrl(entry) {
      const key = this.getEntryKey(entry);
      const cached = this.cache.get(key);
      
      if (cached) {
        // 檢查是否過期（當 EXPIRY_DAYS > 0 時）
        if (CONFIG.PERSISTENCE.EXPIRY_DAYS > 0 && 
            Date.now() - cached.timestamp > CONFIG.PERSISTENCE.EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
          this.cache.delete(key);
          this.saveCache();
          return null;
        }
        return cached.url;
      }
      return null;
    }
    
    /**
     * 設置條目的封面 URL 到緩存
     * @param {Object} entry - 文件條目對象
     * @param {string} url - 成功的封面 URL
     */
    setCoverUrl(entry, url) {
      const key = this.getEntryKey(entry);
      this.cache.set(key, {
        url: url,                           // 成功的封面 URL
        timestamp: Date.now(),              // 緩存時間戳
        entryUri: entry.uri,                // 原始條目 URI
        entryName: entry.name               // 原始條目名稱
      });
      
      // 限制緩存大小（僅當 MAX_ENTRIES > 0 時）
      if (CONFIG.PERSISTENCE.MAX_ENTRIES > 0 && this.cache.size > CONFIG.PERSISTENCE.MAX_ENTRIES) {
        // 刪除最早的 20% 的緩存條目
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        const deleteCount = Math.floor(CONFIG.PERSISTENCE.MAX_ENTRIES * 0.2);
        entries.slice(0, deleteCount).forEach(([key]) => {
          this.cache.delete(key);
        });
      }
      
      this.saveCache();
    }
    
    /**
     * 移除條目的緩存封面 URL
     * @param {Object} entry - 文件條目對象
     */
    removeCoverUrl(entry) {
      const key = this.getEntryKey(entry);
      this.cache.delete(key);
      this.saveCache();
    }
    
    /**
     * 清理過期的緩存條目
     */
    cleanup() {
      // 僅當 EXPIRY_DAYS > 0 時執行清理
      if (CONFIG.PERSISTENCE.EXPIRY_DAYS <= 0) return;
      
      const now = Date.now();
      const expiryTime = CONFIG.PERSISTENCE.EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      
      let changed = false;
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > expiryTime) {
          this.cache.delete(key);
          changed = true;
        }
      }
      
      if (changed) {
        this.saveCache();
      }
    }
    
    /**
     * 清除所有緩存數據
     */
    clear() {
      this.cache.clear();
      localStorage.removeItem(this.storageKey);
    }
  }

  // ========== 初始化持久化緩存 ==========
  const persistentCache = CONFIG.PERSISTENCE.ENABLED ? new PersistentCoverCache() : null;

  // ========== 下載隊列 ==========
  const downloadQueue = [];                // 待處理的下載隊列
  let activeDownloads = 0;                 // 活躍的下載數量

  // ========== 狀態控制 ==========
  let isPageFullyLoaded = false;           // 頁面是否完全加載
  let isPluginEnabled = false;             // 插件功能是否啟用
  let lazyLoadManager = null;              // 懶加載管理器實例
  let scrollTimeout = null;                // 滾動事件超時定時器
  let initialDelayTimeout = null;          // 初始延遲定時器
  let enablePluginTimeout = null;          // 強制啟用插件定時器
  
  let isListFullyLoaded = false;           // 文件列表是否完全加載
  let listLoadCheckInterval = null;        // 列表加載檢查定時器
  let listEntriesCount = 0;                // 列表條目數量
  let listStableCount = 0;                 // 列表穩定計數器

  // ========== 工具函數 ==========
  /**
   * 防抖函數
   * @param {Function} func - 要執行的函數
   * @param {number} wait - 等待時間（毫秒）
   * @returns {Function} 防抖後的函數
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * 節流函數
   * @param {Function} func - 要執行的函數
   * @param {number} limit - 限制時間（毫秒）
   * @returns {Function} 節流後的函數
   */
  function throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * 延遲函數
   * @param {number} ms - 延遲時間（毫秒）
   * @returns {Promise} 延遲完成的 Promise
   */
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 隨機延遲函數
   * @param {number} min - 最小延遲時間（毫秒）
   * @param {number} max - 最大延遲時間（毫秒）
   * @returns {Promise} 延遲完成的 Promise
   */
  function randomDelay(min, max) {
    return delay(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  /**
   * 標準化 URL 用於緩存鍵
   * @param {string} url - 原始 URL
   * @returns {string} 標準化的 URL
   */
  function normalizeUrlForKey(url) {
    try {
      const u = new URL(url, location.origin);
      return u.href.split('?')[0].toLowerCase();
    } catch (e) {
      return (url || '').split('?')[0].toLowerCase();
    }
  }

  /**
   * 獲取條目的唯一鍵
   * @param {Object} entry - 文件條目對象
   * @returns {string} 條目唯一鍵
   */
  function getEntryKey(entry) {
    return `${entry.uri}|${entry.name}|${entry.ext}`;
  }

  // ========== 檢查是否為原生GIF文件 ==========
  /**
   * 判斷條目是否為原生 GIF 文件（非封面 GIF）
   * @param {Object} entry - 文件條目對象
   * @returns {boolean} 是否為原生 GIF 文件
   */
  function isNativeGifFile(entry) {
    const ext = entry.ext?.toLowerCase();
    if (ext !== 'gif') return false;
    
    // 檢查是否為封面 GIF
    const url = getCurrentCoverUrlSync(entry);
    if (url && url.includes('/cache/videothumbnail/')) {
      return false; // 這是封面 GIF，不是原生 GIF 文件
    }
    
    // 如果是直接的 GIF 文件 URL
    if (entry.uri && entry.uri.toLowerCase().endsWith('.gif')) {
      return true;
    }
    
    return true; // 默認認為是原生 GIF
  }

  // ========== 智能懒加载管理器 ==========
  class SmartLazyLoadManager {
    constructor() {
      this.entries = new Map();            // 所有註冊的條目
      this.visibleEntries = new Set();     // 當前可見的條目
      this.loadingEntries = new Set();     // 正在加載的條目
      this.intersectionObserver = null;    // IntersectionObserver 實例
      this.init();
    }
    
    /**
     * 初始化懶加載管理器
     */
    init() {
      if (!CONFIG.LAZY_LOAD.ENABLED) return;
      
      if ('IntersectionObserver' in window) {
        const rootMargin = `${CONFIG.VIEWPORT.ROOT_MARGIN_TOP} 0px ${CONFIG.VIEWPORT.ROOT_MARGIN_BOTTOM} 0px`;
        
        this.intersectionObserver = new IntersectionObserver(
          (entries) => {
            this.handleIntersection(entries);
          },
          {
            root: null,                     // 相對於視口
            rootMargin: rootMargin,         // 視口邊距
            threshold: CONFIG.VIEWPORT.THRESHOLD  // 觸發閾值
          }
        );
      }
    }
    
    /**
     * 處理 IntersectionObserver 回調
     * @param {Array} entries - 觀察的條目數組
     */
    handleIntersection(entries) {
      entries.forEach(entry => {
        const entryId = entry.target.dataset.lazyEntryId;
        if (entry.isIntersecting) {
          this.visibleEntries.add(entryId);
          this.scheduleLazyLoad(entryId);
        } else {
          this.visibleEntries.delete(entryId);
        }
      });
    }
    
    /**
     * 註冊條目到懶加載管理器
     * @param {Object} entry - 文件條目對象
     * @param {Element} element - DOM 元素
     */
    registerEntry(entry, element) {
      // 如果是原生 GIF 文件，跳過註冊
      if (isNativeGifFile(entry)) return;
      
      if (!element || !entry) return;
      
      const entryId = this.getEntryId(entry);
      
      if (this.entries.has(entryId)) return;
      
      this.entries.set(entryId, { 
        entry,                     // 文件條目對象
        element,                   // DOM 元素
        loaded: false,             // 是否已加載完成
        loading: false,            // 是否正在加載中
        isCover: this.isCoverEntry(entry)  // 是否為封面條目
      });
      
      element.dataset.lazyEntryId = entryId;
      
      if (this.intersectionObserver && element instanceof Element) {
        try {
          this.intersectionObserver.observe(element);
        } catch (e) {
          this.checkIfVisible(entryId);
        }
      } else {
        this.checkIfVisible(entryId);
      }
    }
    
    /**
     * 判斷條目是否為封面條目
     * @param {Object} entry - 文件條目對象
     * @returns {boolean} 是否為封面條目
     */
    isCoverEntry(entry) {
      const ext = entry.ext?.toLowerCase();
      return [...audioExts, ...videoExts].includes(ext);
    }
    
    /**
     * 手動檢查條目是否可見
     * @param {string} entryId - 條目 ID
     */
    checkIfVisible(entryId) {
      const data = this.entries.get(entryId);
      if (!data || data.loaded || data.loading) return;
      
      try {
        const rect = data.element.getBoundingClientRect();
        const isVisible = (
          rect.top <= (window.innerHeight + CONFIG.VIEWPORT.MANUAL_CHECK_OFFSET) &&
          rect.bottom >= -CONFIG.VIEWPORT.MANUAL_CHECK_OFFSET &&
          rect.left <= (window.innerWidth + CONFIG.VIEWPORT.MANUAL_CHECK_OFFSET) &&
          rect.right >= -CONFIG.VIEWPORT.MANUAL_CHECK_OFFSET
        );
        
        if (isVisible) {
          this.scheduleLazyLoad(entryId);
        }
      } catch (e) {}
    }
    
    /**
     * 獲取條目 ID
     * @param {Object} entry - 文件條目對象
     * @returns {string} 條目 ID
     */
    getEntryId(entry) {
      return getEntryKey(entry);
    }
    
    /**
     * 安排懶加載任務
     * @param {string} entryId - 條目 ID
     */
    scheduleLazyLoad(entryId) {
      if (!isPluginEnabled) return;
      
      // 控制併發加載數量
      if (this.loadingEntries.size >= CONFIG.VIEWPORT.MAX_VISIBLE_ENTRIES) {
        return;
      }
      
      const delay = Math.random() * (CONFIG.DOWNLOAD.MAX_RANDOM_DELAY - CONFIG.DOWNLOAD.MIN_RANDOM_DELAY) + CONFIG.DOWNLOAD.MIN_RANDOM_DELAY;
      
      setTimeout(() => {
        this.processEntry(entryId);
      }, delay);
    }
    
    /**
     * 處理條目加載
     * @param {string} entryId - 條目 ID
     */
    async processEntry(entryId) {
      const data = this.entries.get(entryId);
      if (!data || data.loaded || data.loading) return;
      
      data.loading = true;
      this.loadingEntries.add(entryId);
      
      try {
        // 添加隨機延遲分散請求
        await randomDelay(CONFIG.DOWNLOAD.MIN_RANDOM_DELAY, CONFIG.DOWNLOAD.MAX_RANDOM_DELAY);
        
        if (data.isCover) {
          await this.loadCoverEntry(data.entry);
        }
        
        data.loaded = true;
        this.loadingEntries.delete(entryId);
      } catch (error) {
        data.loading = false;
        this.loadingEntries.delete(entryId);
      }
    }
    
    /**
     * 加載封面條目
     * @param {Object} entry - 文件條目對象
     */
    async loadCoverEntry(entry) {
      // 首先檢查持久化緩存
      if (persistentCache) {
        const cachedUrl = persistentCache.getCoverUrl(entry);
        if (cachedUrl) {
          // 驗證緩存的 URL 是否仍然有效
          try {
            const response = await fetch(cachedUrl, { method: 'HEAD' });
            if (response.ok) {
              // 緩存的 URL 仍然有效，直接使用
              thumbCache.add(entry);
              entryFinalUrlCache.set(entry, cachedUrl);
              return;
            } else {
              // 緩存的 URL 失效，移除並繼續嘗試
              persistentCache.removeCoverUrl(entry);
            }
          } catch (e) {
            // 網絡錯誤，移除緩存
            persistentCache.removeCoverUrl(entry);
          }
        }
      }
      
      const allUrls = getAllPossibleCoverUrls(entry);
      
      for (const url of allUrls) {
        const normalizedUrl = normalizeUrlForKey(url);
        
        if (thumbCache.has(entry)) {
          continue;
        }

        if (errorCache.has(normalizedUrl)) continue;

        await randomDelay(CONFIG.DOWNLOAD.MIN_RANDOM_DELAY, CONFIG.DOWNLOAD.MAX_RANDOM_DELAY);
        const success = await addToDownloadQueue(url, entry);
        
        if (success && persistentCache) {
          // 成功加載的 URL 保存到持久化緩存
          persistentCache.setCoverUrl(entry, url);
          break; // 找到一個可用的 URL 就停止
        }
      }
    }
    
    /**
     * 檢查所有條目的可見性
     */
    checkAllEntries() {
      if (!isPluginEnabled) return;
      
      this.entries.forEach((data, entryId) => {
        if (!data.loaded && !data.loading) {
          this.checkIfVisible(entryId);
        }
      });
    }
    
    /**
     * 銷毀懶加載管理器
     */
    destroy() {
      if (this.intersectionObserver) {
        try {
          this.intersectionObserver.disconnect();
        } catch (e) {}
      }
      this.entries.clear();
      this.visibleEntries.clear();
      this.loadingEntries.clear();
    }
  }

  // ========== 下載隊列處理 ==========
  /**
   * 處理下載隊列
   */
  async function processDownloadQueue() {
    if (!isPluginEnabled) {
      if (downloadQueue.length > 0) {
        downloadQueue.length = 0;
      }
      return;
    }
    
    if (activeDownloads >= CONFIG.DOWNLOAD.MAX_CONCURRENT || downloadQueue.length === 0) {
      return;
    }

    const { url, entry, resolve, reject } = downloadQueue.shift();
    activeDownloads++;

    try {
      const success = await loadImageWithCache(url, entry);
      resolve(success);
    } catch (error) {
      reject(error);
    } finally {
      activeDownloads--;
      
      await delay(CONFIG.DOWNLOAD.DELAY_BETWEEN);
      setTimeout(processDownloadQueue, 0);
    }
  }

  /**
   * 添加到下載隊列
   * @param {string} url - 圖片 URL
   * @param {Object} entry - 文件條目對象
   * @returns {Promise<boolean>} 加載是否成功
   */
  function addToDownloadQueue(url, entry) {
    if (!isPluginEnabled) {
      return Promise.resolve(false);
    }
    
    // 如果是原生 GIF 文件，不加入下載隊列
    if (isNativeGifFile(entry)) {
      return Promise.resolve(false);
    }
    
    return new Promise((resolve, reject) => {
      const normalizedUrl = normalizeUrlForKey(url);
      if (processingUrls.has(normalizedUrl)) {
        resolve(false);
        return;
      }
      
      downloadQueue.push({ 
        url,                     // 圖片 URL
        entry,                   // 文件條目對象
        resolve: (success) => resolve(success),  // 成功回調
        reject                    // 失敗回調
      });
      
      setTimeout(() => {
        processDownloadQueue();
      }, Math.random() * CONFIG.DOWNLOAD.MIN_RANDOM_DELAY);
    });
  }

  // ========== 圖片加載與緩存 ==========
  /**
   * 加載圖片並緩存
   * @param {string} url - 圖片 URL
   * @param {Object} entry - 文件條目對象
   * @returns {Promise<boolean>} 加載是否成功
   */
  async function loadImageWithCache(url, entry) {
    // 如果是原生 GIF 文件，跳過加載
    if (isNativeGifFile(entry)) {
      return false;
    }
    
    const normalizedUrl = normalizeUrlForKey(url);
    
    if (processingUrls.has(normalizedUrl)) {
      return false;
    }
    
    processingUrls.add(normalizedUrl);

    try {
      // 從網絡加載
      const response = await fetch(url, { 
        cache: 'no-cache',     // 不使用緩存
        priority: 'low'        // 低優先級
      });
      
      if (response.ok) {
        const blob = await response.blob();
        
        // 驗證圖片有效性
        const img = new Image();
        const success = await new Promise((resolve, reject) => {
          img.onload = () => {
            URL.revokeObjectURL(img.src);
            resolve(true);
          };
          img.onerror = (err) => {
            URL.revokeObjectURL(img.src);
            resolve(false);
          };
          img.src = URL.createObjectURL(blob);
        });
        
        if (success) {
          thumbCache.add(entry);
          await setFinalUrlForEntry(entry, url);
          
          // 保存到持久化緩存
          if (persistentCache) {
            persistentCache.setCoverUrl(entry, url);
          }
          
          processingUrls.delete(normalizedUrl);
          return true;
        } else {
          errorCache.add(url);
          markCurrentUrlFailed(entry, url);
        }
      } else {
        errorCache.add(url);
        markCurrentUrlFailed(entry, url);
      }
      
      processingUrls.delete(normalizedUrl);
      return false;
      
    } catch (error) {
      errorCache.add(url);
      markCurrentUrlFailed(entry, url);
      processingUrls.delete(normalizedUrl);
      return false;
    }
  }

  // ========== 封面URL處理 ==========
  /**
   * 檢查是否啟用圖片路徑
   * @param {Object} entry - 文件條目對象
   * @returns {boolean} 是否啟用圖片路徑
   */
  function isImagesPathEnabled(entry) {
    if (!pluginConfig.enableImagesPath) return false;
    
    let imagesPathFolders = pluginConfig.imagesPathFolders;
    
    if (!imagesPathFolders) return true;
    if (!Array.isArray(imagesPathFolders)) {
        if (typeof imagesPathFolders === 'string') {
            imagesPathFolders = [imagesPathFolders];
        } else {
            return true;
        }
    }
    
    if (imagesPathFolders.length === 0) return true;
    
    const entryPath = entry.uri ? entry.uri.replace(/[^/]+$/, '') : '';
    return imagesPathFolders.some(folder => entryPath.startsWith(folder));
  }

  /**
   * 獲取所有可能的封面 URL
   * @param {Object} entry - 文件條目對象
   * @returns {Array<string>} 可能的封面 URL 數組
   */
  function getAllPossibleCoverUrls(entry) {
    // 如果是原生 GIF 文件，返回空數組
    if (isNativeGifFile(entry)) return [];
    
    const ext = entry.ext?.toLowerCase();
    const isAudio = audioExts.includes(ext);
    const isVideo = videoExts.includes(ext);
    
    if (!isAudio && !isVideo) return [];
    
    const baseUri = entry.uri.replace(/[^/]+$/, '');
    const name = encodeURIComponent(entry.name.replace(/\.[^/.]+$/, ''));
    const format = entry.coverExt || pluginConfig.videoThumbFormat || 'jpg';

    const urls = [];
    
    // 音頻封面路徑
    if (isAudio) {
      urls.push(`${baseUri}cache/covers/${name}.jpg`);
    }
    
    // 視頻封面路徑
    if (isVideo) {
      const useImagesPath = pluginConfig.enableImagesPath && isImagesPathEnabled(entry);
      
      // 圖片路徑優先
      if (useImagesPath) {
        urls.push(`/images/cache${baseUri}cache/videothumbnail/${name}.${format}`);
      }
      
      // 常規路徑
      urls.push(`${baseUri}cache/videothumbnail/${name}.${format}`);
    }
    
    return urls;
  }

  /**
   * 同步獲取當前封面 URL
   * @param {Object} entry - 文件條目對象
   * @returns {string|null} 封面 URL 或 null
   */
  function getCurrentCoverUrlSync(entry) {
    if (isNativeGifFile(entry)) return null;
    
    // 首先檢查持久化緩存
    if (persistentCache) {
      const cachedUrl = persistentCache.getCoverUrl(entry);
      if (cachedUrl) {
        entryFinalUrlCache.set(entry, cachedUrl);
        return cachedUrl;
      }
    }
    
    // 然後檢查內存緩存
    if (entryFinalUrlCache.has(entry)) {
      return entryFinalUrlCache.get(entry);
    }

    if (!entryDecisionCache.has(entry)) {
      const allUrls = getAllPossibleCoverUrls(entry);
      entryDecisionCache.set(entry, {
        allUrls: allUrls,              // 所有可能的 URL
        currentIndex: 0,               // 當前嘗試的索引
        triedUrls: new Set()           // 已嘗試過的 URL
      });
    }
    
    const decision = entryDecisionCache.get(entry);
    
    if (decision.currentIndex >= decision.allUrls.length) {
      return null;
    }
    
    return decision.allUrls[decision.currentIndex];
  }

  /**
   * 標記當前 URL 加載失敗
   * @param {Object} entry - 文件條目對象
   * @param {string} failedUrl - 失敗的 URL
   */
  function markCurrentUrlFailed(entry, failedUrl) {
    if (isNativeGifFile(entry)) return;
    
    if (!entryDecisionCache.has(entry)) return;
    
    const decision = entryDecisionCache.get(entry);
    const normalizedUrl = normalizeUrlForKey(failedUrl);
    decision.triedUrls.add(normalizedUrl);
    decision.currentIndex++;
  }

  /**
   * 設置條目的最終 URL
   * @param {Object} entry - 文件條目對象
   * @param {string} successUrl - 成功的 URL
   */
  async function setFinalUrlForEntry(entry, successUrl) {
    if (isNativeGifFile(entry)) return;
    
    entryFinalUrlCache.set(entry, successUrl);
  }

  // ========== 事件處理 ==========
  /**
   * 處理媒體點擊事件
   * @param {Object} entry - 文件條目對象
   * @param {Event} e - 事件對象
   */
  function handleMediaClick(entry, e) {
    e.preventDefault();
    e.stopPropagation();
    const ext = entry.ext?.toLowerCase();
    
    if (isNativeGifFile(entry)) {
      HFS.fileShow(entry);
      return;
    }
    
    if (audioExts.includes(ext) && typeof MMP?.audio === 'function') {
      MMP.audio(entry);
    } else {
      HFS.fileShow(entry, { startPlaying: true });
    }
  }

  // ========== 系統初始化 ==========
  /**
   * 檢查列表是否完全加載
   */
  function checkListFullyLoaded() {
    try {
      const listContainers = document.querySelectorAll('.list, table, .files-container, [data-list]');
      if (listContainers.length === 0) {
        listStableCount = 0;
        return;
      }

      const currentEntries = document.querySelectorAll('.entry, [data-uri], tr[data-uri]');
      const currentCount = currentEntries.length;
      
      if (currentCount === 0) {
        listStableCount = 0;
        return;
      }

      if (currentCount === listEntriesCount) {
        listStableCount++;
        
        if (listStableCount >= CONFIG.LAZY_LOAD.LIST_STABLE_THRESHOLD) {
          isListFullyLoaded = true;
          clearInterval(listLoadCheckInterval);
          
          setTimeout(() => {
            enablePluginFunctionality();
          }, 500);
        }
      } else {
        listEntriesCount = currentCount;
        listStableCount = 0;
      }
    } catch (e) {}
  }

  /**
   * 啟用插件功能
   */
  function enablePluginFunctionality() {
    if (isPluginEnabled) return;
    
    isPluginEnabled = true;
    
    lazyLoadManager = new SmartLazyLoadManager();
    
    if (window.MediaCoverPlugin && window.MediaCoverPlugin.registeredEntries) {
      setTimeout(() => {
        const entries = window.MediaCoverPlugin.registeredEntries || [];
        entries.forEach(({ entry, element }) => {
          // 跳過原生 GIF 文件的註冊
          if (!isNativeGifFile(entry) && lazyLoadManager) {
            lazyLoadManager.registerEntry(entry, element);
          }
        });
        
        if (lazyLoadManager) {
          lazyLoadManager.checkAllEntries();
        }
      }, 500);
    }
    
    setupScrollListener();
  }

  /**
   * 設置滾動監聽器
   */
  function setupScrollListener() {
    const scrollHandler = throttle(() => {
      if (lazyLoadManager && isPluginEnabled) {
        lazyLoadManager.checkAllEntries();
      }
    }, 200);
    
    window.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('touchmove', scrollHandler, { passive: true });
  }

  /**
   * 頁面加載完成處理函數
   */
  function onPageLoad() {
    isPageFullyLoaded = true;
    
    initialDelayTimeout = setTimeout(() => {
      initializeSystem();
    }, CONFIG.LAZY_LOAD.INITIAL_DELAY);
  }

  // 監聽頁面加載事件
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onPageLoad);
  } else {
    onPageLoad();
  }

  /**
   * 初始化系統
   */
  function initializeSystem() {
    setTimeout(() => {
      listLoadCheckInterval = setInterval(checkListFullyLoaded, CONFIG.LAZY_LOAD.LIST_STABLE_CHECK_INTERVAL);
    }, 500);
    
    enablePluginTimeout = setTimeout(() => {
      if (!isPluginEnabled) {
        enablePluginFunctionality();
      }
    }, CONFIG.LAZY_LOAD.FORCE_ENABLE_TIMEOUT);
  }

  // ========== React 圖片組件 ==========
  /**
   * 圖片加載組件（帶回退）
   * @param {Object} props - 組件屬性
   * @param {Function} props.fallback - 回退組件
   * @param {string} props.tag - 標籤名稱
   * @param {Object} props.props - 圖片屬性
   * @param {Object} props.entry - 文件條目對象
   * @returns {JSX.Element} React 元素
   */
  function ImgFallback({ fallback, tag = 'img', props, entry }) {
    const [err, setErr] = HFS.React.useState(false);
    const [localSrc, setLocalSrc] = HFS.React.useState('');
    const [loaded, setLoaded] = HFS.React.useState(false);
    const [retryKey, setRetryKey] = HFS.React.useState(0);
    const [useFallbackIcon, setUseFallbackIcon] = HFS.React.useState(false);
    const mountedRef = HFS.React.useRef(true);
    const imgRef = HFS.React.useRef(null);
    const initTimeoutRef = HFS.React.useRef(null);
    const loadAttemptRef = HFS.React.useRef(0);

    // 識別圖片類型
    const imageType = HFS.React.useMemo(() => {
      if (isNativeGifFile(entry)) {
        return 'native-gif';            // 原生 GIF 文件
      }
      
      const ext = entry.ext?.toLowerCase();
      const url = getCurrentCoverUrlSync(entry);
      
      if (url && url.toLowerCase().endsWith('.gif')) {
        return 'cover-gif';             // 封面 GIF
      }
      
      const isCover = url && (url.includes('/cache/covers/') || url.includes('/cache/videothumbnail/'));
      return isCover ? 'cover' : 'regular';  // 普通封面或常規圖片
    }, [entry]);

    // 清理副作用
    HFS.React.useEffect(() => {
      return () => {
        mountedRef.current = false;
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
        }
      };
    }, []);

    // 圖片初始化效果
    HFS.React.useEffect(() => {
      // 如果是原生 GIF 文件，直接設置 src
      if (imageType === 'native-gif') {
        setLocalSrc(`${entry.uri}`);
        return;
      }
      
      let isActive = true;
      
      // 註冊元素到全局
      const element = imgRef.current;
      if (element && entry) {
        if (!window.MediaCoverPlugin) {
          window.MediaCoverPlugin = {};
        }
        if (!window.MediaCoverPlugin.registeredEntries) {
          window.MediaCoverPlugin.registeredEntries = [];
        }
        
        window.MediaCoverPlugin.registeredEntries.push({ entry, element });
        
        if (isPluginEnabled && lazyLoadManager) {
          lazyLoadManager.registerEntry(entry, element);
        }
      }
      
      // 延遲初始化
      initTimeoutRef.current = setTimeout(() => {
        if (!isActive || !mountedRef.current) return;
        
        const initializeImage = async () => {
          try {
            // 檢查持久化緩存
            let currentUrl = null;
            if (persistentCache) {
              currentUrl = persistentCache.getCoverUrl(entry);
            }
            
            if (!currentUrl) {
              currentUrl = getCurrentCoverUrlSync(entry);
            }
            
            if (!currentUrl) {
              if (isActive) {
                setErr(true);
                setUseFallbackIcon(true);
              }
              return;
            }

            // GIF 文件直接加載
            if (imageType === 'cover-gif') {
              if (isActive) setLocalSrc(currentUrl);
              return;
            }

            // 普通封面
            if (isActive) {
              setLocalSrc(currentUrl);
            }
          } catch (error) {
            if (isActive) {
              setErr(true);
              setUseFallbackIcon(true);
            }
          }
        };

        initializeImage();
      }, imageType === 'native-gif' ? 0 : CONFIG.IMAGE_INIT.COVER_DELAY);

      return () => {
        isActive = false;
      };
    }, [entry, retryKey, imageType]);

    /**
     * 圖片加載完成處理
     * @param {Event} e - 加載事件
     */
    const handleLoad = async (e) => {
      if (!mountedRef.current) return;
      
      try {
        const el = e.target;
        
        setTimeout(() => {
          if (mountedRef.current) {
            setLoaded(true);
            el.classList.add('loaded');
          }
        }, 100);
      } catch (error) {}
    };

    /**
     * 圖片加載失敗處理
     */
    const handleError = () => {
      if (!mountedRef.current) return;
      
      try {
        const normalizedUrl = normalizeUrlForKey(localSrc);
        errorCache.add(normalizedUrl);

        if (imageType === 'cover' || imageType === 'cover-gif') {
          markCurrentUrlFailed(entry, localSrc);
          
          // 更新持久化緩存
          if (persistentCache) {
            persistentCache.removeCoverUrl(entry);
          }
          
          loadAttemptRef.current++;
          
          if (loadAttemptRef.current >= 2) {
            // 嘗試 2 次後使用回退圖標
            setUseFallbackIcon(true);
          } else {
            setRetryKey(prev => prev + 1);
          }
        } else {
          setErr(true);
          setUseFallbackIcon(true);
        }
      } catch (error) {}
    };

    // 如果使用回退圖標，返回 fallback
    if (useFallbackIcon || err || !localSrc) {
      return fallback && h(fallback);
    }

    return h(tag, {
      ...props,
      src: localSrc,
      ref: (el) => {
        imgRef.current = el;
        if (props.ref) props.ref(el);
      },
      className: `${props.className || ''} thumbnail passthrough ${loaded ? 'loaded' : 'loading'} ${imageType}`,
      onLoad: handleLoad,
      onError: handleError,
      loading: imageType === 'native-gif' ? 'eager' : 'lazy',  // 原生 GIF 使用 eager 加載
      decoding: 'async'  // 異步解碼
    });
  }

  // ========== 事件監聽 ==========
  HFS.onEvent('listEntry', ({ entry }) => {
    const ext = entry.ext?.toLowerCase();
    
    // 如果是原生 GIF 文件，跳過處理
    if (isNativeGifFile(entry)) return;
    
    if (![...audioExts, ...videoExts].includes(ext)) return;
    
    setTimeout(() => {
      try {
        const elements = document.querySelectorAll('.icon, .entry-icon, .media-icon, [class*="icon"]');
        for (const element of elements) {
          const parent = element.closest('[data-uri], [data-name]');
          if (parent && (parent.dataset.uri === entry.uri || parent.dataset.name === entry.name)) {
            if (!window.MediaCoverPlugin) {
              window.MediaCoverPlugin = {};
            }
            if (!window.MediaCoverPlugin.registeredEntries) {
              window.MediaCoverPlugin.registeredEntries = [];
            }
            
            window.MediaCoverPlugin.registeredEntries.push({ entry, element: element });
            
            if (isPluginEnabled && lazyLoadManager) {
              lazyLoadManager.registerEntry(entry, element);
            }
            break;
          }
        }
      } catch (error) {}
    }, 800);
  });

  HFS.onEvent('entryIcon', ({ entry, iconProps }) => {
    const ext = entry.ext?.toLowerCase();
    
    // 如果是原生 GIF 文件，使用特殊的圖標處理
    if (isNativeGifFile(entry)) {
      const props = {
        className: `icon font-icon fa-file-image media-icon gif ${iconProps?.className || ''}`,
        title: iconProps?.title || 'GIF image',
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          HFS.fileShow(entry);
        },
        role: 'img',
      };
      return h('span', props);
    }
    
    if (![...audioExts, ...videoExts].includes(ext)) return;
    
    const type = audioExts.includes(ext) ? 'audio' : 'video';
    const props = {
      className: `icon font-icon fa-${type} media-icon ${type} ${iconProps?.className || ''}`,
      title: iconProps?.title || `Click to ${type === 'audio' ? 'play' : 'preview'}`,
      onClick: (e) => handleMediaClick(entry, e),
      role: 'img',
    };
    
    const fallbackSpan = () => h('span', props);

    return h(ImgFallback, {
      fallback: fallbackSpan,
      props: {
        ...props,
        className: `${props.className} thumbnail passthrough`,
        loading: 'lazy',
        decoding: 'async',
      },
      entry: entry,
    });
  });

  // ========== 新增：緩存清理按鈕（可選）==========
  if (persistentCache && HFS.onEvent) {
    HFS.onEvent('settingsPanel', ({ addSetting }) => {
      addSetting({
        type: 'button',                    // 按鈕類型
        label: '清除封面緩存',              // 按鈕標籤
        onClick: () => {
          if (confirm('確定要清除所有封面緩存嗎？這將強制重新加載所有封面圖片。')) {
            persistentCache.clear();
            location.reload();
          }
        }
      });
    });
  }

  // ========== 清理函數 ==========
  window.addEventListener('beforeunload', () => {
    try {
      if (lazyLoadManager) {
        lazyLoadManager.destroy();
      }
      
      if (initialDelayTimeout) {
        clearTimeout(initialDelayTimeout);
      }
      
      if (enablePluginTimeout) {
        clearTimeout(enablePluginTimeout);
      }
      
      if (listLoadCheckInterval) {
        clearInterval(listLoadCheckInterval);
      }
      
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    } catch (error) {}
  });
}