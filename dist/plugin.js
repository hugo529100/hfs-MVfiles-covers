exports.repo = "Hug3O/MVfiles-covers"
exports.version = 7.3
exports.description = "Complete media cover/thumbnail extraction and display system - supports video GIF/JPG thumbnails and audio cover extraction"
exports.apiRequired = 12.91
exports.frontend_js = 'main.js'
exports.frontend_css = 'style.css'
exports.depend = [{ "repo": "rejetto/thumbnails", "version": 4 }]
exports.afterPlugin = 'Musicplayer+'

// ================ Configuration Panel ================
exports.config = {
  // ============================================
  // === Configuration Group Selector ===
  // ============================================
  config_tab: {
    type: 'select',
    defaultValue: 'display',
    options: {
      '1. Display': 'display',
      '2. Graft Mode': 'graft',
      '3. Extraction': 'extraction',
      '4. GIF Parameters': 'gif',
      '5. System': 'system'
    },
    label: "Configuration Category",
    helperText: "Select a category to view and edit settings.",
    frontend: true
  },

  // ============================================
  // === 1. Display ===
  // ============================================
  videoThumbFormat: {
    showIf: values => values.config_tab === 'display',
    type: 'select',
    options: [
      { value: 'jpg', label: 'JPG (Static)' },
      { value: 'gif', label: 'GIF (Animated)' }
    ],
    defaultValue: 'gif',
    frontend: true,
    label: 'Video Thumbnail Format',
    helperText: 'Preferred thumbnail format for videos'
  },
  lazyLoading: {
    showIf: values => values.config_tab === 'display',
    type: 'boolean',
    defaultValue: true,
    frontend: true,
    label: 'Lazy Loading for GIFs',
    helperText: 'Enable lazy loading for GIF thumbnails (reduces initial page load)',
    xs: 6
  },

  // ============================================
  // === 2. Graft Mode ===
  // ============================================
  enableGraftMode: {
    showIf: values => values.config_tab === 'graft',
    type: 'boolean',
    defaultValue: false,
    frontend: true,
    label: 'Enable Single-Path Graft Mode',
    helperText: 'When enabled, all cover paths will be redirected to the specified path below'
  },
  graftPath: {
    showIf: values => values.config_tab === 'graft' && values.enableGraftMode,
    type: 'vfs_path',
    label: 'Graft Path',
    folders: true,
    files: false,
    multiple: false,
    frontend: true,
    defaultValue: '/images/cache',
    helperText: 'Unified storage path for all media covers'
  },
  graftVideoCovers: {
    showIf: values => values.config_tab === 'graft' && values.enableGraftMode,
    type: 'boolean',
    defaultValue: true,
    frontend: true,
    label: 'Graft Video Covers',
    helperText: 'When enabled, video thumbnails will be stored in the graft path'
  },
  graftMusicCovers: {
    showIf: values => values.config_tab === 'graft' && values.enableGraftMode,
    type: 'boolean',
    defaultValue: true,
    frontend: true,
    label: 'Graft Music Covers',
    helperText: 'When enabled, music covers will be stored in the graft path'
  },

  // ============================================
  // === 3. Extraction ===
  // ============================================
  extract_video_thumbnails: {
    showIf: values => values.config_tab === 'extraction',
    type: 'boolean',
    defaultValue: true,
    label: 'Enable Video Thumbnail Extraction',
    helperText: 'Extract thumbnails from video files',
    xs: 6
  },
  extract_covers: {
    showIf: values => values.config_tab === 'extraction',
    type: 'boolean',
    defaultValue: true,
    label: 'Enable Audio Cover Extraction',
    helperText: 'Extract embedded cover art from audio files',
    xs: 6
  },
  ffmpeg_path: {
    showIf: values => values.config_tab === 'extraction',
    type: 'real_path',
    fileMask: 'ffmpeg*',
    defaultValue: '',
    label: 'FFmpeg Path',
    helperText: 'Path to FFmpeg executable. Leave empty to use system PATH.',
    xs: 8
  },

  // ============================================
  // === 4. GIF Parameters ===
  // ============================================
  video_size_threshold: {
    showIf: values => values.config_tab === 'gif' && values.extract_video_thumbnails && values.videoThumbFormat === 'gif',
    type: 'number',
    defaultValue: 250,
    min: 1,
    max: 10000,
    label: 'Video Size Threshold (MB)',
    helperText: 'Videos larger than this will use long video settings',
    xs: 6
  },
  gif_width: {
    showIf: values => values.config_tab === 'gif' && values.extract_video_thumbnails && values.videoThumbFormat === 'gif',
    type: 'number',
    min: 100,
    max: 800,
    defaultValue: 320,
    label: 'GIF Width (pixels)',
    helperText: 'Output GIF width, height auto-scaled',
    xs: 6
  },

  // Short Video Settings
  short_video_start_time: {
    showIf: values => values.config_tab === 'gif' && values.extract_video_thumbnails && values.videoThumbFormat === 'gif',
    type: 'string',
    defaultValue: '00:04:00',
    label: 'Short Video Start Time (HH:MM:SS)',
    xs: 6
  },
  short_video_duration: {
    showIf: values => values.config_tab === 'gif' && values.extract_video_thumbnails && values.videoThumbFormat === 'gif',
    type: 'number',
    min: 1,
    max: 60,
    defaultValue: 10,
    label: 'Short Video GIF Duration (seconds)',
    xs: 6
  },
  short_video_fps: {
    showIf: values => values.config_tab === 'gif' && values.extract_video_thumbnails && values.videoThumbFormat === 'gif',
    type: 'number',
    min: 1,
    max: 30,
    defaultValue: 5,
    label: 'Short Video GIF FPS',
    xs: 6
  },

  // Long Video Settings
  long_video_start_time: {
    showIf: values => values.config_tab === 'gif' && values.extract_video_thumbnails && values.videoThumbFormat === 'gif',
    type: 'string',
    defaultValue: '00:10:00',
    label: 'Long Video Start Time (HH:MM:SS)',
    xs: 6
  },
  long_video_duration: {
    showIf: values => values.config_tab === 'gif' && values.extract_video_thumbnails && values.videoThumbFormat === 'gif',
    type: 'number',
    min: 1,
    max: 60,
    defaultValue: 12,
    label: 'Long Video GIF Duration (seconds)',
    xs: 6
  },
  long_video_fps: {
    showIf: values => values.config_tab === 'gif' && values.extract_video_thumbnails && values.videoThumbFormat === 'gif',
    type: 'number',
    min: 1,
    max: 30,
    defaultValue: 6,
    label: 'Long Video GIF FPS',
    xs: 6
  },

  // Backup Settings
  backup_video_start_time: {
    showIf: values => values.config_tab === 'gif' && values.extract_video_thumbnails && values.videoThumbFormat === 'gif',
    type: 'string',
    defaultValue: '00:00:00',
    label: 'Backup Start Time (HH:MM:SS)',
    xs: 6
  },
  backup_video_duration: {
    showIf: values => values.config_tab === 'gif' && values.extract_video_thumbnails && values.videoThumbFormat === 'gif',
    type: 'number',
    min: 1,
    max: 60,
    defaultValue: 6,
    label: 'Backup GIF Duration (seconds)',
    xs: 6
  },
  backup_video_fps: {
    showIf: values => values.config_tab === 'gif' && values.extract_video_thumbnails && values.videoThumbFormat === 'gif',
    type: 'number',
    min: 1,
    max: 30,
    defaultValue: 5,
    label: 'Backup GIF FPS',
    xs: 6
  },

  // JPG Parameters
  thumbnail_time: {
    showIf: values => values.config_tab === 'gif' && values.extract_video_thumbnails && values.videoThumbFormat === 'jpg',
    type: 'string',
    defaultValue: '00:00:05',
    label: 'JPG Thumbnail Time Position',
    helperText: 'Time position for JPG thumbnail extraction (HH:MM:SS)',
    xs: 6
  },

  // ============================================
  // === 5. System ===
  // ============================================
  max_concurrent_thumbnail: {
    showIf: values => values.config_tab === 'system',
    type: 'number',
    min: 1,
    max: 10,
    defaultValue: 2,
    label: 'Max Concurrent Thumbnail Processes',
    helperText: 'Maximum number of concurrent FFmpeg thumbnail extraction processes',
    xs: 6
  },
  thumbnail_debounce_delay: {
    showIf: values => values.config_tab === 'system',
    type: 'number',
    min: 500,
    max: 10000,
    defaultValue: 2000,
    label: 'Debounce Delay (ms)',
    helperText: 'Debounce delay for thumbnail extraction of the same file',
    xs: 6
  },
  debug_ffmpeg: {
    showIf: values => values.config_tab === 'system',
    type: 'boolean',
    defaultValue: false,
    label: 'Debug Mode',
    helperText: 'Enable FFmpeg and thumbnail cleanup debug logging',
    xs: 6
  },
  cleanupEnabled: {
    showIf: values => values.config_tab === 'system',
    type: 'boolean',
    defaultValue: true,
    label: 'Auto-clean orphan thumbnails',
    helperText: 'Remove thumbnails and covers whose media file no longer exists. Runs when a folder is listed and right after a file is deleted (built-in safety: only files older than 60 minutes, at most one check every 10 minutes per folder).',
    xs: 6
  }
}

