// main.js - 完整的前端显示逻辑（修复版：lazyload 稳健性）
'use strict';
{
  const { h } = HFS;
  const pluginConfig = HFS.getPluginConfig?.() || {};
  const audioExts = ['mp3', 'flac', 'wav', 'ape', 'aac', 'ogg', 'm4a', 'alac', 'dsf', 'dsd', 'aif', 'aiff', 'opus'];
  const videoExts = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'mpeg', 'mpg', 'wmv', 'rmvb', 'rm', 'dat', 'ts', 'vob', 'flv', 'divx', 'm4v', '3gp'];

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

  // 全局 retry 监听：现在每个 listener 会收到“是否需要强制重试”的判断，
  // 只有 err === true 的实例才会真正重试（见 ImgFallback 内注册逻辑）。
  const globalRetryListeners = new Set();

  function triggerGlobalRetry() {
    for (const fn of globalRetryListeners) {
      try { fn(); } catch (e) {}
    }
  }

  const isListMode = () => {
    const listWrapper = document.querySelector('.list-wrapper');
    if (!listWrapper) return false;
    return listWrapper.classList.contains('list-mode');
  };

  const isFileShowMode = () => {
    return !!document.querySelector('.dialog-backdrop.file-show');
  };

  const isPluginActive = () => {
    if (pluginConfig.pauseInListMode !== false && isListMode()) {
      return false;
    }
    return true;
  };

  const debugMode = false;
  if (!debugMode) {
    console.log = function() {};
    console.warn = function() {};
    console.error = function() {};
    console.debug = function() {};
    console.info = function() {};
  }

  const errorCache = new Set();
  const loadedImagesCache = new Map();   // cacheKey -> { src, timestamp }
  const entryFinalUrlCache = new WeakMap();
  const entryDecisionCache = new WeakMap();
  // ★ 新增：entry 级“已加载成功”持久化，抗组件卸载重挂
  const entryLoadedCache = new WeakMap(); // entry -> finalSrc

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

  function isNativeGifFile(entry) {
    const ext = entry.ext?.toLowerCase();
    if (ext !== 'gif') return false;
    const url = getCurrentCoverUrlSync(entry);
    if (url && url.includes('/cache/videothumbnail/')) {
      return false;
    }
    return true;
  }

  function isCoverGif(entry) {
    const ext = entry.ext?.toLowerCase();
    if (ext !== 'gif') return false;
    const url = getCurrentCoverUrlSync(entry);
    if (url && url.includes('/cache/videothumbnail/')) {
      return true;
    }
    return false;
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
    // 失败的 URL 作废 entry 级已加载缓存，避免指向坏地址
    if (entryLoadedCache.has(entry)) {
      entryLoadedCache.delete(entry);
    }

    if (pluginConfig.enableGraftMode && decision.currentIndex >= decision.allUrls.length) {
      decision.triedUrls.clear();
    }
  }

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

  // ============================================================
  // 视口标记：给 img 加 in-view / 移除，替代“全量 suspend”
  // ============================================================
  let viewportObserver = null;
  const observedImgs = new WeakSet();

  function ensureViewportObserver() {
    if (viewportObserver) return viewportObserver;
    if (typeof IntersectionObserver === 'undefined') return null;

    viewportObserver = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const img = e.target;
        if (!(img instanceof HTMLElement)) continue;
        if (e.isIntersecting) {
          img.classList.add('in-view');
          // ★ 回到视口：如果之前被 suspend 剥掉了 src，尝试恢复
          restoreSuspendedSrc(img);
        } else {
          img.classList.remove('in-view');
        }
      }
    }, {
      root: null,
      rootMargin: '200px 0px', // 预取余量，减少上下滚动时反复“出/入”
      threshold: 0.01
    });

    return viewportObserver;
  }

  function observeImg(el) {
    const obs = ensureViewportObserver();
    if (!obs || !el || observedImgs.has(el)) return;
    try {
      obs.observe(el);
      observedImgs.add(el);
    } catch (e) {}
  }

  function unobserveImg(el) {
    if (!viewportObserver || !el) return;
    try {
      viewportObserver.unobserve(el);
    } catch (e) {}
    observedImgs.delete(el);
  }

  // ★ 核心修复：只有真正把 src 还回去，才删除 suspendedSrc
  function restoreSuspendedSrc(img) {
    if (!img || !img.dataset) return;
    const savedSrc = img.dataset.suspendedSrc;
    if (!savedSrc) return;

    // 如果滚动层仍挂起或 fileShow 仍挂起，先不动
    if (img.classList.contains('scroll-suspended')) return;
    if (isFileShowMode() && img.classList.contains('thumbnail-suspended')) {
      // fileShow 模式下保持挂起，等 resume 时再恢复
      return;
    }

    // 已经是这个 src 了，直接清理标记
    if (img.getAttribute('src') === savedSrc) {
      delete img.dataset.suspendedSrc;
      img.classList.remove('thumbnail-suspended');
      return;
    }

    try {
      img.setAttribute('src', savedSrc);
      // 只有 setAttribute 成功后才删除
      delete img.dataset.suspendedSrc;
      img.classList.remove('thumbnail-suspended');
    } catch (e) {}
  }

  // ============================================================
  // suspend / resume：现在只操作“非视口内”的图
  // ============================================================
  function suspendThumbnails() {
    try {
      const imgs = document.querySelectorAll('img.thumbnail.passthrough');
      for (const img of imgs) {
        // ★ 只挂起不在视口内的；视口内保留，避免已加载的 GIF 被剥掉
        if (img.classList.contains('in-view')) continue;
        // 已经是挂起状态的不重复处理
        if (img.classList.contains('thumbnail-suspended') && !img.getAttribute('src')) continue;

        const currentSrc = img.getAttribute('src');
        if (currentSrc) {
          img.dataset.suspendedSrc = currentSrc;
          img.removeAttribute('src');
        } else if (!img.dataset.suspendedSrc) {
          // 没有 src 也没有备份，说明本来就是空的，跳过
          continue;
        }
        img.classList.add('thumbnail-suspended');
      }
    } catch (e) {}
  }

  function resumeThumbnails() {
    try {
      const imgs = document.querySelectorAll('img.thumbnail.passthrough');
      for (const img of imgs) {
        // 视口内的优先恢复；非视口内的交给 IntersectionObserver / 下次滚动
        if (img.classList.contains('in-view')) {
          restoreSuspendedSrc(img);
        } else if (img.dataset.suspendedSrc) {
          // 非视口内：仅当滚动层不再挂起时才恢复，否则保留备份等待
          if (!img.classList.contains('scroll-suspended')) {
            restoreSuspendedSrc(img);
          }
          // 注意：restoreSuspendedSrc 内部已保证“成功 setAttribute 才删除备份”
        }
      }
    } catch (e) {}

    if (window.__resumeRetryTimer) clearTimeout(window.__resumeRetryTimer);
    window.__resumeRetryTimer = setTimeout(() => {
      triggerGlobalRetry();
    }, 150);
  }

  // 监听 scroll-suspended 类移除，补一次恢复（解决“类被移除但没人恢复 src”）
  function setupScrollSuspendObserver() {
    if (document.body.__scrollSuspendObserver) return;
    document.body.__scrollSuspendObserver = true;

    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type !== 'attributes' || m.attributeName !== 'class') continue;
        const el = m.target;
        if (!(el instanceof HTMLElement)) continue;
        if (!el.classList.contains('thumbnail')) continue;
        // scroll-suspended 被移除 -> 尝试恢复
        if (!el.classList.contains('scroll-suspended')) {
          restoreSuspendedSrc(el);
        }
      }
    });

    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true
    });
  }

  let heartbeatTimer = null;
  function startFileShowHeartbeat() {
    if (heartbeatTimer) return;
    heartbeatTimer = setInterval(() => {
      try {
        if (isFileShowMode()) {
          suspendThumbnails();
        }
      } catch (e) {}
    }, 1000);
    window.__fileShowHeartbeat = heartbeatTimer;
  }

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

  function setupViewModeObserver() {
    const listWrapper = document.querySelector('.list-wrapper');
    if (!listWrapper) return;

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

  function initializeSystem() {
    injectSuspendStyles();
    setTimeout(setupViewModeObserver, 500);
    setupScrollSuspendObserver();
    startFileShowHeartbeat();
    ensureViewportObserver();

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

    const loadedRef = HFS.React.useRef(false);
    const localSrcRef = HFS.React.useRef('');

    HFS.React.useEffect(() => {
      loadedRef.current = loaded;
    }, [loaded]);

    HFS.React.useEffect(() => {
      localSrcRef.current = localSrc;
    }, [localSrc]);

    const isGifCover = isCoverGif(entry);
    // ★ GIF 不再用原生 lazy，改由自定义 IntersectionObserver + suspend 控制
    const lazyLoading = false;

    const imageType = HFS.React.useMemo(() => {
      if (isNativeGifFile(entry)) {
        return 'native-gif';
      }
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
        if (imgRef.current) unobserveImg(imgRef.current);
      };
    }, []);

    // ★ 全局 retry：只有 err === true 的实例才真正重置，避免批量重载
    HFS.React.useEffect(() => {
      const fn = () => {
        if (!mountedRef.current) return;
        // 已成功加载的，一律不参与全局重试
        if (loadedRef.current && localSrcRef.current) return;
        // 只有真正失败的才重试
        if (!err) return;
        setErr(false);
        setLoaded(false);
        setRetryKey(prev => prev + 1);
      };
      globalRetryListeners.add(fn);
      return () => globalRetryListeners.delete(fn);
    }, [err]);

    HFS.React.useEffect(() => {
      if (imageType === 'native-gif') {
        setLocalSrc(entry.uri);
        return;
      }

      // ★ entry 级已加载缓存：卸载重挂后直接复用，不再请求
      if (entryLoadedCache.has(entry)) {
        const cachedSrc = entryLoadedCache.get(entry);
        if (cachedSrc) {
          setLocalSrc(cachedSrc);
          setErr(false);
          setLoaded(true);
          return;
        }
      }

      const url = getCurrentCoverUrlSync(entry);
      if (url) {
        // ★ 若 localSrc 已经是这个 url，不重复 set，避免无谓的 effect 触发
        if (localSrcRef.current === url) {
          setErr(false);
          return;
        }
        setLocalSrc(url);
        setErr(false);
      } else {
        setErr(true);
      }
    }, [entry, retryKey, imageType]);

    // ★ 挂载后开始视口观察
    HFS.React.useEffect(() => {
      if (imgRef.current) observeImg(imgRef.current);
    });

    const handleLoad = async (e) => {
      if (!mountedRef.current) return;
      try {
        const el = e.target;
        if (el.classList.contains('thumbnail-suspended') ||
            el.classList.contains('scroll-suspended')) return;
        delete el.dataset.suspendedSrc;
        el.classList.remove('thumbnail-suspended');
        setTimeout(() => {
          if (mountedRef.current) {
            setLoaded(true);
            el.classList.add('loaded');
            // ★ 持久化到 entry 级缓存，抗卸载重挂
            if (localSrcRef.current) {
              entryLoadedCache.set(entry, localSrcRef.current);
            }
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

    const handleError = (e) => {
      if (!mountedRef.current) return;
      if (e?.target?.classList?.contains('scroll-suspended') ||
          e?.target?.classList?.contains('thumbnail-suspended')) return;
      try {
        const normalizedUrl = normalizeUrlForKey(localSrc);
        errorCache.add(normalizedUrl);

        if (imageType === 'cover' || imageType === 'cover-gif') {
          markCurrentUrlFailed(entry, localSrc);
          const next = getCurrentCoverUrlSync(entry);
          if (next && next !== localSrc) {
            setLocalSrc(next);
          } else {
            setErr(true);
          }
        } else {
          setErr(true);
        }
      } catch (error) {}
    };

    // ★ 命中 entry 级缓存时直接显示已加载态，跳过 loading 空窗
    const cachedLoadedSrc = entryLoadedCache.get(entry);
    if (err || !localSrc) {
      return fallback && h(fallback);
    }

    return h(tag, {
      ...props,
      src: localSrc,
      ref: (el) => {
        imgRef.current = el;
        if (el) observeImg(el);
        if (props.ref) props.ref(el);
      },
      className: `${props.className || ''} thumbnail passthrough ${loaded || cachedLoadedSrc ? 'loaded' : 'loading'} ${imageType}`,
      onLoad: handleLoad,
      onError: handleError,
      loading: lazyLoading ? 'lazy' : 'eager',
      decoding: 'async'
    });
  }

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