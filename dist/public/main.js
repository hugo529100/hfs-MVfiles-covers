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
      ENABLED: true,
      INITIAL_DELAY: 1000,
      LIST_STABLE_CHECK_INTERVAL: 500,
      LIST_STABLE_THRESHOLD: 2,
      FORCE_ENABLE_TIMEOUT: 3000,
    },
    
    // 視窗加載範圍配置 - 大幅度缩小加载范围
    VIEWPORT: {
      ROOT_MARGIN_TOP: '0px',     // 顶部额外加载区域
      ROOT_MARGIN_BOTTOM: '0px',  // 底部额外加载区域
      THRESHOLD: 0.99,             // 更高阈值，几乎完全进入视口才加载
      VISIBLE_RANGE: 0,            // 额外可见的行数（当前视口上下各2行）
      MAX_VISIBLE_ENTRIES: 3,     // 最大同时加载的封面数
      MANUAL_CHECK_OFFSET: 10,     // 手动检查偏移量（缩小）
    },
    
    // 下載隊列配置
    DOWNLOAD: {
      MAX_CONCURRENT: 1,           // 降低并发数为1
      DELAY_BETWEEN: 300,          // 增加延迟
      MIN_RANDOM_DELAY: 100,       // 增加最小延迟
      MAX_RANDOM_DELAY: 500,       // 增加最大延迟
    },
    
    // 圖片初始化配置
    IMAGE_INIT: {
      GIF_DELAY: 0,
      COVER_DELAY: 500,            // 增加封面延迟
      REGULAR_DELAY: 200,
    }
  };

  // ========== 簡化緩存機制 ==========
  const errorCache = new Set();
  const thumbCache = new WeakSet();
  const processingUrls = new Set();
  const entryFinalUrlCache = new WeakMap();
  const entryDecisionCache = new WeakMap();

  // ========== 下載隊列 ==========
  const downloadQueue = [];
  let activeDownloads = 0;

  // ========== 狀態控制 ==========
  let isPageFullyLoaded = false;
  let isPluginEnabled = false;
  let lazyLoadManager = null;
  let scrollTimeout = null;
  let initialDelayTimeout = null;
  let enablePluginTimeout = null;
  
  let isListFullyLoaded = false;
  let listLoadCheckInterval = null;
  let listEntriesCount = 0;
  let listStableCount = 0;

  // ========== 工具函數 ==========
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

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

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function randomDelay(min, max) {
    return delay(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  function normalizeUrlForKey(url) {
    try {
      const u = new URL(url, location.origin);
      return u.href.split('?')[0].toLowerCase();
    } catch (e) {
      return (url || '').split('?')[0].toLowerCase();
    }
  }

  function getEntryKey(entry) {
    return `${entry.uri}|${entry.name}|${entry.ext}`;
  }

  // ========== 檢查是否為原生GIF文件 ==========
  function isNativeGifFile(entry) {
    const ext = entry.ext?.toLowerCase();
    if (ext !== 'gif') return false;
    
    // 檢查是否為封面GIF
    const url = getCurrentCoverUrlSync(entry);
    if (url && url.includes('/cache/videothumbnail/')) {
      return false; // 這是封面GIF，不是原生GIF文件
    }
    
    // 如果是直接的GIF文件URL
    if (entry.uri && entry.uri.toLowerCase().endsWith('.gif')) {
      return true;
    }
    
    return true; // 默認認為是原生GIF
  }

  // ========== 智能懒加载管理器 ==========
  class SmartLazyLoadManager {
    constructor() {
      this.entries = new Map();
      this.visibleEntries = new Set();
      this.loadingEntries = new Set();
      this.intersectionObserver = null;
      this.init();
    }
    
    init() {
      if (!CONFIG.LAZY_LOAD.ENABLED) return;
      
      if ('IntersectionObserver' in window) {
        const rootMargin = `${CONFIG.VIEWPORT.ROOT_MARGIN_TOP} 0px ${CONFIG.VIEWPORT.ROOT_MARGIN_BOTTOM} 0px`;
        
        this.intersectionObserver = new IntersectionObserver(
          (entries) => {
            this.handleIntersection(entries);
          },
          {
            root: null,
            rootMargin: rootMargin,
            threshold: CONFIG.VIEWPORT.THRESHOLD
          }
        );
      }
    }
    
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
    
    registerEntry(entry, element) {
      // 如果是原生GIF文件，跳过注册
      if (isNativeGifFile(entry)) return;
      
      if (!element || !entry) return;
      
      const entryId = this.getEntryId(entry);
      
      if (this.entries.has(entryId)) return;
      
      this.entries.set(entryId, { 
        entry, 
        element, 
        loaded: false,
        loading: false,
        isCover: this.isCoverEntry(entry)
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
    
    isCoverEntry(entry) {
      const ext = entry.ext?.toLowerCase();
      return [...audioExts, ...videoExts].includes(ext);
    }
    
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
    
    getEntryId(entry) {
      return getEntryKey(entry);
    }
    
    scheduleLazyLoad(entryId) {
      if (!isPluginEnabled) return;
      
      // 控制并发加载数量
      if (this.loadingEntries.size >= CONFIG.VIEWPORT.MAX_VISIBLE_ENTRIES) {
        return;
      }
      
      const delay = Math.random() * (CONFIG.DOWNLOAD.MAX_RANDOM_DELAY - CONFIG.DOWNLOAD.MIN_RANDOM_DELAY) + CONFIG.DOWNLOAD.MIN_RANDOM_DELAY;
      
      setTimeout(() => {
        this.processEntry(entryId);
      }, delay);
    }
    
    async processEntry(entryId) {
      const data = this.entries.get(entryId);
      if (!data || data.loaded || data.loading) return;
      
      data.loading = true;
      this.loadingEntries.add(entryId);
      
      try {
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
    
    async loadCoverEntry(entry) {
      const allUrls = getAllPossibleCoverUrls(entry);
      
      for (const url of allUrls) {
        const normalizedUrl = normalizeUrlForKey(url);
        
        if (thumbCache.has(entry)) {
          continue;
        }

        if (errorCache.has(normalizedUrl)) continue;

        await randomDelay(CONFIG.DOWNLOAD.MIN_RANDOM_DELAY, CONFIG.DOWNLOAD.MAX_RANDOM_DELAY);
        await addToDownloadQueue(url, entry);
      }
    }
    
    checkAllEntries() {
      if (!isPluginEnabled) return;
      
      this.entries.forEach((data, entryId) => {
        if (!data.loaded && !data.loading) {
          this.checkIfVisible(entryId);
        }
      });
    }
    
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
      await loadImageWithCache(url, entry);
      resolve();
    } catch (error) {
      reject(error);
    } finally {
      activeDownloads--;
      
      await delay(CONFIG.DOWNLOAD.DELAY_BETWEEN);
      setTimeout(processDownloadQueue, 0);
    }
  }

  function addToDownloadQueue(url, entry) {
    if (!isPluginEnabled) {
      return Promise.resolve();
    }
    
    // 如果是原生GIF文件，不加入下载队列
    if (isNativeGifFile(entry)) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      const normalizedUrl = normalizeUrlForKey(url);
      if (processingUrls.has(normalizedUrl)) {
        resolve();
        return;
      }
      
      downloadQueue.push({ url, entry, resolve, reject });
      
      setTimeout(() => {
        processDownloadQueue();
      }, Math.random() * CONFIG.DOWNLOAD.MIN_RANDOM_DELAY);
    });
  }

  // ========== 圖片加載與緩存 ==========
  async function loadImageWithCache(url, entry) {
    // 如果是原生GIF文件，跳过加载
    if (isNativeGifFile(entry)) {
      return;
    }
    
    const normalizedUrl = normalizeUrlForKey(url);
    
    if (processingUrls.has(normalizedUrl)) {
      return;
    }
    
    processingUrls.add(normalizedUrl);

    try {
      // 從網絡加載
      try {
        const response = await fetch(url, { 
          cache: 'no-cache',
          priority: 'low'
        });
        
        if (response.ok) {
          const blob = await response.blob();
          
          // 驗證圖片有效性
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = () => {
              URL.revokeObjectURL(img.src);
              resolve();
            };
            img.onerror = (err) => {
              URL.revokeObjectURL(img.src);
              reject(new Error('Image validation failed'));
            };
            img.src = URL.createObjectURL(blob);
          });
          
          // 標記條目已緩存
          thumbCache.add(entry);
          await setFinalUrlForEntry(entry, url);
          
        } else {
          errorCache.add(url);
          markCurrentUrlFailed(entry, url);
        }
      } catch (fetchError) {
        errorCache.add(url);
        markCurrentUrlFailed(entry, url);
      }
      
      processingUrls.delete(normalizedUrl);
      
    } catch (error) {
      errorCache.add(url);
      markCurrentUrlFailed(entry, url);
      processingUrls.delete(normalizedUrl);
    }
  }

  // ========== 封面URL處理 ==========
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

  function getAllPossibleCoverUrls(entry) {
    // 如果是原生GIF文件，返回空数组
    if (isNativeGifFile(entry)) return [];
    
    const ext = entry.ext?.toLowerCase();
    const isAudio = audioExts.includes(ext);
    const isVideo = videoExts.includes(ext);
    
    if (!isAudio && !isVideo) return [];
    
    const baseUri = entry.uri.replace(/[^/]+$/, '');
    const name = encodeURIComponent(entry.name.replace(/\.[^/.]+$/, ''));
    const format = entry.coverExt || pluginConfig.videoThumbFormat || 'jpg';

    const urls = [];
    
    if (isAudio) {
      urls.push(`${baseUri}cache/covers/${name}.jpg`);
    }
    
    if (isVideo) {
      const useImagesPath = pluginConfig.enableImagesPath && isImagesPathEnabled(entry);
      
      if (useImagesPath) {
        urls.push(`/images/cache${baseUri}cache/videothumbnail/${name}.${format}`);
      }
      
      urls.push(`${baseUri}cache/videothumbnail/${name}.${format}`);
    }
    
    return urls;
  }

  function getCurrentCoverUrlSync(entry) {
    // 如果是原生GIF文件，返回null
    if (isNativeGifFile(entry)) return null;
    
    if (entryFinalUrlCache.has(entry)) {
      return entryFinalUrlCache.get(entry);
    }

    if (!entryDecisionCache.has(entry)) {
      const allUrls = getAllPossibleCoverUrls(entry);
      entryDecisionCache.set(entry, {
        allUrls: allUrls,
        currentIndex: 0,
        triedUrls: new Set()
      });
    }
    
    const decision = entryDecisionCache.get(entry);
    
    if (decision.currentIndex >= decision.allUrls.length) {
      return null;
    }
    
    return decision.allUrls[decision.currentIndex];
  }

  function markCurrentUrlFailed(entry, failedUrl) {
    // 如果是原生GIF文件，不记录失败
    if (isNativeGifFile(entry)) return;
    
    if (!entryDecisionCache.has(entry)) return;
    
    const decision = entryDecisionCache.get(entry);
    const normalizedUrl = normalizeUrlForKey(failedUrl);
    decision.triedUrls.add(normalizedUrl);
    decision.currentIndex++;
  }

  async function setFinalUrlForEntry(entry, successUrl) {
    // 如果是原生GIF文件，不缓存
    if (isNativeGifFile(entry)) return;
    
    entryFinalUrlCache.set(entry, successUrl);
  }

  // ========== 事件處理 ==========
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

  function enablePluginFunctionality() {
    if (isPluginEnabled) return;
    
    isPluginEnabled = true;
    
    lazyLoadManager = new SmartLazyLoadManager();
    
    if (window.MediaCoverPlugin && window.MediaCoverPlugin.registeredEntries) {
      setTimeout(() => {
        const entries = window.MediaCoverPlugin.registeredEntries || [];
        entries.forEach(({ entry, element }) => {
          // 跳过原生GIF文件的注册
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

  function setupScrollListener() {
    const scrollHandler = throttle(() => {
      if (lazyLoadManager && isPluginEnabled) {
        lazyLoadManager.checkAllEntries();
      }
    }, 200);
    
    window.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('touchmove', scrollHandler, { passive: true });
  }

  function onPageLoad() {
    isPageFullyLoaded = true;
    
    initialDelayTimeout = setTimeout(() => {
      initializeSystem();
    }, CONFIG.LAZY_LOAD.INITIAL_DELAY);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onPageLoad);
  } else {
    onPageLoad();
  }

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
  function ImgFallback({ fallback, tag = 'img', props, entry }) {
    const [err, setErr] = HFS.React.useState(false);
    const [localSrc, setLocalSrc] = HFS.React.useState('');
    const [loaded, setLoaded] = HFS.React.useState(false);
    const [retryKey, setRetryKey] = HFS.React.useState(0);
    const mountedRef = HFS.React.useRef(true);
    const imgRef = HFS.React.useRef(null);
    const initTimeoutRef = HFS.React.useRef(null);

    // 識別圖片類型
    const imageType = HFS.React.useMemo(() => {
      if (isNativeGifFile(entry)) {
        return 'native-gif';
      }
      
      const ext = entry.ext?.toLowerCase();
      const url = getCurrentCoverUrlSync(entry);
      
      if (url && url.toLowerCase().endsWith('.gif')) {
        return 'cover-gif';
      }
      
      const isCover = url && (url.includes('/cache/covers/') || url.includes('/cache/videothumbnail/'));
      return isCover ? 'cover' : 'regular';
    }, [entry]);

    HFS.React.useEffect(() => {
      return () => {
        mountedRef.current = false;
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
        }
      };
    }, []);

    HFS.React.useEffect(() => {
      // 如果是原生GIF文件，直接设置src，不注册到懒加载管理器
      if (imageType === 'native-gif') {
        setLocalSrc(`${entry.uri}`);
        return;
      }
      
      let isActive = true;
      
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
      
      initTimeoutRef.current = setTimeout(() => {
        if (!isActive || !mountedRef.current) return;
        
        const initializeImage = async () => {
          try {
            const currentUrl = getCurrentCoverUrlSync(entry);
            
            if (!currentUrl) {
              if (isActive) setErr(true);
              return;
            }

            // GIF文件直接加載
            if (imageType === 'cover-gif') {
              if (isActive) setLocalSrc(currentUrl);
              return;
            }

            // 封面圖：設置原始URL
            if (isActive) {
              setLocalSrc(currentUrl);
            }
          } catch (error) {
            if (isActive) setErr(true);
          }
        };

        initializeImage();
      }, imageType === 'native-gif' ? 0 : CONFIG.IMAGE_INIT.COVER_DELAY);

      return () => {
        isActive = false;
      };
    }, [entry, retryKey, imageType]);

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

    const handleError = () => {
      if (!mountedRef.current) return;
      
      try {
        const normalizedUrl = normalizeUrlForKey(localSrc);
        errorCache.add(normalizedUrl);

        if (imageType === 'cover' || imageType === 'cover-gif') {
          markCurrentUrlFailed(entry, localSrc);
          setRetryKey(prev => prev + 1);
        } else {
          setErr(true);
        }
      } catch (error) {}
    };

    if (err || !localSrc) {
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
      loading: imageType === 'native-gif' ? 'eager' : 'lazy',
      decoding: 'async'
    });
  }

  // ========== 事件監聽 ==========
  HFS.onEvent('listEntry', ({ entry }) => {
    const ext = entry.ext?.toLowerCase();
    
    // 如果是原生GIF文件，跳过处理
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
    
    // 如果是原生GIF文件，使用特殊的图标处理
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