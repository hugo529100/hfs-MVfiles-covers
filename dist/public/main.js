// main.js - 完整的前端显示逻辑
'use strict';
{
  const { h } = HFS;
  const pluginConfig = HFS.getPluginConfig?.() || {};
  const audioExts = ['mp3', 'flac', 'wav', 'ape', 'aac', 'ogg', 'm4a', 'alac', 'dsf', 'dsd', 'aif', 'aiff', 'opus'];
  const videoExts = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'mpeg', 'mpg', 'wmv', 'rmvb', 'rm', 'dat', 'ts', 'vob', 'flv', 'divx', 'm4v', '3gp'];
  
  // ========== 封面加载开关设置 ==========
  const STORAGE_KEY_COVER_LOAD = 'hfs_media_cover_load_enabled';
  const COVER_TOGGLE_ID = 'media-cover-load-toggle';
  
  const isLocalStorageSupported = () => {
    try {
      localStorage.setItem('test', '1');
      localStorage.removeItem('test');
      return true;
    } catch (e) {
      return false;
    }
  };

  const getCoverLoadState = () => {
    if (!isLocalStorageSupported()) return true;
    const val = localStorage.getItem(STORAGE_KEY_COVER_LOAD);
    return val === null ? true : val === 'true';
  };

  const setCoverLoadState = (value) => {
    if (isLocalStorageSupported()) {
      localStorage.setItem(STORAGE_KEY_COVER_LOAD, value ? 'true' : 'false');
    }
  };

  let coverLoadEnabled = getCoverLoadState();

  // ========== 静默化控制台日志 ==========
  const debugMode = false;
  if (!debugMode) {
    console.log = function() {};
    console.warn = function() {};
    console.error = function() {};
    console.debug = function() {};
    console.info = function() {};
  }

  // ========== 全局缓存和状态 ==========
  const errorCache = new Set();
  const loadedImagesCache = new Map();
  let entryFinalUrlCache = new WeakMap();
  let entryDecisionCache = new WeakMap();

  // ========== 工具函数 ==========
  function normalizeUrlForKey(url) {
    try {
      const u = new URL(url, location.origin);
      return u.href.split('?')[0].toLowerCase();
    } catch (e) {
      return (url || '').split('?')[0].toLowerCase();
    }
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

  // ========== 检查是否为原生GIF文件 ==========
  function isNativeGifFile(entry) {
    const ext = entry.ext?.toLowerCase();
    if (ext !== 'gif') return false;
    
    const url = getCurrentCoverUrlSync(entry);
    if (url && url.includes('/cache/videothumbnail/')) {
      return false;
    }
    return true;
  }

  // ========== 判断是否为封面GIF（视频生成的GIF缩略图） ==========
  function isCoverGif(entry) {
    const ext = entry.ext?.toLowerCase();
    if (ext !== 'gif') return false;
    
    const url = getCurrentCoverUrlSync(entry);
    if (url && url.includes('/cache/videothumbnail/')) {
      return true;
    }
    return false;
  }

  // ========== 单一路径模式：封面URL处理 ==========
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
    
    if (pluginConfig.enableGraftMode) {
      if (isAudio) {
        if (pluginConfig.graftMusicCovers !== false) {
          // 音乐封面：使用 ?get=thumb 参数
          urls.push(`${pluginConfig.graftPath}${baseUri}cache/covers/${name}.jpg?get=thumb`);
        } else {
          return [];
        }
      } else if (isVideo) {
        if (pluginConfig.graftVideoCovers !== false) {
          if (format === 'gif') {
            // GIF 格式：不加 ?get=thumb 参数，使用原始地址
            urls.push(`${pluginConfig.graftPath}${baseUri}cache/videothumbnail/${name}.gif`);
          } else {
            // JPG 格式：加 ?get=thumb 参数
            urls.push(`${pluginConfig.graftPath}${baseUri}cache/videothumbnail/${name}.jpg?get=thumb`);
          }
        } else {
          return [];
        }
      }
    } else {
      if (isAudio) {
        // 音乐封面：使用 ?get=thumb 参数
        urls.push(`${baseUri}cache/covers/${name}.jpg?get=thumb`);
      } else if (isVideo) {
        if (format === 'gif') {
          // GIF 格式：不加 ?get=thumb 参数，使用原始地址
          urls.push(`${baseUri}cache/videothumbnail/${name}.gif`);
        } else {
          // JPG 格式：加 ?get=thumb 参数
          urls.push(`${baseUri}cache/videothumbnail/${name}.jpg?get=thumb`);
        }
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

  // ========== 在Options界面中添加开关 ==========
  function insertCoverLoadToggle() {
    const optionsDialog = document.querySelector('.dialog[aria-modal="true"]');
    if (!optionsDialog || document.getElementById(COVER_TOGGLE_ID)) return;

    const themeSelect = document.getElementById('option-theme');
    if (!themeSelect) return;

    const toggleHTML = `
      <div id="${COVER_TOGGLE_ID}" style="display:block;margin-top:1em">
        <label style="display:block;cursor:pointer">
          <input type="checkbox" id="media-cover-load-checkbox">
          Show Media Cover Images
        </label>
      </div>
    `;

    themeSelect.insertAdjacentHTML('afterend', toggleHTML);

    const checkbox = document.getElementById('media-cover-load-checkbox');
    checkbox.checked = coverLoadEnabled;

    checkbox.addEventListener('change', (e) => {
      const newState = e.target.checked;
      coverLoadEnabled = newState;
      setCoverLoadState(coverLoadEnabled);
      HFS.reloadList();
    });
  }

  // ========== 系统初始化 ==========
  function initializeSystem() {
    const observer = new MutationObserver((mutations) => {
      if (document.querySelector('.dialog-title')?.textContent?.includes('Options')) {
        setTimeout(insertCoverLoadToggle, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeSystem, 500);
    });
  } else {
    setTimeout(initializeSystem, 500);
  }

  // ========== React 图片组件 ==========
  function ImgFallback({ fallback, tag = 'img', props, entry }) {
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

    // 检查是否应该是懒加载：仅对 GIF 封面启用懒加载
    const isGifCover = isCoverGif(entry);
    const lazyLoading = pluginConfig.lazyLoading !== false && isGifCover;

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
      
      initTimeoutRef.current = setTimeout(() => {
        if (!isActive || !mountedRef.current) return;
        
        const initializeImage = async () => {
          try {
            const currentUrl = getCurrentCoverUrlSync(entry);
            
            if (!currentUrl) {
              if (isActive) setErr(true);
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
      }, 300);

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
      loading: lazyLoading ? 'lazy' : 'eager',
      decoding: 'async'
    });
  }

  // ========== 事件监听 ==========
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
        role: 'img',
      };
      return h('span', props);
    }
    
    if (![...audioExts, ...videoExts].includes(ext)) return;
    
    const type = audioExts.includes(ext) ? 'audio' : 'video';
    const props = {
      className: `icon font-icon fa-${type} media-icon ${type} ${iconProps?.className || ''}`,
      title: iconProps?.title || `${type === 'audio' ? 'Audio' : 'Video'} file`,
      role: 'img',
    };
    
    const fallbackSpan = () => h('span', props);

    if (!coverLoadEnabled) {
      return h('span', props);
    }

    // 判断是否为 GIF 封面，如果是则应用懒加载
    const isGifCover = isCoverGif(entry);
    const lazyLoading = pluginConfig.lazyLoading !== false && isGifCover;

    return h(ImgFallback, {
      fallback: fallbackSpan,
      props: {
        ...props,
        className: `${props.className} thumbnail passthrough`,
        loading: lazyLoading ? 'lazy' : 'eager',
        decoding: 'async',
      },
      entry: entry,
    });
  });
}