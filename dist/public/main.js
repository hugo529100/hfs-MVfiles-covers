'use strict';
{
  const { h } = HFS;
  const pluginConfig = HFS.getPluginConfig?.() || {};
  const audioExts = ['mp3', 'flac', 'wav', 'ape', 'aac', 'ogg', 'm4a', 'alac', 'dsf', 'dsd', 'aif', 'aiff', 'opus'];
  const videoExts = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'mpeg', 'mpg', 'wmv', 'rmvb', 'rm', 'dat', 'ts', 'vob', 'flv'];
  
  // ========== 封面加載開關設置 ==========
  const STORAGE_KEY_COVER_LOAD = 'hfs_media_cover_load_enabled';
  const COVER_TOGGLE_ID = 'media-cover-load-toggle';
  
  // 檢查 localStorage 是否支持
  const isLocalStorageSupported = () => {
    try {
      localStorage.setItem('test', '1');
      localStorage.removeItem('test');
      return true;
    } catch (e) {
      return false;
    }
  };

  // 獲取封面加載狀態（默認為 true - 開啟）
  const getCoverLoadState = () => {
    if (!isLocalStorageSupported()) return true;
    const val = localStorage.getItem(STORAGE_KEY_COVER_LOAD);
    return val === null ? true : val === 'true';
  };

  // 儲存封面加載狀態
  const setCoverLoadState = (value) => {
    if (isLocalStorageSupported()) {
      localStorage.setItem(STORAGE_KEY_COVER_LOAD, value ? 'true' : 'false');
    }
  };

  // 全局變量來保存當前狀態
  let coverLoadEnabled = getCoverLoadState();

  // ========== 靜默化控制台日誌 ==========
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalDebug = console.debug;
  const originalInfo = console.info;
  
  // 禁用所有前端控制台輸出
  console.log = function() {};
  console.warn = function() {};
  console.error = function() {};
  console.debug = function() {};
  console.info = function() {};
  
  // 只在特定情況下恢復（用於調試）
  const debugMode = false;
  if (debugMode) {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    console.debug = originalDebug;
    console.info = originalInfo;
  }
  
  // ========== 集中配置參數 ==========
  const CONFIG = {
    // 圖片初始化配置
    IMAGE_INIT: {
      GIF_DELAY: 250,
      COVER_DELAY: 300,
      REGULAR_DELAY: 250,
    }
  };

  // ========== 全局緩存和狀態 ==========
  const errorCache = new Set();
  const thumbCache = new WeakSet();
  const processingUrls = new Set();
  let entryFinalUrlCache = new WeakMap();
  let entryDecisionCache = new WeakMap();
  const loadedImagesCache = new Map();
  
  // ========== HFS 狀態監聽 ==========
  let currentPath = window.location.pathname;
  let isNavigating = false;
  let navigationTimeout = null;

  // ========== 工具函數 ==========
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
  
  function getImageCacheKey(imgElement) {
    if (!imgElement) return null;
    const src = imgElement.src || imgElement.dataset?.originalSrc;
    const parent = imgElement.closest('[data-uri], [data-name]');
    const uri = parent?.dataset?.uri;
    const name = parent?.dataset?.name;
    if (!src || (!uri && !name)) return null;
    return `${src}|${uri}|${name}`;
  }

  // ========== 檢查是否為原生GIF文件 ==========
  function isNativeGifFile(entry) {
    const ext = entry.ext?.toLowerCase();
    if (ext !== 'gif') return false;
    
    const url = getCurrentCoverUrlSync(entry);
    if (url && url.includes('/cache/videothumbnail/')) {
      return false;
    }
    
    return true;
  }

  // ========== 單一路徑模式：封面URL處理 ==========
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
    
    // 單一路徑模式：根據具體設置返回路徑
    if (pluginConfig.enableGraftMode) {
      // 嫁接模式：強制指向自定義路徑，無回退機制
      if (isAudio) {
        // 檢查是否啟用音樂封面嫁接
        if (pluginConfig.graftMusicCovers !== false) { // 默認true
          urls.push(`${pluginConfig.graftPath}${baseUri}cache/covers/${name}.jpg`);
        } else {
          // 如果禁用音樂嫁接，就不使用任何封面
          return [];
        }
      } else if (isVideo) {
        // 檢查是否啟用視頻封面嫁接
        if (pluginConfig.graftVideoCovers !== false) { // 默認true
          urls.push(`${pluginConfig.graftPath}${baseUri}cache/videothumbnail/${name}.${format}`);
        } else {
          // 如果禁用視頻嫁接，就不使用任何封面
          return [];
        }
      }
    } else {
      // 普通模式：使用原始路徑
      if (isAudio) {
        urls.push(`${baseUri}cache/covers/${name}.jpg`);
      } else if (isVideo) {
        urls.push(`${baseUri}cache/videothumbnail/${name}.${format}`);
      }
    }
    
    return urls;
  }

  function getCurrentCoverUrlSync(entry) {
    if (isNativeGifFile(entry)) return null;
    
    if (entryFinalUrlCache.has(entry)) {
      return entryFinalUrlCache.get(entry);
    }

    if (!entryDecisionCache.has(entry)) {
      const allUrls = getAllPossibleCoverUrls(entry);
      if (allUrls.length === 1) {
        entryFinalUrlCache.set(entry, allUrls[0]);
      }
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
    
    const url = decision.allUrls[decision.currentIndex];
    if (!pluginConfig.enableGraftMode || decision.allUrls.length > 1) {
      entryFinalUrlCache.set(entry, url);
    }
    return url;
  }

  function markCurrentUrlFailed(entry, failedUrl) {
    if (isNativeGifFile(entry)) return;
    
    if (!entryDecisionCache.has(entry)) return;
    
    const decision = entryDecisionCache.get(entry);
    const normalizedUrl = normalizeUrlForKey(failedUrl);
    decision.triedUrls.add(normalizedUrl);
    decision.currentIndex++;
    entryFinalUrlCache.delete(entry);
    
    if (pluginConfig.enableGraftMode && decision.currentIndex >= decision.allUrls.length) {
      decision.triedUrls.clear();
    }
  }

  // ========== 移除點擊事件處理 ==========
  // 原 handleMediaClick 函數已移除

  // ========== 在Options界面中添加開關 ==========
  function insertCoverLoadToggle() {
    const optionsDialog = document.querySelector('.dialog[aria-modal="true"]');
    if (!optionsDialog || document.getElementById(COVER_TOGGLE_ID)) return;

    const themeSelect = document.getElementById('option-theme');
    if (!themeSelect) return;

    // 創建簡單的開關元素
    const toggleHTML = `
      <div id="${COVER_TOGGLE_ID}" style="display:block;margin-top:1em">
        <label style="display:block;cursor:pointer">
          <input type="checkbox" id="media-cover-load-checkbox">
          Show Media Cover Images
        </label>
      </div>
    `;

    // 插入到theme選擇器後面
    themeSelect.insertAdjacentHTML('afterend', toggleHTML);

    // 設置初始狀態
    const checkbox = document.getElementById('media-cover-load-checkbox');
    checkbox.checked = coverLoadEnabled;

    // 添加事件監聽
    checkbox.addEventListener('change', (e) => {
      const newState = e.target.checked;
      coverLoadEnabled = newState;
      setCoverLoadState(coverLoadEnabled);
      
      // 立即刷新列表
      HFS.reloadList();
    });
  }

  // ========== 監聽HFS導航事件 ==========
  function setupNavigationListener() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      handleNavigation();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      handleNavigation();
    };
    
    window.addEventListener('popstate', handleNavigation);
    
    HFS.onEvent('beforeNavigate', () => {
      isNavigating = true;
    });
    
    HFS.onEvent('navigated', () => {
      isNavigating = false;
      currentPath = window.location.pathname;
    });
  }
  
  function handleNavigation() {
    if (isNavigating) return;
    
    const newPath = window.location.pathname;
    if (newPath === currentPath) return;
    
    isNavigating = true;
    currentPath = newPath;
    
    if (navigationTimeout) {
      clearTimeout(navigationTimeout);
    }
    
    navigationTimeout = setTimeout(() => {
      isNavigating = false;
    }, 500);
  }

  // ========== 系統初始化 ==========
  function initializeSystem() {
    setupNavigationListener();
    
    // 監聽Options對話框的出現
    const observer = new MutationObserver((mutations) => {
      if (document.querySelector('.dialog-title')?.textContent?.includes('Options')) {
        setTimeout(insertCoverLoadToggle, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    setTimeout(() => {
      const mediaElements = document.querySelectorAll('.icon, .entry-icon, .media-icon, [class*="icon"]');
      mediaElements.forEach(element => {
        const parent = element.closest('[data-uri], [data-name]');
        if (parent && (parent.dataset.uri || parent.dataset.name)) {
          if (!window.MediaCoverPlugin) {
            window.MediaCoverPlugin = {};
          }
          if (!window.MediaCoverPlugin.registeredEntries) {
            window.MediaCoverPlugin.registeredEntries = [];
          }
        }
      });
    }, 500);
  }

  // 頁面加載後初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeSystem, 500);
    });
  } else {
    setTimeout(initializeSystem, 500);
  }

  // ========== React 圖片組件 ==========
  function ImgFallback({ fallback, tag = 'img', props, entry }) {
    // 如果封面加載被禁用，直接返回fallback
    if (!coverLoadEnabled) {
      return fallback && h(fallback);
    }
    
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
            
            const cacheKey = getImageCacheKey(el);
            if (cacheKey) {
              loadedImagesCache.set(cacheKey, {
                src: el.src,
                timestamp: Date.now()
              });
            }
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
          if (!pluginConfig.enableGraftMode) {
            setRetryKey(prev => prev + 1);
          } else {
            setErr(true);
          }
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
      loading: 'eager',
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
        // 移除了 onClick 事件
        role: 'img',
      };
      return h('span', props);
    }
    
    if (![...audioExts, ...videoExts].includes(ext)) return;
    
    const type = audioExts.includes(ext) ? 'audio' : 'video';
    const props = {
      className: `icon font-icon fa-${type} media-icon ${type} ${iconProps?.className || ''}`,
      title: iconProps?.title || `${type === 'audio' ? 'Audio' : 'Video'} file`,
      // 移除了 onClick 事件
      role: 'img',
    };
    
    const fallbackSpan = () => h('span', props);

    // 如果封面加載被禁用，直接返回圖標
    if (!coverLoadEnabled) {
      return h('span', props);
    }

    return h(ImgFallback, {
      fallback: fallbackSpan,
      props: {
        ...props,
        className: `${props.className} thumbnail passthrough`,
        loading: 'eager',
        decoding: 'async',
      },
      entry: entry,
    });
  });
}