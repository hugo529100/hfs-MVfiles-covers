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

  // ========== 检测当前是否为列表模式 ==========
  const isListMode = () => {
    const listWrapper = document.querySelector('.list-wrapper');
    if (!listWrapper) return false;
    return listWrapper.classList.contains('list-mode');
  };

  // ========== 检测当前是否为文件预览/播放界面 ==========
  const isFileShowMode = () => {
    return !!document.querySelector('.dialog-backdrop.file-show');
  };

  // ========== 检测插件是否应处于活动状态 ==========
  const isPluginActive = () => {
    if (pluginConfig.pauseInListMode !== false && isListMode()) {
      return false;
    }
    if (pluginConfig.pauseInFileShow !== false && isFileShowMode()) {
      return false;
    }
    return true;
  };

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

  // ========== 判断是否为封面GIF ==========
  function isCoverGif(entry) {
    const ext = entry.ext?.toLowerCase();
    if (ext !== 'gif') return false;
    const url = getCurrentCoverUrlSync(entry);
    if (url && url.includes('/cache/videothumbnail/')) {
      return true;
    }
    return false;
  }

  // ========== 封面URL处理 ==========
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
          urls.push(`${pluginConfig.graftPath}${baseUri}cache/covers/${name}.jpg?get=thumb`);
        } else {
          return [];
        }
      } else if (isVideo) {
        if (pluginConfig.graftVideoCovers !== false) {
          if (format === 'gif') {
            urls.push(`${pluginConfig.graftPath}${baseUri}cache/videothumbnail/${name}.gif`);
          } else {
            urls.push(`${pluginConfig.graftPath}${baseUri}cache/videothumbnail/${name}.jpg?get=thumb`);
          }
        } else {
          return [];
        }
      }
    } else {
      if (isAudio) {
        urls.push(`${baseUri}cache/covers/${name}.jpg?get=thumb`);
      } else if (isVideo) {
        if (format === 'gif') {
          urls.push(`${baseUri}cache/videothumbnail/${name}.gif`);
        } else {
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

  // ========== Options 界面开关 ==========
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

  // ========== 缩略图暂停 / 恢复（DOM 就地替换，不刷新列表） ==========

  // 把当前列表中所有已加载的缩略图暂时“撤下”，换回普通图标外观。
  // 注意：不移除 <img> 元素，只是把 src 保存到 dataset 并清空，同时加一个 class 隐藏它。
  // 这样 React 的 DOM 结构不变，关闭 fileshow 后可以精确还原，不会闪烁。
  function suspendThumbnails() {
    try {
      const imgs = document.querySelectorAll('img.thumbnail.passthrough');
      for (const img of imgs) {
        if (img.dataset.suspendedSrc) continue; // 已暂停过，跳过
        const currentSrc = img.getAttribute('src');
        if (currentSrc) {
          img.dataset.suspendedSrc = currentSrc;
        }
        // 清空 src，浏览器不会继续请求，视觉上回退到父容器的背景/图标
        img.removeAttribute('src');
        img.classList.add('thumbnail-suspended');
      }
    } catch (e) {}
  }

  // 恢复被暂停的缩略图
  function resumeThumbnails() {
    try {
      const imgs = document.querySelectorAll('img.thumbnail.passthrough.thumbnail-suspended');
      for (const img of imgs) {
        const savedSrc = img.dataset.suspendedSrc;
        if (savedSrc) {
          img.setAttribute('src', savedSrc);
          delete img.dataset.suspendedSrc;
        }
        img.classList.remove('thumbnail-suspended');
      }
    } catch (e) {}
  }

  // ========== 注入样式：让被暂停的 img 不占据视觉空间，露出底层图标 ==========
  function injectSuspendStyles() {
    if (document.getElementById('media-cover-suspend-style')) return;
    const style = document.createElement('style');
    style.id = 'media-cover-suspend-style';
    style.textContent = `
      img.thumbnail.passthrough.thumbnail-suspended {
        opacity: 0 !important;
        visibility: hidden !important;
      }
    `;
    document.head.appendChild(style);
  }

  // ========== 监听视图模式切换 与 fileshow 界面出现/消失 ==========
  function setupViewModeObserver() {
    const listWrapper = document.querySelector('.list-wrapper');
    if (!listWrapper) return;

    // 监听列表模式切换（保持原有行为：刷新列表）
    if (!listWrapper.__viewObserver) {
      const listObserver = new MutationObserver(() => {
        HFS.reloadList();
      });
      listObserver.observe(listWrapper, {
        attributes: true,
        attributeFilter: ['class']
      });
      listWrapper.__viewObserver = true;
    }

    // 监听 fileshow 界面出现/消失 —— 只暂停/恢复缩略图，不刷新列表
    if (!document.body.__fileShowObserver) {
      let lastFileShowState = isFileShowMode();
      let fileShowTimer = null;

      const fileShowObserver = new MutationObserver(() => {
        const nowFileShow = isFileShowMode();
        if (nowFileShow !== lastFileShowState) {
          clearTimeout(fileShowTimer);
          fileShowTimer = setTimeout(() => {
            lastFileShowState = nowFileShow;
            if (nowFileShow) {
              suspendThumbnails();
            } else {
              resumeThumbnails();
            }
          }, 100);
        }
      });
      fileShowObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
      document.body.__fileShowObserver = true;
    }
  }

  // ========== 系统初始化 ==========
  function initializeSystem() {
    injectSuspendStyles();
    setTimeout(setupViewModeObserver, 500);

    const observer = new MutationObserver(() => {
      if (document.querySelector('.dialog-title')?.textContent?.includes('Options')) {
        setTimeout(insertCoverLoadToggle, 100);
      }
      const listWrapper = document.querySelector('.list-wrapper');
      if (!listWrapper) return;
      if (!listWrapper.__viewObserver || !document.body.__fileShowObserver) {
        setupViewModeObserver();
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
    if (!isPluginActive()) {
      return fallback && h(fallback);
    }

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

    if (!isPluginActive()) {
      const type = audioExts.includes(ext) ? 'audio' : 'video';
      const props = {
        className: `icon font-icon fa-${type} media-icon ${type} ${iconProps?.className || ''}`,
        title: iconProps?.title || `${type === 'audio' ? 'Audio' : 'Video'} file`,
        role: 'img',
      };
      return h('span', props);
    }

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