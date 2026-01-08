'use strict';
{
  const { h } = HFS;
  const pluginConfig = HFS.getPluginConfig?.() || {};
  const audioExts = ['mp3', 'flac', 'wav', 'ape', 'aac', 'ogg', 'm4a', 'alac', 'dsf', 'dsd', 'aif', 'aiff'];
  const videoExts = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'mpeg', 'mpg', 'wmv', 'rmvb', 'rm', 'dat', 'ts', 'vob', 'flv'];
  
  // ========== 集中配置參數 ==========
  const CONFIG = {
    // 懶加載配置 - 啟用攔截模式
    LAZY_LOAD: {
      ENABLED: true,                    // 是否啟用懶加載
      INTERCEPT_ALL_IMAGES: true,       // 攔截所有圖片
      INITIAL_DELAY: 2500,              // 初始延遲
      FORCE_ENABLE_TIMEOUT: 5000,       // 強制啟用超時時間
    },
    
    // 視窗加載範圍配置 - 極嚴格
    VIEWPORT: {
      ROOT_MARGIN_TOP: '0px',           // 頂部額外加載區域
      ROOT_MARGIN_BOTTOM: '0px',       // 底部額外加載區域（預加載下一行）
      THRESHOLD: 0.99,                  // 極低閾值
      MAX_VISIBLE_ENTRIES: 1,           // 最大同時加載的封面數
      CHECK_INTERVAL: 200,              // 檢查間隔
      SCROLL_DEBOUNCE: 100,             // 滾動防抖
      // 嚴格模式：只加載完全在視窗內的項目
      STRICT_VISIBILITY: true,
      VISIBILITY_THRESHOLD: 0.8,        // 可見度閾值（80%可見）
    },
    
    // 圖片初始化配置
    IMAGE_INIT: {
      GIF_DELAY: 250,
      COVER_DELAY: 300,
      REGULAR_DELAY:400,
    }
  };

  // ========== 全局緩存和狀態 ==========
  const errorCache = new Set();
  const thumbCache = new WeakSet();
  const processingUrls = new Set();
  const entryFinalUrlCache = new WeakMap();
  const entryDecisionCache = new WeakMap();
  const entrySuccessPathCache = new WeakMap();
  
  // ========== 關鍵：圖片攔截緩存 ==========
  const imageElementsCache = new Map();      // 所有圖片元素緩存
  const pendingImageLoads = new Map();       // 待加載的圖片
  const activeImageLoads = new Set();        // 正在加載的圖片
  
  // ========== 狀態控制 ==========
  let isPluginEnabled = false;
  let isInitialized = false;
  let lazyLoadManager = null;
  let imageInterceptor = null;
  let scrollHandler = null;
  let visibilityChecker = null;
  let enableTimeout = null;

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
    
    const url = getCurrentCoverUrlSync(entry);
    if (url && url.includes('/cache/videothumbnail/')) {
      return false;
    }
    
    if (entry.uri && entry.uri.toLowerCase().endsWith('.gif')) {
      return true;
    }
    
    return true;
  }

  // ========== 粗暴的圖片攔截器 ==========
  class ImageInterceptor {
    constructor() {
      this.interceptedImages = new Map();
      this.observer = null;
      this.init();
    }
    
    init() {
      if (!CONFIG.LAZY_LOAD.INTERCEPT_ALL_IMAGES) return;
      
      // 攔截所有現有的圖片元素
      this.interceptExistingImages();
      
      // 設置MutationObserver監聽新圖片
      this.setupMutationObserver();
      
      // 攔截Image構造函數
      this.interceptImageConstructor();
    }
    
    interceptExistingImages() {
      const allImages = document.querySelectorAll('img');
      allImages.forEach(img => {
        this.processImageElement(img);
      });
    }
    
    processImageElement(img) {
      // 跳過已經處理過的圖片
      if (img.dataset.intercepted === 'true') return;
      
      const src = img.src;
      if (!src || src.trim() === '') return;
      
      // 檢查是否為封面圖
      const isCover = src.includes('/cache/covers/') || src.includes('/cache/videothumbnail/');
      if (!isCover) return;
      
      // 獲取對應的entry
      const entry = this.findEntryForImage(img);
      if (!entry) return;
      
      // 攔截這個圖片
      this.interceptImage(img, entry);
    }
    
    findEntryForImage(img) {
      // 從圖片元素向上查找對應的entry
      let element = img;
      for (let i = 0; i < 5; i++) {
        if (!element.parentElement) break;
        element = element.parentElement;
        
        const uri = element.dataset?.uri;
        const name = element.dataset?.name;
        
        if (uri || name) {
          // 嘗試從全局註冊的entries中查找
          if (window.MediaCoverPlugin?.registeredEntries) {
            const found = window.MediaCoverPlugin.registeredEntries.find(
              e => e.entry.uri === uri || e.entry.name === name
            );
            if (found) return found.entry;
          }
        }
      }
      return null;
    }
    
    interceptImage(img, entry) {
      const originalSrc = img.src;
      const imgKey = `${originalSrc}|${getEntryKey(entry)}`;
      
      // 保存原始信息
      img.dataset.originalSrc = originalSrc;
      img.dataset.intercepted = 'true';
      img.dataset.entryKey = getEntryKey(entry);
      
      // 移除src，防止自動加載
      img.removeAttribute('src');
      img.style.opacity = '0';
      
      // 保存到緩存
      this.interceptedImages.set(imgKey, {
        img,
        entry,
        originalSrc,
        loaded: false,
        loading: false
      });
      
      // 註冊到圖片元素緩存
      imageElementsCache.set(imgKey, img);
    }
    
    setupMutationObserver() {
      this.observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1) { // Element node
                if (node.tagName === 'IMG') {
                  this.processImageElement(node);
                } else {
                  const images = node.querySelectorAll('img');
                  images.forEach(img => this.processImageElement(img));
                }
              }
            });
          }
        });
      });
      
      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    
    interceptImageConstructor() {
      const OriginalImage = window.Image;
      
      window.Image = function() {
        const img = new OriginalImage();
        
        Object.defineProperty(img, 'src', {
          get() {
            return this._src || '';
          },
          set(value) {
            this._src = value;
            
            // 檢查是否為封面圖
            const isCover = value.includes('/cache/covers/') || value.includes('/cache/videothumbnail/');
            if (isCover) {
              // 延遲設置實際src
              setTimeout(() => {
                if (img.parentElement) {
                  img.dataset.originalSrc = value;
                  img.style.opacity = '0';
                }
              }, 0);
            } else {
              // 非封面圖，正常設置
              img.setAttribute('src', value);
            }
          }
        });
        
        return img;
      };
      
      window.Image.prototype = OriginalImage.prototype;
    }
    
    loadImage(imgKey) {
      const data = this.interceptedImages.get(imgKey);
      if (!data || data.loaded || data.loading) return false;
      
      data.loading = true;
      activeImageLoads.add(imgKey);
      
      // 檢查並發限制
      if (activeImageLoads.size > CONFIG.VIEWPORT.MAX_VISIBLE_ENTRIES) {
        data.loading = false;
        activeImageLoads.delete(imgKey);
        return false;
      }
      
      // 實際加載圖片
      const loadPromise = this.loadImageSource(data.img, data.entry, data.originalSrc);
      
      loadPromise.then(() => {
        data.loaded = true;
        data.loading = false;
        activeImageLoads.delete(imgKey);
        data.img.style.opacity = '1';
        data.img.classList.add('loaded');
      }).catch(() => {
        data.loading = false;
        activeImageLoads.delete(imgKey);
        data.img.style.opacity = '0.3';
      });
      
      return true;
    }
    
    async loadImageSource(img, entry, src) {
      // 優先使用緩存的成功路徑
      const successPath = entrySuccessPathCache.get(entry);
      const urlToLoad = successPath || src;
      
      return new Promise((resolve, reject) => {
        const tempImg = new Image();
        tempImg.onload = () => {
          // 驗證成功後設置實際src
          img.src = urlToLoad;
          img.onload = () => {
            thumbCache.add(entry);
            if (urlToLoad !== src) {
              entrySuccessPathCache.set(entry, urlToLoad);
            }
            resolve();
          };
          img.onerror = reject;
        };
        tempImg.onerror = () => {
          // 當前路徑失敗，嘗試其他路徑
          this.tryAlternativePaths(img, entry, src).then(resolve).catch(reject);
        };
        tempImg.src = urlToLoad;
      });
    }
    
    async tryAlternativePaths(img, entry, originalSrc) {
      const allUrls = getAllPossibleCoverUrls(entry);
      
      for (const url of allUrls) {
        if (url === originalSrc) continue;
        
        const normalizedUrl = normalizeUrlForKey(url);
        if (errorCache.has(normalizedUrl)) continue;
        
        try {
          await new Promise((resolve, reject) => {
            const testImg = new Image();
            testImg.onload = () => {
              img.src = url;
              img.onload = () => {
                thumbCache.add(entry);
                entrySuccessPathCache.set(entry, url);
                resolve();
              };
              img.onerror = reject;
            };
            testImg.onerror = reject;
            testImg.src = url;
          });
          return; // 成功加載，退出循環
        } catch (e) {
          errorCache.add(normalizedUrl);
          continue;
        }
      }
      
      throw new Error('All image paths failed');
    }
    
    checkVisibleImages() {
      if (!isPluginEnabled) return;
      
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const scrollTop = window.scrollY;
      const scrollBottom = scrollTop + viewportHeight;
      
      let loadedCount = 0;
      
      this.interceptedImages.forEach((data, imgKey) => {
        if (data.loaded || data.loading) {
          loadedCount++;
          return;
        }
        
        // 檢查並發限制
        if (loadedCount >= CONFIG.VIEWPORT.MAX_VISIBLE_ENTRIES) {
          return;
        }
        
        try {
          const rect = data.img.getBoundingClientRect();
          const elementTop = rect.top + scrollTop;
          const elementBottom = rect.bottom + scrollTop;
          
          // 嚴格檢查：元素必須在視窗內
          const isInViewport = (
            elementBottom >= scrollTop &&
            elementTop <= scrollBottom &&
            rect.left >= 0 &&
            rect.right <= viewportWidth
          );
          
          if (CONFIG.VIEWPORT.STRICT_VISIBILITY) {
            // 檢查可見面積比例
            const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
            const visibleWidth = Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
            const elementArea = rect.height * rect.width;
            const visibleArea = visibleHeight * visibleWidth;
            const visibilityRatio = elementArea > 0 ? visibleArea / elementArea : 0;
            
            if (isInViewport && visibilityRatio >= CONFIG.VIEWPORT.VISIBILITY_THRESHOLD) {
              if (this.loadImage(imgKey)) {
                loadedCount++;
              }
            }
          } else {
            if (isInViewport) {
              if (this.loadImage(imgKey)) {
                loadedCount++;
              }
            }
          }
        } catch (e) {}
      });
    }
    
    destroy() {
      if (this.observer) {
        this.observer.disconnect();
      }
      
      // 恢復所有攔截的圖片
      this.interceptedImages.forEach(data => {
        if (data.img && data.img.dataset.originalSrc) {
          data.img.src = data.img.dataset.originalSrc;
          data.img.style.opacity = '1';
        }
      });
      
      this.interceptedImages.clear();
    }
  }

  // ========== 可視性檢查器 ==========
  class VisibilityChecker {
    constructor() {
      this.entries = new Map();
      this.observer = null;
      this.init();
    }
    
    init() {
      if ('IntersectionObserver' in window) {
        const rootMargin = `${CONFIG.VIEWPORT.ROOT_MARGIN_TOP} 0px ${CONFIG.VIEWPORT.ROOT_MARGIN_BOTTOM} 0px`;
        
        this.observer = new IntersectionObserver(
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
        const entryId = entry.target.dataset.visibilityId;
        if (entry.isIntersecting) {
          this.loadEntry(entryId);
        }
      });
    }
    
    registerEntry(entry, element) {
      if (isNativeGifFile(entry)) return;
      
      const entryId = getEntryKey(entry);
      
      if (this.entries.has(entryId)) return;
      
      this.entries.set(entryId, {
        entry,
        element,
        loaded: false
      });
      
      element.dataset.visibilityId = entryId;
      
      if (this.observer && element instanceof Element) {
        this.observer.observe(element);
      }
    }
    
    loadEntry(entryId) {
      const data = this.entries.get(entryId);
      if (!data || data.loaded) return;
      
      data.loaded = true;
      
      // 觸發圖片加載
      if (imageInterceptor) {
        // 查找對應的圖片元素
        const imgElements = document.querySelectorAll(`img[data-entry-key="${entryId}"]`);
        imgElements.forEach(img => {
          const imgKey = `${img.dataset.originalSrc}|${entryId}`;
          imageInterceptor.loadImage(imgKey);
        });
      }
    }
    
    destroy() {
      if (this.observer) {
        this.observer.disconnect();
      }
      this.entries.clear();
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
      
      const successPath = entrySuccessPathCache.get(entry);
      if (successPath) {
        urls.unshift(successPath);
      }
      
      if (useImagesPath) {
        urls.push(`/images/cache${baseUri}cache/videothumbnail/${name}.${format}`);
      }
      
      urls.push(`${baseUri}cache/videothumbnail/${name}.${format}`);
    }
    
    return [...new Set(urls)];
  }

  function getCurrentCoverUrlSync(entry) {
    if (isNativeGifFile(entry)) return null;
    
    const successPath = entrySuccessPathCache.get(entry);
    if (successPath) {
      return successPath;
    }
    
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
    if (isNativeGifFile(entry)) return;
    
    if (!entryDecisionCache.has(entry)) return;
    
    const decision = entryDecisionCache.get(entry);
    const normalizedUrl = normalizeUrlForKey(failedUrl);
    decision.triedUrls.add(normalizedUrl);
    decision.currentIndex++;
    
    const successPath = entrySuccessPathCache.get(entry);
    if (successPath && normalizeUrlForKey(successPath) === normalizedUrl) {
      entrySuccessPathCache.delete(entry);
    }
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
  function initializeSystem() {
    if (isInitialized) return;
    
    isInitialized = true;
    
    // 首先攔截所有圖片
    imageInterceptor = new ImageInterceptor();
    
    // 然後啟用可視性檢查
    lazyLoadManager = new VisibilityChecker();
    
    // 設置滾動檢查
    setupScrollChecker();
    
    // 延遲啟用加載
    setTimeout(() => {
      enablePlugin();
    }, CONFIG.LAZY_LOAD.INITIAL_DELAY);
  }

  function setupScrollChecker() {
    scrollHandler = debounce(() => {
      if (imageInterceptor && isPluginEnabled) {
        imageInterceptor.checkVisibleImages();
      }
    }, CONFIG.VIEWPORT.SCROLL_DEBOUNCE);
    
    window.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('resize', scrollHandler, { passive: true });
    
    // 定時檢查可見圖片
    setInterval(() => {
      if (imageInterceptor && isPluginEnabled) {
        imageInterceptor.checkVisibleImages();
      }
    }, CONFIG.VIEWPORT.CHECK_INTERVAL);
  }

  function enablePlugin() {
    if (isPluginEnabled) return;
    
    isPluginEnabled = true;
    
    // 初始檢查一次可見圖片
    if (imageInterceptor) {
      setTimeout(() => {
        imageInterceptor.checkVisibleImages();
      }, 500);
    }
    
    // 註冊已經存在的條目
    if (window.MediaCoverPlugin?.registeredEntries) {
      window.MediaCoverPlugin.registeredEntries.forEach(({ entry, element }) => {
        if (lazyLoadManager && !isNativeGifFile(entry)) {
          lazyLoadManager.registerEntry(entry, element);
        }
      });
    }
  }

  // 頁面加載後初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeSystem, 500);
    });
  } else {
    setTimeout(initializeSystem, 500);
  }

  // 設置超時強制啟用
  enableTimeout = setTimeout(() => {
    if (!isPluginEnabled) {
      enablePlugin();
    }
  }, CONFIG.LAZY_LOAD.FORCE_ENABLE_TIMEOUT);

  // ========== React 圖片組件 ==========
  function ImgFallback({ fallback, tag = 'img', props, entry }) {
    const [err, setErr] = HFS.React.useState(false);
    const [localSrc, setLocalSrc] = HFS.React.useState('');
    const [loaded, setLoaded] = HFS.React.useState(false);
    const [retryKey, setRetryKey] = HFS.React.useState(0);
    const mountedRef = HFS.React.useRef(true);
    const imgRef = HFS.React.useRef(null);
    const initTimeoutRef = HFS.React.useRef(null);

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
        
        if (lazyLoadManager && !isNativeGifFile(entry)) {
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

            if (imageType === 'cover-gif') {
              if (isActive) setLocalSrc(currentUrl);
              return;
            }

            // 設置占位符URL，實際加載由攔截器控制
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
      loading: 'lazy',
      decoding: 'async'
    });
  }

  // ========== 事件監聽 ==========
  HFS.onEvent('listEntry', ({ entry }) => {
    const ext = entry.ext?.toLowerCase();
    
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
            
            if (lazyLoadManager && !isNativeGifFile(entry)) {
              lazyLoadManager.registerEntry(entry, element);
            }
            break;
          }
        }
      } catch (error) {}
    }, 500);
  });

  HFS.onEvent('entryIcon', ({ entry, iconProps }) => {
    const ext = entry.ext?.toLowerCase();
    
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
      if (imageInterceptor) {
        imageInterceptor.destroy();
      }
      
      if (lazyLoadManager) {
        lazyLoadManager.destroy();
      }
      
      if (scrollHandler) {
        window.removeEventListener('scroll', scrollHandler);
        window.removeEventListener('resize', scrollHandler);
      }
      
      if (enableTimeout) {
        clearTimeout(enableTimeout);
      }
    } catch (error) {}
  });
}