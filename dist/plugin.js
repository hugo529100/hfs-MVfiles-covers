exports.repo = "hugo529100/hfs-MVfiles-covers"
exports.version = 8.9
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
    helperText: 'When enabled, covers are also mirrored to the graft path below, keeping the original folder hierarchy'
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
    helperText: 'Unified storage path for all media covers. The full folder hierarchy is preserved below this path'
  },
  graftVideoCovers: {
    showIf: values => values.config_tab === 'graft' && values.enableGraftMode,
    type: 'boolean',
    defaultValue: true,
    frontend: true,
    label: 'Graft Video Covers',
    helperText: 'When enabled, video thumbnails are mirrored to the graft path'
  },
  graftMusicCovers: {
    showIf: values => values.config_tab === 'graft' && values.enableGraftMode,
    type: 'boolean',
    defaultValue: true,
    frontend: true,
    label: 'Graft Music Covers',
    helperText: 'When enabled, music covers are mirrored to the graft path'
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
    defaultValue: 1,
    label: 'Max Concurrent Thumbnail Processes',
    helperText: 'Maximum number of concurrent FFmpeg thumbnail extraction processes. Default is 1 (one video at a time).',
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
  { version: 8.9, message: "thumbnail-fade cooperation: the one-time gate releases covers in small batches (6 per 40ms) so they fade in progressively instead of all at once. The viewport marker is persisted as data-in-view so React re-renders don't wipe it; file-show suspension now keeps visible covers intact." },
  { version: 8.8, message: "Hybrid GIF loading: after the one-time stats gate, GIF covers within about one viewport (600-1000px) load immediately; farther GIFs stay lazy and load when they approach. Loaded covers are never unloaded; non-GIF covers keep their original behavior." },
  { version: 8.7, message: "Restored the 12.8-era frontend's eager image/scroll behavior and added a one-time release gate: no covers while the first get_file_list/#folder-stats is loading; release immediately when it ends; later stats/loading changes never re-block. Only a new folder re-arms the gate." },
  { version: 8.6, message: "Statistics blocking is now one-time: covers stay off only while the first list statistics/loading is active. The moment it finishes, covers are released immediately, and later stats/loading changes (lazy pages, scrolling) no longer block them." },
  { version: 8.5, message: "After the list stats finish, covers now preload about one viewport beyond the visible area, and scrolling settles in 250ms. This keeps covers ready before they scroll into view without loading during the list build." },
  { version: 8.4, message: "Covers now stay unloaded while HFS is still loading/calculating the list (HFS.state.loading, the #folder-stats spinner), not only while its text changes. After loading ends and 500ms of stability, only visible covers are loaded." },
  { version: 8.3, message: "Cover loading now follows #folder-stats: while the stats text is still changing, no covers are loaded. Once it has been stable for 800ms and scrolling has stopped, only visible covers are loaded." },
  { version: 8.2, message: "Covers are no longer requested while get_file_list builds the list. After the list settles and scrolling stops, only covers inside the visible area are loaded (both vertical and horizontal); scrolling does not stream additional covers." },
  { version: 8.1, message: "Cover extraction now validates the generated file and degrades: long video 鈫?short video 鈫?backup 鈫?last-resort 0s frame. JPG also falls back to 0s. Empty/invalid outputs are treated as failures." },
  { version: 8.0, message: "Entering a folder only remembers cover candidates. The batch starts when the first video is played: the playing video is converted first, then the rest of the folder, one at a time. Leaving or closing stops the queue." },
  { version: 7.9, message: "Folder listings batch-convert missing covers and mirror existing ones, one video at a time. The batch stops when leaving the folder or closing the page, and missing covers are filled in one by one after the player closes." },
  { version: 7.8, message: "A folder listing no longer generates thumbnails for every video: only the video being played/downloaded is converted. Existing covers are still mirrored on demand." },
  { version: 7.7, message: "Cover follow-up after closing the player now updates only the played entry: no list reload and no page refresh" },
  { version: 7.6, message: "After closing the player, the cover of the file just played is refreshed automatically. Thumbnail extraction now starts as soon as playback begins." },
  { version: 7.5, message: "Switching graft mode on midway now migrates existing covers automatically: a missing graft cover is materialized from the original cache the first time it is requested" },
  { version: 7.4, message: "Graft mode now mirrors thumbnails/covers into the graft path with the full folder hierarchy, removes them together with deleted videos/folders, and cleans orphan mirror files" },
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
  const { join, basename, dirname, resolve, relative, isAbsolute } = api.require('path')
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
      this.maxConcurrent = api.getConfig('max_concurrent_thumbnail') || 1
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
      // startTime 0 is valid (backup/last-resort); don't replace it with 60.
      const startTime = params.startTime ?? 60
      const duration = params.duration ?? 10
      const fps = params.fps ?? 5
      const width = params.width ?? 320

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
            if (await isValidThumbFile(thumbnailPath, 'gif')) {
              resolve(true)
            } else {
              await fsp.unlink(thumbnailPath).catch(() => {})
              reject(new Error('Generated GIF is invalid or empty'))
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

        proc.on('exit', async code => {
          cleanupProcess(proc)
          if (code === 0) {
            if (await isValidThumbFile(thumbnailPath, 'jpg')) {
              resolve(true)
            } else {
              await fsp.unlink(thumbnailPath).catch(() => {})
              reject(new Error('Generated JPG is invalid or empty'))
            }
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

        proc.on('exit', async code => {
          cleanupProcess(proc)
          if (code === 0) {
            try {
              const stats = await fsp.stat(thumbnailPath)
              if (stats.size > 0) {
                resolve(true)
              } else {
                await fsp.unlink(thumbnailPath).catch(() => {})
                reject(new Error('Extracted cover is empty'))
              }
            } catch (err) {
              reject(err)
            }
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

  async function readFileHead(filePath, size) {
    const handle = await fsp.open(filePath, 'r')
    try {
      const buffer = Buffer.alloc(size)
      const { bytesRead } = await handle.read(buffer, 0, size, 0)
      return buffer.subarray(0, bytesRead)
    } finally {
      await handle.close().catch(() => {})
    }
  }

  // A file that exists is not necessarily a valid image: ffmpeg can exit 0
  // while leaving an empty/truncated output. Validate the header so a failed
  // attempt can degrade to the next parameter set.
  async function isValidThumbFile(filePath, format) {
    try {
      const stats = await fsp.stat(filePath)
      if (!stats.isFile() || stats.size < 64) return false
      if (format === 'gif') {
        const head = await readFileHead(filePath, 3)
        return head.length === 3 && head.toString('ascii') === 'GIF'
      }
      if (format === 'jpg') {
        const head = await readFileHead(filePath, 2)
        return head.length === 2 && head[0] === 0xFF && head[1] === 0xD8
      }
      return stats.size > 0
    } catch (e) {
      return false
    }
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

  // ================ Graft Mode Mirrors ================
  // graftPath is a VFS path (e.g. /images/cache). Mirrors keep the media folder
  // hierarchy below it, matching the URLs built by the frontend:
  //   <graftPath><folder-uri>cache/videothumbnail/<name>.gif
  function graftEnabled() { return api.getConfig('enableGraftMode') === true }
  function graftVideoEnabled() { return api.getConfig('graftVideoCovers') !== false }
  function graftMusicEnabled() { return api.getConfig('graftMusicCovers') !== false }
  function graftVfsPath() { return String(api.getConfig('graftPath') || '/images/cache').trim() }

  const folderVfsMap = new Map()      // disk folder key -> decoded VFS folder
  const vfsFolderDiskMap = new Map()  // decoded VFS folder -> disk folder
  let mountsCache = null
  let graftRootCache = { at: 0, path: '' }
  const graftMirrorQueue = []
  const graftMirrorQueued = new Set()
  let graftMirrorRunning = false

  function stripFinalSep(path) {
    if (/^[A-Za-z]:[\\/]$/.test(path) || path === '/' || path === '\\') return path
    return path.replace(/[\\/]+$/, '')
  }

  function folderKey(folder) {
    const path = stripFinalSep(resolve(folder))
    return process.platform === 'win32' ? path.toLowerCase() : path
  }

  function isInsideFolder(parent, child) {
    const rel = relative(resolve(parent), resolve(child))
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
  }

  function decodeVfsSegment(segment) {
    try { return decodeURIComponent(segment) }
    catch { return segment }
  }

  // Returns null when the path contains unsafe segments.
  function vfsSegments(vfsFolder) {
    if (!vfsFolder) return null
    const segments = String(vfsFolder).replace(/\\/g, '/').split('/').filter(Boolean).map(decodeVfsSegment)
    const safe = []
    for (const segment of segments) {
      if (segment === '.' || segment === '..' || segment.includes('/') || segment.includes('\\')) return null
      safe.push(segment)
    }
    return safe
  }

  function normalizeVfsFolder(vfsFolder) {
    const segments = vfsSegments(vfsFolder)
    return segments && segments.length ? '/' + segments.join('/') + '/' : ''
  }

  // Same safety checks as vfsSegments, but for values that are already decoded
  // (folderVfsMap and mount-derived paths), to avoid decoding them twice.
  function decodedSegments(vfsFolder) {
    if (!vfsFolder) return null
    const segments = String(vfsFolder).replace(/\\/g, '/').split('/').filter(Boolean)
    const safe = []
    for (const segment of segments) {
      if (segment === '.' || segment === '..' || segment.includes('/') || segment.includes('\\')) return null
      safe.push(segment)
    }
    return safe
  }

  function vfsDirname(vfsPath) {
    if (!vfsPath) return ''
    const path = String(vfsPath).replace(/\\/g, '/')
    const index = path.lastIndexOf('/')
    return index > 0 ? path.slice(0, index + 1) : ''
  }

  function rememberFolderVfs(folder, vfsFolder) {
    if (!folder || !vfsFolder) return
    const normalized = normalizeVfsFolder(vfsFolder)
    if (!normalized) return
    folderVfsMap.set(folderKey(folder), normalized)
    vfsFolderDiskMap.set(normalized, stripFinalSep(resolve(folder)))
    if (folderVfsMap.size > 5000) {
      for (const key of folderVfsMap.keys()) {
        const vfs = folderVfsMap.get(key)
        folderVfsMap.delete(key)
        if (vfs) vfsFolderDiskMap.delete(vfs)
        if (folderVfsMap.size <= 4000) break
      }
    }
  }

  function getMounts() {
    if (mountsCache) return mountsCache
    const mounts = []
    try {
      const root = api.getHfsConfig('vfs')
      ;(function walk(node, base) {
        for (const child of (node && node.children) || []) {
          if (!child || typeof child !== 'object') continue
          const source = typeof child.source === 'string' ? child.source : ''
          const name = child.name || (source ? basename(stripFinalSep(resolve(source))) : '')
          if (!name) continue
          const vfs = (base || '') + '/' + name
          if (source) mounts.push({ source: stripFinalSep(resolve(source)), vfs })
          walk(child, vfs)
        }
      })(root, '')
    } catch (e) {
      debugLog(`[Graft] Cannot read VFS: ${e.message}`)
    }
    mounts.sort((a, b) => b.source.length - a.source.length)
    mountsCache = mounts
    return mounts
  }

  function folderVfsFromMounts(folder) {
    const target = resolve(folder)
    for (const mount of getMounts()) {
      const rel = relative(resolve(mount.source), target)
      if (rel && (rel.startsWith('..') || isAbsolute(rel))) continue
      const segments = rel.split(/[\\/]/).filter(Boolean)
      return normalizeVfsFolder(mount.vfs + (segments.length ? '/' + segments.join('/') : ''))
    }
    return ''
  }

  function folderVfsFor(folder) {
    if (!folder) return ''
    return folderVfsMap.get(folderKey(folder)) || folderVfsFromMounts(folder)
  }

  // Reverse mapping: VFS folder -> source folder on disk.
  function diskForVfsFolder(vfsFolder) {
    const wanted = normalizeVfsFolder(vfsFolder)
    if (!wanted) return ''
    const exact = vfsFolderDiskMap.get(wanted)
    if (exact) return exact
    const segments = decodedSegments(wanted)
    if (!segments) return ''
    const ignoreCase = process.platform === 'win32'
    const mounts = getMounts()
      .map(mount => ({ ...mount, segs: decodedSegments(mount.vfs) }))
      .filter(mount => mount.segs && mount.segs.length)
      .sort((a, b) => b.segs.length - a.segs.length)
    for (const mount of mounts) {
      if (segments.length < mount.segs.length) continue
      let same = true
      for (let i = 0; i < mount.segs.length; i++) {
        const a = ignoreCase ? segments[i].toLowerCase() : segments[i]
        const b = ignoreCase ? mount.segs[i].toLowerCase() : mount.segs[i]
        if (a !== b) {
          same = false
          break
        }
      }
      if (!same) continue
      return join(mount.source, ...segments.slice(mount.segs.length))
    }
    return ''
  }

  async function resolveGraftRoot() {
    const configured = graftVfsPath()
    if (!configured) return ''
    const target = configured.startsWith('/') ? configured : '/' + configured
    try {
      const { urlToNode } = api.require('./vfs')
      const node = await urlToNode(target, undefined, undefined, { allowMissing: true })
      if (node && node.source) return stripFinalSep(resolve(String(node.source)))
    } catch (e) {
      debugLog(`[Graft] VFS lookup failed for ${target}: ${e.message}`)
    }
    // fallback: find the deepest configured mount containing the graft path
    const targetFolder = normalizeVfsFolder(target)
    if (!targetFolder) return ''
    const mount = getMounts()
      .filter(x => {
        const mountFolder = normalizeVfsFolder(x.vfs)
        return mountFolder && (targetFolder === mountFolder || targetFolder.startsWith(mountFolder))
      })
      .sort((a, b) => b.vfs.length - a.vfs.length)[0]
    if (!mount) return ''
    const mountFolder = normalizeVfsFolder(mount.vfs)
    const segments = targetFolder.slice(mountFolder.length).split('/').filter(Boolean)
    return stripFinalSep(resolve(join(mount.source, ...segments)))
  }

  async function getGraftRoot(allowDisabled = false) {
    if (!allowDisabled && !graftEnabled()) return ''
    const now = Date.now()
    if (now - graftRootCache.at < 10000) return graftRootCache.path
    let path = ''
    try { path = await resolveGraftRoot() }
    catch (e) { debugLog(`[Graft] Cannot resolve graft root: ${e.message}`) }
    graftRootCache = { at: now, path }
    if (!path) debugLog(`[Graft] Graft path not resolvable: ${graftVfsPath()}`)
    return path
  }

  // A graft cover can be requested before any listing mirrored it (e.g. graft
  // mode switched on midway). Materialize it from the original cache on demand.
  async function materializeGraftFromLocal(requestPath) {
    if (!graftEnabled()) return false
    const requestSegments = vfsSegments(requestPath)
    const graftSegments = vfsSegments(graftVfsPath())
    if (!requestSegments || !graftSegments || requestSegments.length <= graftSegments.length) return false
    const ignoreCase = process.platform === 'win32'
    for (let i = 0; i < graftSegments.length; i++) {
      const a = ignoreCase ? requestSegments[i].toLowerCase() : requestSegments[i]
      const b = ignoreCase ? graftSegments[i].toLowerCase() : graftSegments[i]
      if (a !== b) return false
    }
    const inner = requestSegments.slice(graftSegments.length)
    if (inner.length < 4) return false
    if (inner[inner.length - 3] !== CACHE_DIR) return false
    const subDir = inner[inner.length - 2]
    if (subDir !== VIDEO_THUMBNAIL_DIR && subDir !== COVERS_DIR) return false
    if (subDir === VIDEO_THUMBNAIL_DIR && !graftVideoEnabled()) return false
    if (subDir === COVERS_DIR && !graftMusicEnabled()) return false
    const fileName = inner[inner.length - 1]
    if (!fileName) return false
    const lower = fileName.toLowerCase()
    if (lower.startsWith(TEMP_PREFIX) || lower.endsWith('_palette.png')) return false
    const ext = mediaExtName(fileName)
    if (subDir === VIDEO_THUMBNAIL_DIR ? !['gif', 'jpg'].includes(ext) : ext !== 'jpg') return false

    const root = await getGraftRoot()
    if (!root) return false
    const destination = join(root, ...inner)
    const rel = relative(root, destination)
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) return false
    try {
      await fsp.access(destination)
      return true // already mirrored
    } catch {}

    const mediaVfsFolder = '/' + inner.slice(0, -3).join('/') + '/'
    const sourceFolder = diskForVfsFolder(mediaVfsFolder)
    if (!sourceFolder) {
      debugLog(`[Graft] Cannot map mirrored request to a source folder: ${requestPath}`)
      return false
    }
    const localPath = join(sourceFolder, CACHE_DIR, subDir, fileName)
    if (folderKey(localPath) === folderKey(destination) || !fs.existsSync(localPath)) return false
    try {
      await fsp.mkdir(dirname(destination), { recursive: true })
      await fsp.copyFile(localPath, destination)
      debugLog(`[Graft] Materialized ${localPath} -> ${destination}`)
      return true
    } catch (e) {
      debugLog(`[Graft] Materialize failed ${localPath}: ${e.message}`)
      return false
    }
  }

  function graftDestination(root, vfsFolder, subDir, fileName) {
    const segments = decodedSegments(vfsFolder)
    if (!segments || !segments.length) return ''
    const destination = join(root, ...segments, CACHE_DIR, subDir, fileName)
    const rel = relative(root, destination)
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) return ''
    return destination
  }

  async function mirrorThumbToGraft(localPath, kind) {
    if (!graftEnabled()) return false
    if (kind === 'video' ? !graftVideoEnabled() : !graftMusicEnabled()) return false
    const mediaFolder = dirname(dirname(dirname(localPath)))
    const vfsFolder = folderVfsFor(mediaFolder)
    if (!vfsFolder) {
      debugLog(`[Graft] Cannot map folder to VFS: ${mediaFolder}`)
      return false
    }
    const root = await getGraftRoot()
    if (!root) return false
    const destination = graftDestination(root, vfsFolder,
      kind === 'video' ? VIDEO_THUMBNAIL_DIR : COVERS_DIR, basename(localPath))
    if (!destination || folderKey(localPath) === folderKey(destination)) return false
    try {
      const localStats = await fsp.stat(localPath)
      const destStats = await fsp.stat(destination).catch(() => null)
      if (destStats && destStats.size === localStats.size && destStats.mtimeMs >= localStats.mtimeMs - 1000)
        return true
      await fsp.mkdir(dirname(destination), { recursive: true })
      await fsp.copyFile(localPath, destination)
      debugLog(`[Graft] Mirrored ${localPath} -> ${destination}`)
      return true
    } catch (e) {
      debugLog(`[Graft] Mirror failed ${localPath}: ${e.message}`)
      return false
    }
  }

  function queueGraftMirror(localPath, kind, safe) {
    if (!graftEnabled() || cleanupDisposed) return
    if (graftMirrorQueued.has(localPath)) return
    if (graftMirrorQueue.length >= 500) return
    graftMirrorQueued.add(localPath)
    graftMirrorQueue.push({ localPath, kind, safe })
    runGraftMirrorQueue()
  }

  async function runGraftMirrorQueue() {
    if (graftMirrorRunning || cleanupDisposed) return
    graftMirrorRunning = true
    try {
      while (graftMirrorQueue.length && !cleanupDisposed) {
        if (!graftEnabled()) {
          graftMirrorQueue.length = 0
          break
        }
        const job = graftMirrorQueue.shift()
        graftMirrorQueued.delete(job.localPath)
        if (job.safe) {
          try {
            const stats = await fsp.stat(job.localPath)
            if (Date.now() - stats.mtimeMs < 5000) continue
          } catch { continue }
        }
        await mirrorThumbToGraft(job.localPath, job.kind)
      }
    } finally {
      graftMirrorRunning = false
      if (graftMirrorQueue.length && !cleanupDisposed) runGraftMirrorQueue()
    }
  }

  function mirrorExistingMediaThumbs(mediaPath, vfsFolder) {
    if (!graftEnabled()) return
    const folder = dirname(mediaPath)
    if (vfsFolder) rememberFolderVfs(folder, vfsFolder)
    const base = stripExt(basename(mediaPath))
    if (!base) return
    if (VIDEO_FILE_EXTS.includes(getFileExtension(mediaPath))) {
      if (!graftVideoEnabled()) return
      for (const format of ['gif', 'jpg']) {
        const localPath = join(folder, CACHE_DIR, VIDEO_THUMBNAIL_DIR, base + '.' + format)
        if (fs.existsSync(localPath)) queueGraftMirror(localPath, 'video', true)
      }
    } else if (graftMusicEnabled()) {
      const localPath = join(folder, CACHE_DIR, COVERS_DIR, base + '.jpg')
      if (fs.existsSync(localPath)) queueGraftMirror(localPath, 'audio', true)
    }
  }

  async function removeGraftThumbsForMediaFile(filePath, kind, vfsFolder) {
    if (!graftEnabled()) return { deleted: 0, freedBytes: 0 }
    const folder = dirname(filePath)
    const vfs = vfsFolder ? normalizeVfsFolder(vfsFolder) : folderVfsFor(folder)
    if (!vfs) return { deleted: 0, freedBytes: 0 }
    const root = await getGraftRoot()
    if (!root) return { deleted: 0, freedBytes: 0 }
    const base = stripExt(basename(filePath))
    const names = kind === 'video'
      ? [base + '.gif', base + '.jpg', base + '_palette.png']
      : [base + '.jpg']
    const result = { deleted: 0, freedBytes: 0 }
    for (const name of names) {
      const destination = graftDestination(root, vfs,
        kind === 'video' ? VIDEO_THUMBNAIL_DIR : COVERS_DIR, name)
      if (!destination) continue
      const res = await removeFileQuiet(destination)
      result.deleted += res.deleted
      result.freedBytes += res.size
    }
    return result
  }

  function schedulePostDeleteGraftFolder(folderSource, vfsFolder) {
    let attempts = 0
    const check = async () => {
      if (cleanupDisposed || !graftEnabled()) return
      attempts++
      const exists = await fsp.access(folderSource).then(() => true, () => false)
      if (exists) {
        if (attempts < 3) api.setTimeout(check, 1500)
        return
      }
      try {
        const root = await getGraftRoot()
        const segments = vfsSegments(vfsFolder)
        if (!root || !segments || !segments.length) return
        for (const subDir of [VIDEO_THUMBNAIL_DIR, COVERS_DIR]) {
          const destination = join(root, ...segments, CACHE_DIR, subDir)
          const rel = relative(root, destination)
          if (!rel || rel.startsWith('..') || isAbsolute(rel)) continue
          await fsp.rm(destination, { recursive: true, force: true })
        }
        // Only removes empty directories, so other mirrors are untouched.
        await fsp.rmdir(join(root, ...segments, CACHE_DIR)).catch(() => {})
        await fsp.rmdir(join(root, ...segments)).catch(() => {})
        debugLog(`[Graft] Removed mirrored folder: ${vfsFolder}`)
      } catch (e) {
        debugLog(`[Graft] Folder cleanup failed: ${e.message}`)
      }
    }
    api.setTimeout(check, 1200)
  }

  // Config/VFS changes can move the graft root: drop the cached resolution.
  api.subscribeConfig(['enableGraftMode', 'graftPath'], () => {
    graftRootCache = { at: 0, path: '' }
  })
  api.events.on('config.vfs', () => {
    mountsCache = null
    graftRootCache = { at: 0, path: '' }
  })

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

  async function cleanCacheDir(cachePath, target, media, report) {
    let cacheEntries
    try {
      cacheEntries = await fsp.readdir(cachePath, { withFileTypes: true })
    } catch (e) {
      if (e.code !== 'ENOENT')
        debugLog(`[Cleanup] Cannot read ${cachePath}: ${e.message}`)
      return
    }

    for (const entry of cacheEntries) {
      if (cleanupDisposed) break
      if (!cleanupEnabled()) break
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

    // Never treat the graft storage itself as a media cache: browsing the
    // mirror tree must not delete the mirrors. Protect it even while graft
    // mode is switched off, so disabling it doesn't expose the mirrors.
    const graftRoot = await getGraftRoot(true)
    if (graftRoot && isInsideFolder(graftRoot, folder)) {
      report.skipped = 'graft-storage'
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
      if (!cleanupEnabled()) break
      await cleanCacheDir(join(folder, CACHE_DIR, target.subDir), target, media, report)
    }

    // Clean the mirrored copy as well, when graft mode is active and the
    // folder can be mapped back to its VFS path.
    if (graftEnabled() && cleanupEnabled()) {
      const root = await getGraftRoot()
      const segments = decodedSegments(folderVfsFor(folder))
      if (root && segments && segments.length) {
        for (const target of CLEANUP_TARGETS) {
          if (target.kind === 'video' && !graftVideoEnabled()) continue
          if (target.kind === 'audio' && !graftMusicEnabled()) continue
          await cleanCacheDir(join(root, ...segments, CACHE_DIR, target.subDir), target, media, report)
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
    let hasCache = false
    try {
      hasCache = fs.existsSync(join(folder, CACHE_DIR))
    } catch { return }
    if (!hasCache) {
      // The local cache may have been wiped while the graft mirror is still
      // there: allow the pass when the folder maps to a VFS path.
      if (!graftEnabled() || !folderVfsFor(folder)) return
    }
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
  async function removeThumbsForMediaFile(filePath, vfsFolder) {
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

    if (graftEnabled()) {
      const graft = await removeGraftThumbsForMediaFile(filePath, kind, vfsFolder)
      result.deleted += graft.deleted
      result.freedBytes += graft.freedBytes
    }
    return result
  }

  function schedulePostDeleteCleanup(filePath, vfsFolder) {
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
        const res = await removeThumbsForMediaFile(filePath, vfsFolder)
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
    const source = node?.source
    if (!source) return

    if (node?.isFolder) {
      // rm -r removes the local cache; the graft mirror needs its own cleanup.
      if (graftEnabled())
        schedulePostDeleteGraftFolder(source, node?.vfsPath)
      return
    }

    const ext = getFileExtension(source)
    if (!VIDEO_FILE_EXTS.includes(ext) && !AUDIO_FILE_EXTS.includes(ext)) return

    const folderVfs = vfsDirname(node?.vfsPath)
    if (folderVfs)
      rememberFolderVfs(dirname(source), folderVfs)
    schedulePostDeleteCleanup(source, folderVfs)
  })

  // ================ Batch Conversion / Mirroring ================
  // A folder listing queues missing covers for conversion and existing covers
  // for mirroring. Jobs run one at a time, skip anything already present, and
  // the batch is cancelled when the client lists another folder, leaves the
  // page, or stays idle too long.
  const BATCH_IDLE_MS = 5 * 60 * 1000
  const BATCH_MAX_JOBS = 400
  const CANDIDATE_IDLE_MS = 30 * 60 * 1000
  const batchClients = new Map()
  let batchWorkerRunning = false
  // Files seen in the current listing, remembered until the first playback.
  const candidateClients = new Map() // clientKey -> Map(folderKey -> { folder, listUri, files: Map })
  const candidateActivity = new Map() // clientKey -> timestamp

  function batchClientKey(ctx) {
    return (api.getCurrentUsername(ctx) || '') + '|' + (ctx?.ip || '')
  }

  // Only the main GUI list (EventSource) drives batches. Other plugins query
  // get_file_list as plain JSON and must not start or cancel a batch.
  function isGuiListRequest(ctx) {
    return Boolean(ctx && typeof ctx.get === 'function'
      && String(ctx.get('accept') || '').includes('text/event-stream'))
  }

  function cancelBatch(batch, reason) {
    if (!batch || batch.cancelled) return
    batch.cancelled = true
    batch.queue.length = 0
    batch.queued.clear()
    if (batchClients.get(batch.key) === batch)
      batchClients.delete(batch.key)
    debugLog(`[Batch] Cancelled (${reason}): ${batch.listUri}`)
  }

  function cancelClientBatch(ctx, reason) {
    cancelBatch(batchClients.get(batchClientKey(ctx)), reason)
  }

  function rememberCandidate(ctx, listUri, filePath, folder, vfsFolder, kind) {
    if (cleanupDisposed) return
    const key = batchClientKey(ctx)
    let folders = candidateClients.get(key)
    if (!folders) {
      folders = new Map()
      candidateClients.set(key, folders)
    }
    const fkey = folderKey(folder)
    let entry = folders.get(fkey)
    if (!entry) {
      entry = { folder, listUri: String(listUri || '/'), files: new Map() }
      folders.set(fkey, entry)
    }
    entry.listUri = String(listUri || entry.listUri || '/')
    if (entry.files.size < 2000)
      entry.files.set(filePath, { kind, vfsFolder })
    if (folders.size > 100) {
      for (const oldKey of folders.keys()) {
        folders.delete(oldKey)
        if (folders.size <= 80) break
      }
    }
    candidateActivity.set(key, Date.now())
  }

  function candidatesFor(ctx, folder) {
    const folders = candidateClients.get(batchClientKey(ctx))
    return folders && folders.get(folderKey(folder))
  }

  function clearCandidatesForClient(ctx) {
    const key = batchClientKey(ctx)
    candidateClients.delete(key)
    candidateActivity.delete(key)
  }

  function getBatch(ctx, listUri) {
    if (cleanupDisposed) return null
    const key = batchClientKey(ctx)
    const uri = String(listUri || '/')
    let batch = batchClients.get(key)
    if (batch && batch.listUri !== uri) {
      cancelBatch(batch, 'folder-changed')
      batch = null
    }
    if (!batch) {
      batch = { key, listUri: uri, queue: [], queued: new Set(), cancelled: false, lastActivity: Date.now() }
      batchClients.set(key, batch)
    }
    batch.lastActivity = Date.now()
    return batch
  }

  function queueBatchJob(ctx, listUri, job) {
    const batch = getBatch(ctx, listUri)
    if (!batch) return
    if (batch.queue.length >= BATCH_MAX_JOBS) return
    const id = job.type + '|' + (job.filePath || job.localPath)
    if (batch.queued.has(id)) return
    job.id = id
    batch.queued.add(id)
    batch.queue.push(job)
    batch.lastActivity = Date.now()
    runBatchWorker()
  }

  function nextBatchWithJobs() {
    for (const batch of batchClients.values())
      if (!batch.cancelled && batch.queue.length)
        return batch
    return null
  }

  async function runBatchWorker() {
    if (batchWorkerRunning || cleanupDisposed) return
    batchWorkerRunning = true
    try {
      while (!cleanupDisposed) {
        const batch = nextBatchWithJobs()
        if (!batch) break
        const job = batch.queue.shift()
        batch.queued.delete(job.id)
        if (batch.cancelled) continue
        try {
          if (job.type === 'convert') {
            const kind = VIDEO_FILE_EXTS.includes(getFileExtension(job.filePath)) ? 'video' : 'audio'
            if (!existingCoverPath(job.filePath, kind)) {
              debugLog(`[Batch] Convert: ${basename(job.filePath)}`)
              await extractThumbnail(job.filePath)
            }
          } else if (job.type === 'mirror' && graftEnabled()) {
            debugLog(`[Batch] Mirror: ${basename(job.localPath)}`)
            await mirrorThumbToGraft(job.localPath, job.kind)
          }
        } catch (e) {
          debugLog(`[Batch] Job failed: ${e && e.message}`)
        }
        await new Promise(r => setImmediate(r))
      }
    } finally {
      batchWorkerRunning = false
      if (!cleanupDisposed && nextBatchWithJobs()) runBatchWorker()
    }
  }

  function existingCoverPath(filePath, kind) {
    const folder = dirname(filePath)
    const base = stripExt(basename(filePath))
    if (kind === 'audio') {
      const cover = join(folder, CACHE_DIR, COVERS_DIR, base + '.jpg')
      return fs.existsSync(cover) ? cover : ''
    }
    const preferred = api.getConfig('videoThumbFormat') || 'jpg'
    const formats = preferred === 'gif' ? ['gif', 'jpg'] : ['jpg', 'gif']
    for (const format of formats) {
      const thumb = join(folder, CACHE_DIR, VIDEO_THUMBNAIL_DIR, `${base}.${format}`)
      if (fs.existsSync(thumb)) return thumb
    }
    return ''
  }

  function playbackJob(filePath, vfsFolder, kind) {
    const cover = existingCoverPath(filePath, kind)
    if (cover) {
      if (!graftEnabled()) return null
      return { type: 'mirror', filePath, localPath: cover, kind }
    }
    return { type: 'convert', filePath, vfsFolder }
  }

  function startBatchForFile(ctx, filePath, vfsFolder, kind) {
    if (cleanupDisposed) return { started: false }
    const folder = dirname(filePath)
    const cand = candidatesFor(ctx, folder)
    const listUri = cand?.listUri || normalizeVfsFolder(vfsFolder) || '/'
    const key = batchClientKey(ctx)
    const existing = batchClients.get(key)
    if (existing && !existing.cancelled && existing.listUri === listUri)
      return { started: false, reason: 'already' }
    if (existing) cancelBatch(existing, 'new-play')

    const batch = getBatch(ctx, listUri)

    // 1) the currently playing file first
    const first = playbackJob(filePath, vfsFolder, kind)
    if (first) queueBatchJob(ctx, listUri, first)

    // 2) then the rest of the folder remembered from the listing
    if (cand) {
      for (const [path, info] of cand.files) {
        if (path === filePath) continue
        const job = playbackJob(path, info.vfsFolder, info.kind)
        if (job) queueBatchJob(ctx, listUri, job)
      }
    }
    return { started: true, queued: batch.queue.length }
  }

  async function startPlaybackBatch(ctx, uri) {
    if (cleanupDisposed) return { started: false }
    let node
    try {
      const vfs = api.require('./vfs')
      node = await vfs.urlToNode(uri, ctx)
      if (!node?.source || (vfs.hasPermission && !vfs.hasPermission(node, 'can_read', ctx)))
        return { started: false }
    } catch (e) {
      debugLog(`[Batch] Cannot resolve playback uri: ${e.message}`)
      return { started: false }
    }
    const ext = getFileExtension(node.source)
    const kind = VIDEO_FILE_EXTS.includes(ext) ? 'video'
      : AUDIO_FILE_EXTS.includes(ext) ? 'audio' : ''
    if (!kind) return { started: false }
    const vfsFolder = vfsDirname(node.vfsPath)
    if (vfsFolder) rememberFolderVfs(dirname(node.source), vfsFolder)
    return startBatchForFile(ctx, node.source, vfsFolder, kind)
  }

  // Idle batches are dropped to protect the server even if the client
  // disappears without a pagehide event.
  api.setInterval(() => {
    const now = Date.now()
    for (const batch of Array.from(batchClients.values()))
      if (now - batch.lastActivity > BATCH_IDLE_MS)
        cancelBatch(batch, 'idle')
    for (const [key, ts] of candidateActivity)
      if (now - ts > CANDIDATE_IDLE_MS) {
        candidateClients.delete(key)
        candidateActivity.delete(key)
      }
  }, 15000)

  // ================ Thumbnail Extraction Main Function ================
  const thumbnailQueue = new ThumbnailQueue()
  const pendingTasks = new Map()

  async function extractThumbnailWithDebounce(filePath, vfsFolder) {
    if (vfsFolder) rememberFolderVfs(dirname(filePath), vfsFolder)
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
          await mirrorThumbToGraft(coverPath, 'audio')
          return
        } catch {}

        await thumbnailQueue.add({
          type: 'cover',
          filePath,
          thumbnailPath: coverPath,
          params: {}
        })
        debugLog(`[Cover] Extraction complete: ${coverPath}`)
        await mirrorThumbToGraft(coverPath, 'audio')
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
          await mirrorThumbToGraft(thumbnailPath, 'video')
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

            let success = false
            const times = [time, '00:00:00'].filter((value, index, all) => all.indexOf(value) === index)
            for (const currentTime of times) {
              try {
                debugLog(`[Thumbnail] Trying JPG at ${currentTime}`)
                await thumbnailQueue.add({
                  type: 'jpg',
                  filePath,
                  thumbnailPath,
                  params: { time: currentTime }
                })
                success = true
                break
              } catch (error) {
                debugLog(`[Thumbnail] JPG attempt failed (${currentTime}): ${error.message}`)
              }
            }
            if (!success) {
              await fsp.unlink(thumbnailPath).catch(() => {})
              throw new Error('All JPG generation attempts failed')
            }
          } else {
            let success = false
            // Final safety net: 0s, very short, low fps and small width.
            const lastResort = {
              startTime: 0,
              duration: 2,
              fps: 2,
              width: Math.min(gradientParams.SHORT.width || 320, 160)
            }
            const attempts = isLongVideo
              ? [gradientParams.LONG, gradientParams.SHORT, gradientParams.BACKUP, lastResort]
              : [gradientParams.SHORT, gradientParams.BACKUP, lastResort]

            for (const params of attempts) {
              try {
                debugLog(`[Thumbnail] Trying GIF start=${params.startTime}s duration=${params.duration}s fps=${params.fps} width=${params.width}`)
                await thumbnailQueue.add({
                  type: 'gif',
                  filePath,
                  thumbnailPath,
                  params: params
                })
                success = true
                break
              } catch (error) {
                debugLog(`[Thumbnail] GIF attempt failed: ${error.message}`)
              }
            }

            if (!success) {
              await fsp.unlink(thumbnailPath).catch(() => {})
              throw new Error('All GIF generation attempts failed')
            }
          }

          debugLog(`[Thumbnail] Complete: ${thumbnailPath}`)
          await mirrorThumbToGraft(thumbnailPath, 'video')
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
        api.log('[Thumbnail] 鈿狅笍 FFmpeg not found. Please configure the correct path.')
        ffmpegReady = false
        resolve(false)
      })
      proc.on('exit', (code) => {
        if (code === 0) {
          if (api.getConfig('debug_ffmpeg')) {
            api.log('[Thumbnail] 鉁?FFmpeg ready')
          }
          ffmpegReady = true
          resolve(true)
        } else {
          api.log('[Thumbnail] 鈿狅笍 FFmpeg version check failed')
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
      for (const batch of Array.from(batchClients.values()))
        cancelBatch(batch, 'unload')
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

    // Called by the frontend when the page is being left, so a batch doesn't
    // continue in the background.
    customRest: {
      async mvCovers_startBatch({ uri } = {}, ctx) {
        if (!uri || typeof uri !== 'string') throw 'missing uri'
        return await startPlaybackBatch(ctx, uri)
      },
      async mvCovers_cancelBatch(_params, ctx) {
        cancelClientBatch(ctx, 'client-left')
        clearCandidatesForClient(ctx)
        return { ok: true }
      }
    },

    onDirEntry({ entry, node, ctx, listUri }) {
      if (node?.isFolder) return
      const filePath = node?.source
      if (!filePath) return

      const ext = getFileExtension(filePath)
      const isAudio = AUDIO_FILE_EXTS.includes(ext)
      const isVideo = VIDEO_FILE_EXTS.includes(ext)
      if (!isAudio && !isVideo) return

      const folder = dirname(filePath)
      const folderVfs = node?.parent?.vfsPath || vfsDirname(node?.vfsPath)
      if (folderVfs) rememberFolderVfs(folder, folderVfs)

      const fileName = stripExt(basename(filePath))
      if (!fileName) return

      const kind = isAudio ? 'audio' : 'video'
      const cover = existingCoverPath(filePath, kind)
      if (cover) {
        entry._hasCover = true
        entry._coverType = kind
        if (isVideo) entry.coverExt = mediaExtName(cover)
      }

      // Do not convert or mirror on listing. Only remember candidates; the
      // batch starts when the first video is played.
      if (isGuiListRequest(ctx))
        rememberCandidate(ctx, listUri, filePath, folder, folderVfs, kind)
    },

    middleware: async ctx => {
      // Folder navigation cancels the previous folder's batch immediately.
      // Only the main GUI list (SSE) is considered.
      if (ctx.path === '/~/api/get_file_list' && isGuiListRequest(ctx)) {
        const uri = String(ctx.query.uri || '/')
        const key = batchClientKey(ctx)
        const batch = batchClients.get(key)
        if (batch) {
          if (batch.listUri !== uri) cancelBatch(batch, 'folder-changed')
          else batch.lastActivity = Date.now()
        }
        const folders = candidateClients.get(key)
        if (folders) {
          for (const [fkey, cand] of folders)
            if (cand.listUri !== uri) folders.delete(fkey)
          if (!folders.size) candidateClients.delete(key)
        }
      }

      if (graftEnabled()) {
        try { await materializeGraftFromLocal(ctx.path) }
        catch (e) { debugLog(`[Graft] Materialize request failed: ${e.message}`) }
      }

      // Start extraction as soon as a media file is requested (playback or
      // download), instead of waiting for the response to finish. This way the
      // cover is usually ready by the time the player is closed.
      const requestExt = getFileExtension(ctx.path)
      if (SUPPORTED_AUDIO_EXTS.includes(requestExt) || SUPPORTED_VIDEO_EXTS.includes(requestExt)) {
        try {
          const vfs = api.require('./vfs')
          const node = await vfs.urlToNode(ctx.path, ctx)
          if (node?.source && (!vfs.hasPermission || vfs.hasPermission(node, 'can_read', ctx))) {
            const folderVfs = vfsDirname(node.vfsPath)
            if (folderVfs) rememberFolderVfs(dirname(node.source), folderVfs)
            const ext = getFileExtension(node.source)
            const kind = VIDEO_FILE_EXTS.includes(ext) ? 'video'
              : AUDIO_FILE_EXTS.includes(ext) ? 'audio' : ''
            if (kind) {
              const dest = String(ctx.get('sec-fetch-dest') || '')
              if (dest === 'video' || dest === 'audio') {
                // Real playback request: start the folder batch with this file first.
                startBatchForFile(ctx, node.source, folderVfs, kind)
              } else {
                // Download/other request: at most convert this one file.
                extractThumbnailWithDebounce(node.source, folderVfs).catch(e => {
                  debugLog(`Thumbnail extraction error: ${e.message}`)
                })
              }
            }
          }
        } catch (e) {
          debugLog(`[Media] Cannot resolve request ${ctx.path}: ${e.message}`)
        }
      }

      return async () => {
        const src = ctx.state.fileSource
        if (!src) return

        const ext = getFileExtension(src)
        if (!SUPPORTED_AUDIO_EXTS.includes(ext) && !SUPPORTED_VIDEO_EXTS.includes(ext)) return

        let folderVfs = ''
        if (graftEnabled()) {
          let vfsPath = ctx.state.vfsNode?.vfsPath
          if (!vfsPath) {
            try {
              const { urlToNode } = api.require('./vfs')
              vfsPath = (await urlToNode(ctx.path, ctx))?.vfsPath
            } catch (e) {
              debugLog(`[Graft] Cannot resolve request VFS path: ${e.message}`)
            }
          }
          folderVfs = vfsDirname(vfsPath)
          if (folderVfs) rememberFolderVfs(dirname(src), folderVfs)
          mirrorExistingMediaThumbs(src, folderVfs)
        }

        extractThumbnailWithDebounce(src, folderVfs).catch(e => {
          debugLog(`Thumbnail extraction error: ${e.message}`)
        })
      }
    }
  }
}