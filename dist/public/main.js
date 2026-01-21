'use strict';
{
  const { h } = HFS;
  const pluginConfig = HFS.getPluginConfig?.() || {};
  const audioExts = ['mp3', 'flac', 'wav', 'ape', 'aac', 'ogg', 'm4a', 'alac', 'dsf', 'dsd', 'aif', 'aiff'];
  const videoExts = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'mpeg', 'mpg', 'wmv', 'rmvb', 'rm', 'dat', 'ts', 'vob', 'flv'];
  
  // ========== 靜默化控制台日志 ==========
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
      COVER_DELAY: 500,
      REGULAR_DELAY: 200,
    }
  };

  // ========== 全局緩存和狀態 ==========
  const errorCache = new Set();
  const thumbCache = new WeakSet();
  const processingUrls = new Set();
  const entryFinalUrlCache = new WeakMap();
  const entryDecisionCache = new WeakMap();
  const loadedImagesCache = new Map();
  const clickLock = new WeakMap(); // 防止重复点击
  
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
      // 嫁接模式：强制指向自定義路徑，無回退機制
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
    
    return urls; // 在嫁接模式下，這裡只返回一個URL（強制指向）
  }

  function getCurrentCoverUrlSync(entry) {
    if (isNativeGifFile(entry)) return null;
    
    if (entryFinalUrlCache.has(entry)) {
      return entryFinalUrlCache.get(entry);
    }

    if (!entryDecisionCache.has(entry)) {
      const allUrls = getAllPossibleCoverUrls(entry);
      // 嫁接模式下只有一個URL，直接設置為最終URL
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
    // 只在非嫁接模式或有多個URL時緩存
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
    
    // 在嫁接模式下，如果第一個URL失敗，就沒有其他URL可嘗試
    if (pluginConfig.enableGraftMode && decision.currentIndex >= decision.allUrls.length) {
      // 可以考慮在這裡設置一個標記，避免重複嘗試
      decision.triedUrls.clear(); // 清理已嘗試的URL
    }
  }

  // ========== 事件處理 ==========
  function handleMediaClick(entry, e) {
    // 防止重复点击
    if (clickLock.has(entry)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    clickLock.set(entry, true);
    setTimeout(() => clickLock.delete(entry), 1000);
    
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
      
      // 清理緩存
      errorCache.clear();
      loadedImagesCache.clear();
      processingUrls.clear();
      clickLock.clear();
      
      // 清理條目緩存
      const entries = window.MediaCoverPlugin?.registeredEntries || [];
      entries.forEach(({ entry }) => {
        entryFinalUrlCache.delete(entry);
        entryDecisionCache.delete(entry);
      });
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
      
      // 清理緩存
      errorCache.clear();
      loadedImagesCache.clear();
      processingUrls.clear();
      clickLock.clear();
      
      // 清理條目緩存
      const entries = window.MediaCoverPlugin?.registeredEntries || [];
      entries.forEach(({ entry }) => {
        entryFinalUrlCache.delete(entry);
        entryDecisionCache.delete(entry);
      });
    }, 500);
  }

  // ========== 系統初始化 ==========
  function initializeSystem() {
    setupNavigationListener();
    
    // 註冊所有現有的媒體條目
    setTimeout(() => {
      const mediaElements = document.querySelectorAll('.icon, .entry-icon, .media-icon, [class*="icon"]');
      mediaElements.forEach(element => {
        const parent = element.closest('[data-uri], [data-name]');
        if (parent && (parent.dataset.uri || parent.dataset.name)) {
          // 這裡不需要做任何懶加載處理，只註冊條目
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
          // 在嫁接模式下，如果URL失敗，就直接顯示fallback，不重試
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
      loading: 'eager', // 改為立即加載
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
        loading: 'eager', // 改為立即加載
        decoding: 'async',
      },
      entry: entry,
    });
  });

  // ========== 清理函數 ==========
  window.addEventListener('beforeunload', () => {
    try {
      if (navigationTimeout) {
        clearTimeout(navigationTimeout);
      }
      
      // 清理所有緩存
      errorCache.clear();
      loadedImagesCache.clear();
      processingUrls.clear();
      clickLock.clear();
      entryFinalUrlCache = new WeakMap();
      entryDecisionCache = new WeakMap();
      
      if (window.MediaCoverPlugin) {
        window.MediaCoverPlugin.registeredEntries = [];
      }
    } catch (error) {}
  });
}