exports.configDialog = { maxWidth: '55em' }

exports.changelog = [
  { version: 7.2, message: "Added 'Auto-clean orphan thumbnails' switch in the System tab, with built-in safety limits. Pause-in-list-mode is now always active and no longer configurable." },
  { version: 6.4, message: "Added pauseInListMode option - hides covers in list mode" },
  { version: 6.3, message: "Added lazyLoading option for GIF thumbnails" },
  { version: 6.0, message: "Merged thumbnail extraction system - complete media cover/thumbnail solution" },
  { version: 5.9, message: "Added single-path graft mode support" },
  { version: 5.8, message: "Optimized cover loading performance" },
  { version: 5.7, message: "Added GIF format support" }
]

// ================ Backend Main Logic ================
exports.init = api => {
  const { join, basename, dirname } = api.require('path')
  const fs = api.require('fs')
  const fsp = fs.promises
  const { spawn } = api.require('child_process')

  const CACHE_DIR = 'cache'
  const COVERS_DIR = 'covers'
  const VIDEO_THUMBNAIL_DIR = 'videothumbnail'
  const TEMP_PREFIX = 'tmp_'
  const MIN_FILE_SIZE = 1024

  // ================ Debug Log Function ================
  function debugLog(message) {
    if (api.getConfig('debug_ffmpeg')) {
      api.log(`[Thumbnail] ${message}`)
    }
  }

  // ================ Thumbnail Queue Manager ================
  class ThumbnailQueue {
    constructor() {
      this.queue = []
      this.currentProcesses = new Map()
      this.processedCount = 0
      this.failedCount = 0
      this.isProcessing = false
      this.maxConcurrent = api.getConfig('max_concurrent_thumbnail') || 2
      this.pendingDebounce = new Map()
      this.processTimers = new Map()
    }

    add(task) {
      return new Promise((resolve, reject) => {
        this.queue.push({ task, resolve, reject, addedAt: Date.now() })
        debugLog(`[Queue] Task enqueued (queue length: ${this.queue.length})`)
        this.processQueue()
      })
    }

    async processQueue() {
      if (this.isProcessing) return
      if (this.queue.length === 0) return
      if (this.currentProcesses.size >= this.maxConcurrent) {
        debugLog(`[Queue] Max concurrent reached (${this.currentProcesses.size}/${this.maxConcurrent})`)
        return
      }

      this.isProcessing = true

      try {
        while (this.queue.length > 0 && this.currentProcesses.size < this.maxConcurrent) {
          const item = this.queue.shift()
          const { task, resolve, reject } = item

          this.executeTask(task)
            .then(result => {
              this.processedCount++
              debugLog(`[Queue] Task succeeded (success: ${this.processedCount}, failed: ${this.failedCount})`)
              resolve(result)
            })
            .catch(error => {
              this.failedCount++
              debugLog(`[Queue] Task failed: ${error.message}`)
              reject(error)
            })
            .finally(() => {
              this.isProcessing = false
              setImmediate(() => this.processQueue())
            })
        }
      } finally {
        if (this.queue.length > 0 && this.currentProcesses.size < this.maxConcurrent) {
          this.isProcessing = false
          setImmediate(() => this.processQueue())
        } else {
          this.isProcessing = false
        }
      }
    }

    async executeTask(task) {
      const { filePath, thumbnailPath, params, type } = task

      const processKey = `${basename(filePath)}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
      this.currentProcesses.set(processKey, {
        startTime: Date.now(),
        filePath,
        type
      })

      const timer = setTimeout(() => {
        if (this.currentProcesses.has(processKey)) {
          debugLog(`[Queue] Task timeout: ${basename(filePath)}`)
          this.currentProcesses.delete(processKey)
        }
      }, 120000)
      this.processTimers.set(processKey, timer)

      try {
        let result
        switch (type) {
          case 'gif':
            result = await this.generateGif(filePath, thumbnailPath, params)
            break
          case 'jpg':
            result = await this.generateJpg(filePath, thumbnailPath, params)
            break
          case 'cover':
            result = await this.extractCover(filePath, thumbnailPath)
            break
          default:
            throw new Error(`Unknown task type: ${type}`)
        }
        debugLog(`[Queue] [${type}] Completed: ${basename(filePath)}`)
        return result
      } finally {
        clearTimeout(this.processTimers.get(processKey))
        this.processTimers.delete(processKey)
        this.currentProcesses.delete(processKey)
      }
    }

    getFFmpegPath() {
      return api.getConfig('ffmpeg_path') || 'ffmpeg'
    }

    async generateGif(filePath, thumbnailPath, params) {
      const startTime = params.startTime || 60
      const duration = params.duration || 10
      const fps = params.fps || 5
      const width = params.width || 320

      debugLog(`[GIF] Params: start=${startTime}s, duration=${duration}s, FPS=${fps}, width=${width}`)

      const palettePath = thumbnailPath.replace('.gif', '_palette.png')
      const ffmpeg = this.getFFmpegPath()

      // Step 1: Generate palette
      const paletteArgs = [
        '-ss', formatTimeFromSeconds(startTime),
        '-t', '5',
        '-i', filePath,
        '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen`,
        '-y', palettePath
      ]

      const paletteProc = spawn(ffmpeg, paletteArgs)

      await new Promise((resolve, reject) => {
        let stderr = ''
        paletteProc.stderr.on('data', data => { stderr += data.toString() })

        paletteProc.on('exit', code => {
          cleanupProcess(paletteProc)
          if (code !== 0) {
            fsp.unlink(palettePath).catch(() => {})
            reject(new Error(`Palette generation failed (${code}): ${stderr}`))
          } else {
            resolve()
          }
        })
        paletteProc.on('error', reject)
      })

      // Step 2: Generate GIF
      const gifArgs = [
        '-ss', formatTimeFromSeconds(startTime),
        '-t', duration.toString(),
        '-i', filePath,
        '-i', palettePath,
        '-filter_complex', `fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
        '-loop', '0',
        '-f', 'gif',
        '-y', thumbnailPath
      ]

      const gifProc = spawn(ffmpeg, gifArgs)

      return new Promise((resolve, reject) => {
        let stderr = ''
        gifProc.stderr.on('data', data => { stderr += data.toString() })

        gifProc.on('exit', async code => {
          cleanupProcess(gifProc)
          await fsp.unlink(palettePath).catch(() => {})

          if (code === 0) {
            try {
              const stats = await fsp.stat(thumbnailPath)
              if (stats.size > 0) {
                resolve(true)
              } else {
                await fsp.unlink(thumbnailPath).catch(() => {})
                reject(new Error('Generated GIF is 0 bytes'))
              }
            } catch (err) {
              reject(err)
            }
          } else {
            await fsp.unlink(thumbnailPath).catch(() => {})
            reject(new Error(`GIF generation failed (${code})`))
          }
        })
        gifProc.on('error', async (err) => {
          cleanupProcess(gifProc)
          await fsp.unlink(palettePath).catch(() => {})
          await fsp.unlink(thumbnailPath).catch(() => {})
          reject(err)
        })
      })
    }

    async generateJpg(filePath, thumbnailPath, params) {
      const time = params.time || '00:00:05'
      const ffmpeg = this.getFFmpegPath()

      const proc = spawn(ffmpeg, [
        '-ss', time,
        '-i', filePath,
        '-vframes', '1',
        '-q:v', '2',
        '-f', 'image2',
        thumbnailPath
      ])

      return new Promise((resolve, reject) => {
        let stderr = ''
        proc.stderr.on('data', data => { stderr += data.toString() })

        proc.on('exit', code => {
          cleanupProcess(proc)
          if (code === 0) {
            resolve(true)
          } else {
            fsp.unlink(thumbnailPath).catch(() => {})
            reject(new Error(`JPG generation failed (${code})`))
          }
        })
        proc.on('error', reject)
      })
    }

    async extractCover(filePath, thumbnailPath) {
      const ffmpeg = this.getFFmpegPath()

      const proc = spawn(ffmpeg, [
        '-i', filePath,
        '-an',
        '-vcodec', 'copy',
        thumbnailPath
      ])

      return new Promise((resolve, reject) => {
        let stderr = ''
        proc.stderr.on('data', data => { stderr += data.toString() })

        proc.on('exit', code => {
          cleanupProcess(proc)
          if (code === 0) {
            resolve(true)
          } else {
            fsp.unlink(thumbnailPath).catch(() => {})
            reject(new Error(`Cover extraction failed (${code})`))
          }
        })
        proc.on('error', reject)
      })
    }

    getStatus() {
      return {
        queueLength: this.queue.length,
        processing: this.isProcessing,
        currentProcesses: this.currentProcesses.size,
        maxConcurrent: this.maxConcurrent,
        processedCount: this.processedCount,
        failedCount: this.failedCount
      }
    }

    clear() {
      this.queue = []
      this.currentProcesses.clear()
      for (const timer of this.processTimers.values()) {
        clearTimeout(timer)
      }
      this.processTimers.clear()
      this.pendingDebounce.clear()
      debugLog('[Queue] All tasks cleared')
    }
  }

  // ================ Helper Functions ================
  function parseTimeToSeconds(timeStr) {
    if (!timeStr) return 0
    if (!timeStr.includes(':')) {
      return parseFloat(timeStr) || 0
    }

    const parts = timeStr.split(':')
    if (parts.length !== 3) return 0

    const hours = parseInt(parts[0]) || 0
    const minutes = parseInt(parts[1]) || 0
    const seconds = parseFloat(parts[2]) || 0

    return hours * 3600 + minutes * 60 + seconds
  }

  function formatTimeFromSeconds(seconds) {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  function getGradientParams() {
    const gifWidth = api.getConfig('gif_width') || 320

    return {
      SHORT: {
        startTime: parseTimeToSeconds(api.getConfig('short_video_start_time') || '00:01:00'),
        duration: api.getConfig('short_video_duration') || 10,
        fps: api.getConfig('short_video_fps') || 5,
        width: gifWidth
      },
      LONG: {
        startTime: parseTimeToSeconds(api.getConfig('long_video_start_time') || '00:03:00'),
        duration: api.getConfig('long_video_duration') || 12,
        fps: api.getConfig('long_video_fps') || 6,
        width: gifWidth
      },
      BACKUP: {
        startTime: parseTimeToSeconds(api.getConfig('backup_video_start_time') || '00:00:00'),
        duration: api.getConfig('backup_video_duration') || 6,
        fps: api.getConfig('backup_video_fps') || 5,
        width: gifWidth
      }
    }
  }

  function cleanupProcess(proc) {
    try {
      if (proc.killed) return

      proc.kill('SIGTERM')

      const timeout = setTimeout(() => {
        if (proc && !proc.killed) {
          try {
            proc.kill('SIGKILL')
          } catch (e) {}
        }
      }, 5000)

      if (proc.stdout) proc.stdout.destroy()
      if (proc.stderr) proc.stderr.destroy()
      if (proc.stdin) proc.stdin.destroy()

      proc.once('exit', () => clearTimeout(timeout))
    } catch (e) {}
  }

  async function cleanupZeroByteFiles(dir) {
    try {
      const files = await fsp.readdir(dir)
      await Promise.all(files.map(async file => {
        if (file.toLowerCase().endsWith('.gif') || file.toLowerCase().endsWith('.jpg')) {
          try {
            const filePath = join(dir, file)
            const stats = await fsp.stat(filePath)
            if (stats.size === 0) {
              await fsp.unlink(filePath)
              debugLog(`Cleaned up 0-byte file: ${file}`)
            }
          } catch (e) {}
        }
      }))
    } catch (e) {}
  }

  async function cleanupWrongNamedFiles(dir) {
    try {
      const files = await fsp.readdir(dir)
      const wrongPattern = /\.(mp4|mkv|avi|mov|webm|flv|wmv|m4v|3gp|mpeg|mpg|ts|rmvb|rm|dat|vob|divx)\.(gif|jpg)$/i
      await Promise.all(files.map(async file => {
        if (wrongPattern.test(file)) {
          await fsp.unlink(join(dir, file)).catch(() => {})
          debugLog(`Removed wrong-named file: ${file}`)
        }
      }))
    } catch (e) {}
  }

  function getFileExtension(filePath) {
    return filePath.toLowerCase().split('.').pop() || ''
  }

  function stripExt(fileName) {
    return fileName.replace(/\.[^.]+$/, '')
  }

  const SUPPORTED_VIDEO_EXTS = ['webm', 'avi', 'mkv', 'mp4', 'mov', 'mpg', 'wmv', 'ts', 'rmvb', 'rm', 'dat', 'vob', 'flv', 'm4v', '3gp', 'mpeg']
  const SUPPORTED_AUDIO_EXTS = ['mp3', 'flac', 'm4a', 'ogg', 'opus', 'wma', 'aiff', 'aif', 'alac', 'dsd', 'dsf', 'dff', 'ape', 'wav', 'aac']

  // ================ Orphan Thumbnail Cleanup ================
  // A thumbnail is an orphan when the cache folder contains <name>.gif|jpg
  // but the folder itself has no media file with the same base name.
  const VIDEO_FILE_EXTS = SUPPORTED_VIDEO_EXTS.concat('divx')
  const AUDIO_FILE_EXTS = SUPPORTED_AUDIO_EXTS
  const CLEANUP_TARGETS = [
    { kind: 'video', subDir: VIDEO_THUMBNAIL_DIR, exts: ['.gif', '.jpg'] },
    { kind: 'audio', subDir: COVERS_DIR, exts: ['.jpg'] }
  ]
  const TEMP_FILE_MAX_AGE_MS = 10 * 60 * 1000
  const CLEANUP_COOLDOWN_MS = 10 * 60 * 1000
  const CLEANUP_MIN_AGE_MS = 60 * 60 * 1000
  const CLEANUP_QUEUE_MAX = 200

  function cleanupEnabled() { return api.getConfig('cleanupEnabled') !== false }

  const lastFolderScan = new Map()
  const folderScanQueue = new Set()
  let folderScanRunning = false
  let cleanupDisposed = false

  function mediaBaseName(name) {
    const dot = name.lastIndexOf('.')
    return dot > 0 ? name.slice(0, dot) : ''
  }

  function mediaExtName(name) {
    const dot = name.lastIndexOf('.')
    return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
  }

  async function removeFileQuiet(target) {
    try {
      const stats = await fsp.stat(target)
      await fsp.unlink(target)
      return { deleted: 1, size: stats.size || 0 }
    } catch (e) {
      if (e.code !== 'ENOENT')
        debugLog(`[Cleanup] Cannot remove ${target}: ${e.message}`)
      return { deleted: 0, size: 0 }
    }
  }

  // Check and clean a single folder (non recursive: every folder has its own cache).
  async function reconcileFolder(folder) {
    const report = { deleted: 0, freedBytes: 0, skipped: '' }
    if (!cleanupEnabled()) {
      report.skipped = 'disabled'
      return report
    }
    if (!folder) {
      report.skipped = 'no-folder'
      return report
    }

    const last = lastFolderScan.get(folder)
    if (last && Date.now() - last < CLEANUP_COOLDOWN_MS) {
      report.skipped = 'cooldown'
      return report
    }
    lastFolderScan.set(folder, Date.now())
    if (lastFolderScan.size > 500) {
      const cutoff = Date.now() - 24 * 3600 * 1000
      for (const [k, v] of lastFolderScan)
        if (v < cutoff) lastFolderScan.delete(k)
    }

    let entries
    try {
      entries = await fsp.readdir(folder, { withFileTypes: true })
    } catch (e) {
      report.skipped = 'unreadable'
      debugLog(`[Cleanup] Cannot read ${folder}: ${e.message}`)
      return report
    }
    if (!entries.length) {
      // An empty folder more likely means an unavailable mount than "everything was deleted":
      // never mass-delete in that case.
      report.skipped = 'empty-folder'
      return report
    }

    const media = { video: new Set(), audio: new Set() }
    for (const entry of entries) {
      if (entry.isDirectory?.() === true) continue
      const name = entry.name
      const ext = mediaExtName(name)
      const base = mediaBaseName(name)
      if (!base || !ext) continue
      if (VIDEO_FILE_EXTS.includes(ext)) media.video.add(base.toLowerCase())
      else if (AUDIO_FILE_EXTS.includes(ext)) media.audio.add(base.toLowerCase())
    }

    for (const target of CLEANUP_TARGETS) {
      if (cleanupDisposed) break
      if (!cleanupEnabled()) break

      const cachePath = join(folder, CACHE_DIR, target.subDir)
      let cacheEntries
      try {
        cacheEntries = await fsp.readdir(cachePath, { withFileTypes: true })
      } catch (e) {
        if (e.code !== 'ENOENT')
          debugLog(`[Cleanup] Cannot read ${cachePath}: ${e.message}`)
        continue
      }

      for (const entry of cacheEntries) {
        if (cleanupDisposed) break
        if (entry.isDirectory?.() === true) continue
        const name = entry.name
        if (!name) continue
        const lower = name.toLowerCase()
        const fullPath = join(cachePath, name)

        let stats
        try {
          stats = await fsp.stat(fullPath)
        } catch { continue }

        const age = Date.now() - stats.mtimeMs
        const isTemp = lower.startsWith(TEMP_PREFIX) || lower.endsWith('_palette.png')
        if (isTemp) {
          // Leftovers of an interrupted extraction. Never touch recent ones.
          if (age < TEMP_FILE_MAX_AGE_MS) continue
          const res = await removeFileQuiet(fullPath)
          if (res.deleted) {
            report.deleted++
            report.freedBytes += res.size
            debugLog(`[Cleanup] Removed stale temporary file: ${fullPath}`)
          }
          continue
        }

        const ext = mediaExtName(name)
        if (!ext || !target.exts.includes('.' + ext)) continue
        const base = mediaBaseName(name)
        if (!base) continue
        if (media[target.kind].has(base.toLowerCase())) continue
        // Give freshly created thumbnails some time: the media may still be
        // appearing (copy in progress) or a rename may be in flight.
        if (age < CLEANUP_MIN_AGE_MS) continue

        const res = await removeFileQuiet(fullPath)
        if (res.deleted) {
          report.deleted++
          report.freedBytes += res.size
          debugLog(`[Cleanup] Removed orphan: ${fullPath}`)
        }
      }
    }
    return report
  }

  // Called from the listDiskFolder event: cheap pre-check, then queue in background.
  function queueFolderCleanup(folder) {
    if (cleanupDisposed || !cleanupEnabled()) return
    if (!folder || folderScanQueue.has(folder)) return
    if (folderScanQueue.size >= CLEANUP_QUEUE_MAX) return
    try {
      if (!fs.existsSync(join(folder, CACHE_DIR))) return
    } catch { return }
    folderScanQueue.add(folder)
    runCleanupQueue()
  }

  async function runCleanupQueue() {
    if (folderScanRunning || cleanupDisposed) return
    folderScanRunning = true
    let deleted = 0
    let freed = 0
    let scanned = 0
    try {
      while (folderScanQueue.size && !cleanupDisposed) {
        if (!cleanupEnabled()) {
          folderScanQueue.clear()
          break
        }
        const folder = folderScanQueue.values().next().value
        folderScanQueue.delete(folder)
        try {
          const report = await reconcileFolder(folder)
          if (!report.skipped) {
            scanned++
            deleted += report.deleted
            freed += report.freedBytes
          }
        } catch (e) {
          debugLog(`[Cleanup] Folder failed ${folder}: ${e && e.message}`)
        }
        await new Promise(r => setImmediate(r))
      }
    } finally {
      folderScanRunning = false
      if (deleted)
        debugLog(`[Cleanup] Removed ${deleted} orphan thumbnail(s), ${(freed / 1048576).toFixed(2)} MB, in ${scanned} folder(s)`)
      if (folderScanQueue.size && !cleanupDisposed)
        runCleanupQueue()
    }
  }

  // Delete the thumbnail(s) of one deleted media file. Waits until the media is
  // really gone, and refuses to act if another file with the same base name
  // (e.g. a.mp4 + a.mkv) is still present.
  async function removeThumbsForMediaFile(filePath) {
    const result = { deleted: 0, freedBytes: 0 }
    const folder = dirname(filePath)
    const ext = getFileExtension(filePath)
    const base = stripExt(basename(filePath))
    if (!base) return result
    const kind = VIDEO_FILE_EXTS.includes(ext) ? 'video'
      : AUDIO_FILE_EXTS.includes(ext) ? 'audio'
        : ''
    if (!kind) return result
    const mediaExts = kind === 'video' ? VIDEO_FILE_EXTS : AUDIO_FILE_EXTS
    const baseLower = base.toLowerCase()

    let stillHasMedia = false
    try {
      for (const entry of await fsp.readdir(folder, { withFileTypes: true })) {
        if (entry.isDirectory?.() === true) continue
        const name = entry.name
        if (mediaBaseName(name).toLowerCase() !== baseLower) continue
        if (mediaExts.includes(mediaExtName(name))) {
          stillHasMedia = true
          break
        }
      }
    } catch (e) {
      debugLog(`[Cleanup] Cannot inspect ${folder}: ${e.message}`)
      return result
    }
    if (stillHasMedia) return result

    const targets = kind === 'video'
      ? [
          join(folder, CACHE_DIR, VIDEO_THUMBNAIL_DIR, base + '.gif'),
          join(folder, CACHE_DIR, VIDEO_THUMBNAIL_DIR, base + '.jpg'),
          join(folder, CACHE_DIR, VIDEO_THUMBNAIL_DIR, base + '_palette.png')
        ]
      : [join(folder, CACHE_DIR, COVERS_DIR, base + '.jpg')]

    for (const target of targets) {
      const res = await removeFileQuiet(target)
      result.deleted += res.deleted
      result.freedBytes += res.size
    }
    return result
  }

  function schedulePostDeleteCleanup(filePath) {
    let attempts = 0
    const check = async () => {
      if (cleanupDisposed || !cleanupEnabled()) return
      attempts++
      // HFS emits "deleting" before removing the file: wait for the removal.
      const exists = await fsp.access(filePath).then(() => true, () => false)
      if (exists) {
        if (attempts < 3) api.setTimeout(check, 1500)
        return
      }
      try {
        const res = await removeThumbsForMediaFile(filePath)
        if (res.deleted)
          debugLog(`[Cleanup] Removed ${res.deleted} thumbnail(s) of deleted file: ${basename(filePath)}`)
      } catch (e) {
        debugLog(`[Cleanup] Post-delete cleanup failed: ${e && e.message}`)
      }
    }
    api.setTimeout(check, 1200)
  }

  // Register the two triggers.
  // listDiskFolder is fired by HFS whenever a folder is read from disk, which
  // includes every get_file_list request.
  api.events.on('listDiskFolder', ({ path: folder }) => {
    if (!folder) return
    queueFolderCleanup(folder)
  })

  api.events.on('deleting', ({ node }) => {
    if (cleanupDisposed || !cleanupEnabled()) return
    if (node?.isFolder) return // rm -r takes the cache folder with it
    const source = node?.source
    if (!source) return
    const ext = getFileExtension(source)
    if (!VIDEO_FILE_EXTS.includes(ext) && !AUDIO_FILE_EXTS.includes(ext)) return
    schedulePostDeleteCleanup(source)
  })

  // ================ Thumbnail Extraction Main Function ================
  const thumbnailQueue = new ThumbnailQueue()
  const pendingTasks = new Map()

  async function extractThumbnailWithDebounce(filePath) {
    const key = filePath
    const debounceDelay = api.getConfig('thumbnail_debounce_delay') || 2000

    if (pendingTasks.has(key)) {
      debugLog(`[Debounce] Reusing existing task: ${basename(filePath)}`)
      return pendingTasks.get(key)
    }

    const promise = new Promise((resolve) => {
      if (pendingTasks.has(`${key}_timer`)) {
        clearTimeout(pendingTasks.get(`${key}_timer`))
        pendingTasks.delete(`${key}_timer`)
      }

      const timer = setTimeout(async () => {
        pendingTasks.delete(`${key}_timer`)
        pendingTasks.delete(key)

        try {
          debugLog(`[Debounce] Executing thumbnail extraction: ${basename(filePath)}`)
          await extractThumbnail(filePath)
        } catch (e) {
          debugLog(`[Debounce] Thumbnail extraction failed: ${e.message}`)
        } finally {
          resolve()
        }
      }, debounceDelay)

      pendingTasks.set(`${key}_timer`, timer)
    })

    pendingTasks.set(key, promise)
    return promise
  }

  async function extractThumbnail(filePath) {
    const ext = getFileExtension(filePath)

    const isVideo = SUPPORTED_VIDEO_EXTS.includes(ext)
    const isAudio = SUPPORTED_AUDIO_EXTS.includes(ext)

    if (!isVideo && !isAudio) return
    if (isAudio && !api.getConfig('extract_covers')) return
    if (isVideo && !api.getConfig('extract_video_thumbnails')) return

    try {
      const dir = dirname(filePath)
      const cacheDir = join(dir, CACHE_DIR)
      await fsp.mkdir(cacheDir, { recursive: true })

      await cleanupZeroByteFiles(cacheDir)

      const filename = stripExt(basename(filePath))

      if (isAudio) {
        const coversDir = join(cacheDir, COVERS_DIR)
        await fsp.mkdir(coversDir, { recursive: true })
        await cleanupWrongNamedFiles(coversDir)
        const coverPath = join(coversDir, `${filename}.jpg`)

        try {
          await fsp.access(coverPath)
          debugLog(`[Cover] Already exists: ${coverPath}`)
          return
        } catch {}

        await thumbnailQueue.add({
          type: 'cover',
          filePath,
          thumbnailPath: coverPath,
          params: {}
        })
        debugLog(`[Cover] Extraction complete: ${coverPath}`)
        return
      }

      if (isVideo) {
        const videoDir = join(cacheDir, VIDEO_THUMBNAIL_DIR)
        await fsp.mkdir(videoDir, { recursive: true })
        await cleanupWrongNamedFiles(videoDir)

        const format = api.getConfig('videoThumbFormat') || 'jpg'
        const thumbnailPath = join(videoDir, `${filename}.${format}`)

        try {
          await fsp.access(thumbnailPath)
          debugLog(`[Thumbnail] Already exists: ${thumbnailPath}`)
          return
        } catch {}

        try {
          const stats = await fsp.stat(filePath)
          if (stats.size === 0) {
            debugLog(`[Thumbnail] Skipping 0-byte file: ${filePath}`)
            return
          }

          const fileSizeMB = stats.size / (1024 * 1024)
          const threshold = api.getConfig('video_size_threshold') || 250
          const gradientParams = getGradientParams()
          const isLongVideo = fileSizeMB > threshold

          if (format === 'jpg') {
            let time = api.getConfig('thumbnail_time') || '00:00:05'
            if (!time.includes(':')) {
              const seconds = parseInt(time) || 5
              time = formatTimeFromSeconds(seconds)
            }

            await thumbnailQueue.add({
              type: 'jpg',
              filePath,
              thumbnailPath,
              params: { time }
            })
          } else {
            let success = false
            const attempts = isLongVideo
              ? [gradientParams.LONG, gradientParams.SHORT, gradientParams.BACKUP]
              : [gradientParams.SHORT, gradientParams.BACKUP]

            for (const params of attempts) {
              try {
                await thumbnailQueue.add({
                  type: 'gif',
                  filePath,
                  thumbnailPath,
                  params: params
                })
                success = true
                break
              } catch (error) {
                debugLog(`[Thumbnail] Attempt failed: ${error.message}`)
              }
            }

            if (!success) {
              await fsp.unlink(thumbnailPath).catch(() => {})
              throw new Error('All GIF generation attempts failed')
            }
          }

          debugLog(`[Thumbnail] Complete: ${thumbnailPath}`)
        } catch (e) {
          debugLog(`[Thumbnail] Failed: ${filePath} - ${e.message}`)
        }
      }
    } catch (e) {
      debugLog(`[Thumbnail] Error: ${filePath} - ${e.message}`)
    }
  }

  // ================ FFmpeg Check ================
  let ffmpegChecked = false
  let ffmpegReady = false

  function checkFFmpeg() {
    if (ffmpegChecked) return
    ffmpegChecked = true

    const ffmpeg = api.getConfig('ffmpeg_path') || 'ffmpeg'
    const proc = spawn(ffmpeg, ['-version'])

    return new Promise((resolve) => {
      proc.on('error', () => {
        api.log('[Thumbnail] ⚠️ FFmpeg not found. Please configure the correct path.')
        ffmpegReady = false
        resolve(false)
      })
      proc.on('exit', (code) => {
        if (code === 0) {
          if (api.getConfig('debug_ffmpeg')) {
            api.log('[Thumbnail] ✅ FFmpeg ready')
          }
          ffmpegReady = true
          resolve(true)
        } else {
          api.log('[Thumbnail] ⚠️ FFmpeg version check failed')
          ffmpegReady = false
          resolve(false)
        }
      })
    })
  }

  setTimeout(() => checkFFmpeg(), 1000)

  // ================ Export API ================
  return {
    unload() {
      cleanupDisposed = true
      folderScanQueue.clear()
      thumbnailQueue.clear()
      for (const [key, value] of pendingTasks) {
        if (key.endsWith('_timer')) {
          clearTimeout(value)
        }
      }
      pendingTasks.clear()
      debugLog('[Thumbnail] All resources cleaned up')
    },

    extractThumbnail: extractThumbnailWithDebounce,
    getQueueStatus() {
      return thumbnailQueue.getStatus()
    },

    onDirEntry({ entry, node }) {
      const ext = entry.ext?.toLowerCase()
      const audioExts = ['mp3', 'flac', 'wav', 'ape', 'aac', 'ogg', 'm4a', 'alac', 'dsf', 'dsd', 'aif', 'aiff', 'opus']
      const videoExts = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'mpeg', 'mpg', 'wmv', 'rmvb', 'rm', 'dat', 'ts', 'vob', 'flv', 'divx', 'm4v', '3gp']

      const fileName = stripExt(entry.n)

      const enableGraftMode = api.getConfig('enableGraftMode') || false
      const graftPath = (api.getConfig('graftPath') || '/images/cache').trim()
      const graftVideoCovers = api.getConfig('graftVideoCovers') !== false
      const graftMusicCovers = api.getConfig('graftMusicCovers') !== false

      if (audioExts.includes(ext) || videoExts.includes(ext)) {
        const filePath = join(node.path, entry.n)
        extractThumbnailWithDebounce(filePath).catch(e => {
          debugLog(`Extraction error: ${e.message}`)
        })
      }

      if (audioExts.includes(ext)) {
        if (enableGraftMode && graftMusicCovers) {
          const graftCoverPath = join(graftPath, node.path, CACHE_DIR, COVERS_DIR, fileName + '.jpg')
          if (fs.existsSync(graftCoverPath)) {
            entry._hasCover = true
            entry._coverType = 'audio'
            entry._graftMode = true
            entry._graftMusicCovers = true
            entry._graftPath = graftPath
          }
        } else {
          const coverPath = join(node.path, CACHE_DIR, COVERS_DIR, fileName + '.jpg')
          if (fs.existsSync(coverPath)) {
            entry._hasCover = true
            entry._coverType = 'audio'
            entry._graftMode = false
            entry._graftMusicCovers = false
            entry._graftPath = ''
          }
        }
      } else if (videoExts.includes(ext)) {
        const preferred = api.getConfig('videoThumbFormat') || 'jpg'
        const formats = preferred === 'gif' ? ['gif', 'jpg'] : ['jpg', 'gif']

        if (enableGraftMode && graftVideoCovers) {
          for (const fmt of formats) {
            const graftThumbPath = join(graftPath, node.path, CACHE_DIR, VIDEO_THUMBNAIL_DIR, fileName + '.' + fmt)
            if (fs.existsSync(graftThumbPath)) {
              entry._hasCover = true
              entry._coverType = 'video'
              entry._graftMode = true
              entry._graftVideoCovers = true
              entry._graftPath = graftPath
              entry.coverExt = fmt
              break
            }
          }
        } else {
          for (const fmt of formats) {
            const thumbPath = join(node.path, CACHE_DIR, VIDEO_THUMBNAIL_DIR, fileName + '.' + fmt)
            if (fs.existsSync(thumbPath)) {
              entry._hasCover = true
              entry._coverType = 'video'
              entry._graftMode = false
              entry._graftVideoCovers = false
              entry._graftPath = ''
              entry.coverExt = fmt
              break
            }
          }
        }
      }
    },

    middleware: async ctx => {
      return async () => {
        const src = ctx.state.fileSource
        if (!src) return

        const ext = getFileExtension(src)

        if (SUPPORTED_AUDIO_EXTS.includes(ext) || SUPPORTED_VIDEO_EXTS.includes(ext)) {
          extractThumbnailWithDebounce(src).catch(e => {
            debugLog(`Thumbnail extraction error: ${e.message}`)
          })
        }
      }
    }
  }
}