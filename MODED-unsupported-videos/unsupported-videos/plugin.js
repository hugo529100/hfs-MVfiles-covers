exports.version = 3.4;
exports.apiRequired = 12.91;
exports.description = "Optimized media player with intelligent gradient transcoding and high-quality DSD/DSF support";
exports.repo = "Hug3O/Unsupported-videos";
exports.preview = ["https://github.com/user-attachments/assets/7daaf2c8-9dbd-46f1-93b6-7628c4d1d3b6"];
exports.frontend_js = 'main.js';

const CACHE_DIR = 'cache';
const COVERS_DIR = 'covers';
const VIDEO_THUMBNAIL_DIR = 'videothumbnail';
const TEMP_PREFIX = 'tmp_';
const MIN_FILE_SIZE = 1024;
const WAV_MIN_SIZE = 1024 * 1024;
const FLAC_HEADER = Buffer.from('664c6143', 'hex');
const SUPPORTED_AUDIO_EXTS = ['mp3','flac','m4a','ogg','opus','wma','aiff','aif','alac','dsd','dsf','dff','ape','wav'];
const SUPPORTED_VIDEO_EXTS = ['webm','avi','mkv','mp4','mov','mpg','wmv','ts','rmvb','rm','dat','vob','flv'];
const PROCESS_CLEANUP_TIMEOUT = 5000;
const THUMBNAIL_DEBOUNCE_DELAY = 2000; // 防抖延迟2秒

// 配置面板
exports.config = {
  extensions: {
    frontend: true,
    defaultValue: 'webm,avi,mkv,mp4,mov,mpg,rmvb,rm,dat,ts,vob,aiff,aif,alac,dsd,dsf,dff,ape,mp3,flac,m4a,ogg,wma,wmv',
    helperText: "Supported file extensions",
    xs: 12
  },
  ffmpeg_path: {
    type: 'real_path',
    fileMask: 'ffmpeg*',
    defaultValue: '',
    helperText: "Path to FFmpeg executable. Leave empty if it's in the system path.",
    xs: 6
  },
  ffmpeg_parameters: {
    defaultValue: '',
    helperText: "Additional parameters to pass to FFmpeg (supports quotes)",
    xs: 6
  },
  max_processes: { 
    type: 'number', 
    min: 1, 
    max: 50, 
    defaultValue: 3, 
    xs: 6,
    label: "Max concurrent processes",
    helperText: "Maximum number of concurrent FFmpeg processes"
  },
  allowAnonymous: { 
    type: 'boolean', 
    defaultValue: true, 
    xs: 6,
    label: "Allow anonymous access",
    helperText: "Allow users without account to access media"
  },
  max_processes_per_account: {
    showIf: x => !x.allowAnonymous,
    type: 'number', 
    min: 1, 
    max: 50, 
    defaultValue: 1, 
    xs: 6,
    label: "Max processes per account",
    helperText: "Maximum processes per user account"
  },
  accounts: {
    showIf: x => !x.allowAnonymous,
    type: 'username', 
    multiple: true,
    label: "Allowed accounts",
    helperText: "Leave empty to allow every account",
    xs: 12
  },
  audio_format: {
    type: 'select',
    label: 'Audio output format',
    defaultValue: 'wav',
    options: { 
      FLAC: 'flac', 
      WAV: 'wav' 
    },
    xs: 6
  },
  enable_lossless_cache: {
    type: 'boolean',
    defaultValue: true,
    label: 'Enable lossless audio cache',
    showIf: x => x.audio_format === 'flac' || x.audio_format === 'wav',
    helperText: 'Cache decoded lossless audio files for faster playback',
    xs: 6
  },
  dsd_conversion_mode: {
    type: 'select',
    label: 'DSD Conversion Quality',
    defaultValue: 'ultra',
    options: {
      'Standard Quality': 'standard',
      'High Quality': 'high',
      'Ultra Quality': 'ultra'
    },
    helperText: 'Quality setting for DSD to PCM conversion',
    showIf: x => x.extensions.includes('dsd') || x.extensions.includes('dsf'),
    xs: 6
  },
  extract_covers: {
    type: 'boolean',
    defaultValue: false,
    label: 'Extract album covers',
    helperText: 'Extract embedded album covers from audio files',
    xs: 6
  },
  force_transcode_formats: {
    type: 'string',
    defaultValue: 'wmv,mpg,avi,ts,rmvb,vob,flv,mkv',
    helperText: 'File formats that should always be transcoded (comma separated)',
    xs: 12
  },  
  transcode_quality: {
    type: 'select',
    label: 'Transcoding Quality',
    defaultValue: 'balanced',
    options: {
      'Fast Preview (Low Quality)': 'fast',
      'Balanced (Recommended)': 'balanced',
      'High Quality': 'high'
    },
    helperText: 'Select transcoding quality to balance loading speed and video quality',
    xs: 6
  },
  enable_hwaccel: {
    type: 'boolean',
    xs: 6,
    defaultValue: false,
    label: 'Enable hardware acceleration',
    helperText: 'Use hardware acceleration for video transcoding if available'
  },
  extract_video_thumbnails: {
    type: 'boolean',
    defaultValue: false,
    label: 'Extract video thumbnails',
    helperText: 'Extract thumbnails from video files',
    showIf: x => x.extract_covers,
    xs: 6
  },
  thumbnail_format: {
    type: 'select',
    label: 'Thumbnail format',
    defaultValue: 'jpg',
    options: {
      'JPG (Static)': 'jpg',
      'GIF (Animated preview)': 'gif'
    },
    showIf: x => x.extract_video_thumbnails,
    xs: 6
  },
  video_size_threshold: {
    type: 'number',
    defaultValue: 250,
    min: 1,
    max: 100000,
    label: 'Video size threshold (MB)',
    helperText: 'Videos larger than this will use long video settings',
    showIf: x => x.extract_video_thumbnails && x.thumbnail_format === 'gif',
    xs: 6
  },
  gif_width: {
    type: 'number',
    min: 100,
    max: 800,
    defaultValue: 320,
    label: 'GIF width (pixels)',
    helperText: 'Width of output GIF (height auto-scaled)',
    showIf: x => x.extract_video_thumbnails && x.thumbnail_format === 'gif',
    xs: 6
  },
  short_video_start_time: {
    type: 'string',
    defaultValue: '00:03:00',
    label: 'Short video start time (HH:MM:SS)',
    helperText: 'Start time for short videos (<= threshold)',
    showIf: x => x.extract_video_thumbnails && x.thumbnail_format === 'gif',
    xs: 12
  },
  short_video_duration: {
    type: 'number',
    min: 1,
    max: 60,
    defaultValue: 10,
    label: 'Short video GIF duration (seconds)',
    helperText: 'Duration of GIF for short videos',
    showIf: x => x.extract_video_thumbnails && x.thumbnail_format === 'gif',
    xs: 6
  },
  short_video_fps: {
    type: 'number',
    min: 1,
    max: 30,
    defaultValue: 5,
    label: 'Short video GIF FPS',
    helperText: 'Frames per second for short videos',
    showIf: x => x.extract_video_thumbnails && x.thumbnail_format === 'gif',
    xs: 6
  },
  long_video_start_time: {
    type: 'string',
    defaultValue: '00:10:00',
    label: 'Long video start time (HH:MM:SS)',
    helperText: 'Start time for long videos (> threshold)',
    showIf: x => x.extract_video_thumbnails && x.thumbnail_format === 'gif',
    xs: 12
  },
  long_video_duration: {
    type: 'number',
    min: 1,
    max: 60,
    defaultValue: 12,
    label: 'Long video GIF duration (seconds)',
    helperText: 'Duration of GIF for long videos',
    showIf: x => x.extract_video_thumbnails && x.thumbnail_format === 'gif',
    xs: 6
  },
  long_video_fps: {
    type: 'number',
    min: 1,
    max: 30,
    defaultValue: 6,
    label: 'Long video GIF FPS',
    helperText: 'Frames per second for long videos',
    showIf: x => x.extract_video_thumbnails && x.thumbnail_format === 'gif',
    xs: 6
  },
  backup_video_start_time: {
    type: 'string',
    defaultValue: '00:00:00',
    label: 'Backup video start time (HH:MM:SS)',
    helperText: 'Fallback start time when other settings fail',
    showIf: x => x.extract_video_thumbnails && x.thumbnail_format === 'gif',
    xs: 12
  },
  backup_video_duration: {
    type: 'number',
    min: 1,
    max: 60,
    defaultValue: 6,
    label: 'Backup video GIF duration (seconds)',
    helperText: 'Duration of GIF for backup mode',
    showIf: x => x.extract_video_thumbnails && x.thumbnail_format === 'gif',
    xs: 6
  },
  backup_video_fps: {
    type: 'number',
    min: 1,
    max: 30,
    defaultValue: 5,
    label: 'Backup video GIF FPS',
    helperText: 'Frames per second for backup mode',
    showIf: x => x.extract_video_thumbnails && x.thumbnail_format === 'gif',
    xs: 6
  },
  thumbnail_time: {
    type: 'string',
    defaultValue: '00:00:05',
    label: 'JPG thumbnail time position',
    helperText: 'Time position for JPG thumbnail extraction (HH:MM:SS)',
    showIf: x => x.extract_video_thumbnails && x.thumbnail_format === 'jpg',
    xs: 6
  },
  debug_ffmpeg: {
    type: 'boolean',
    xs: 6,
    defaultValue: false,
    label: 'Debug FFmpeg',
    helperText: 'Enable FFmpeg debug logging'
  }
};

exports.configDialog = { maxWidth: '55em' };

exports.changelog = [
  { "version": 2.1, "message": "Added debounce and deduplication for thumbnail extraction to prevent FFmpeg process flood" },
  { "version": 2.0, "message": "Added single-process thumbnail queue to prevent CPU overload" },
  { "version": 1.9, "message": "Added video time settings and reorganized configuration panel" },
  { "version": 1.8, "message": "Support quoting in the parameters configuration" },
  { "version": 1.7, "message": "Optimized DSD/DSF support with ultra quality mode" },
  { "version": 1.6, "message": "Added video thumbnail extraction and improved caching" },
  { "version": 1.5, "message": "Enhanced audio processing and DSD conversion" },
  { "version": 1.4, "message": "Added audio format selection and lossless cache" },
  { "version": 1.3, "message": "Improved process management and error handling" },
  { "version": 1.2, "message": "Added hardware acceleration support" },
  { "version": 1.1, "message": "Extended format support and optimized transcoding" },
  { "version": 1.0, "message": "Initial optimized media player release" }
];

exports.init = api => {
  const running = new Map();
  const thumbnailProcesses = new Map();
  const pendingThumbnails = new Map(); // 防抖和去重
  const { spawn } = api.require('child_process');
  const fs = api.require('fs');
  const fsp = fs.promises;
  const pathLib = api.require('path');
  const os = api.require('os');

  // ================ 缩略图队列管理器 ================
  class ThumbnailQueue {
    constructor() {
      this.queue = [];
      this.currentProcesses = new Map();
      this.processedCount = 0;
      this.failedCount = 0;
      this.isProcessing = false;
      this.maxConcurrent = 1;
    }

    add(task) {
      return new Promise((resolve, reject) => {
        this.queue.push({ task, resolve, reject, addedAt: Date.now() });
        debugLog(`[队列] 任务入队 (队列长度: ${this.queue.length})`);
        this.processQueue();
      });
    }

    async processQueue() {
      if (this.isProcessing) {
        debugLog(`[队列] 正在处理中，跳过`);
        return;
      }
      
      if (this.queue.length === 0) {
        return;
      }
      
      if (this.currentProcesses.size >= this.maxConcurrent) {
        debugLog(`[队列] 已达并发上限 (${this.currentProcesses.size}/${this.maxConcurrent})`);
        return;
      }

      this.isProcessing = true;
      debugLog(`[队列] 开始处理 (队列: ${this.queue.length}, 进程: ${this.currentProcesses.size})`);

      try {
        while (this.queue.length > 0 && this.currentProcesses.size < this.maxConcurrent) {
          const item = this.queue.shift();
          const { task, resolve, reject } = item;
          
          debugLog(`[队列] 执行任务 (剩余: ${this.queue.length})`);
          
          this.executeTask(task)
            .then(result => {
              this.processedCount++;
              debugLog(`[队列] 任务成功 (总成功: ${this.processedCount})`);
              resolve(result);
            })
            .catch(error => {
              this.failedCount++;
              debugLog(`[队列] 任务失败 (总失败: ${this.failedCount}) - ${error.message}`);
              reject(error);
            })
            .finally(() => {
              this.isProcessing = false;
              setImmediate(() => this.processQueue());
            });
        }
      } finally {
        if (this.queue.length > 0 && this.currentProcesses.size < this.maxConcurrent) {
          this.isProcessing = false;
          setImmediate(() => this.processQueue());
        } else {
          this.isProcessing = false;
        }
      }
    }

    async executeTask(task) {
      const { filePath, thumbnailPath, params, type } = task;
      
      const processKey = `${pathLib.basename(filePath)}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      this.currentProcesses.set(processKey, { 
        startTime: Date.now(),
        filePath,
        type
      });

      try {
        debugLog(`[队列] [${type}] 开始: ${pathLib.basename(filePath)}`);
        
        let result;
        switch(type) {
          case 'gif':
            result = await this.generateGif(filePath, thumbnailPath, params);
            break;
          case 'jpg':
            result = await this.generateJpg(filePath, thumbnailPath, params);
            break;
          case 'cover':
            result = await this.extractCover(filePath, thumbnailPath, params);
            break;
          default:
            throw new Error(`未知任务类型: ${type}`);
        }
        
        debugLog(`[队列] [${type}] 完成: ${pathLib.basename(filePath)}`);
        return result;
      } finally {
        this.currentProcesses.delete(processKey);
        debugLog(`[队列] 进程释放 (剩余进程: ${this.currentProcesses.size})`);
      }
    }

    async generateGif(filePath, thumbnailPath, params) {
      const startTime = params.startTime;
      const duration = params.duration;
      const fps = params.fps;
      const width = params.width;
      
      debugLog(`[队列] GIF参数: 起始=${startTime}s, 时长=${duration}s, FPS=${fps}, 宽度=${width}`);
      
      const palettePath = thumbnailPath.replace('.gif', '_palette.png');
      
      // 生成调色板
      const paletteArgs = [
        '-ss', formatTimeFromSeconds(startTime),
        '-t', '5',
        '-i', filePath,
        '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen`,
        '-y', palettePath
      ];
      
      const paletteProc = spawn(api.getConfig('ffmpeg_path') || 'ffmpeg', paletteArgs);
      
      await new Promise((resolve, reject) => {
        let stderr = '';
        paletteProc.stderr.on('data', data => { stderr += data.toString(); });
        
        paletteProc.on('exit', code => {
          cleanupProcess(paletteProc);
          if (code !== 0) {
            debugLog(`[队列] 调色板生成失败 (代码: ${code}): ${stderr}`);
            fsp.unlink(palettePath).catch(() => {});
            reject(new Error(`Palette generation failed with code ${code}`));
          } else {
            resolve();
          }
        });
        paletteProc.on('error', reject);
      });
      
      // 生成GIF
      const gifArgs = [
        '-ss', formatTimeFromSeconds(startTime),
        '-t', duration.toString(),
        '-i', filePath,
        '-i', palettePath,
        '-filter_complex', `fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
        '-loop', '0',
        '-f', 'gif',
        '-y', thumbnailPath
      ];
      
      const gifProc = spawn(api.getConfig('ffmpeg_path') || 'ffmpeg', gifArgs);
      
      return new Promise((resolve, reject) => {
        let stderr = '';
        gifProc.stderr.on('data', data => { stderr += data.toString(); });
        
        gifProc.on('exit', async code => {
          cleanupProcess(gifProc);
          try { await fsp.unlink(palettePath).catch(() => {}); } catch {}
          
          if (code === 0) {
            try {
              const stats = await fsp.stat(thumbnailPath);
              if (stats.size > 0) {
                debugLog(`[队列] GIF生成成功 (大小: ${(stats.size/1024).toFixed(1)}KB)`);
                resolve(true);
              } else {
                debugLog(`[队列] GIF为0字节`);
                await fsp.unlink(thumbnailPath).catch(() => {});
                reject(new Error('Generated GIF is 0 bytes'));
              }
            } catch (err) {
              reject(err);
            }
          } else {
            debugLog(`[队列] GIF生成失败 (代码: ${code}): ${stderr}`);
            await fsp.unlink(thumbnailPath).catch(() => {});
            reject(new Error(`GIF generation failed with code ${code}`));
          }
        });
        gifProc.on('error', async (err) => {
          cleanupProcess(gifProc);
          await fsp.unlink(palettePath).catch(() => {});
          await fsp.unlink(thumbnailPath).catch(() => {});
          reject(err);
        });
      });
    }

    async generateJpg(filePath, thumbnailPath, params) {
      const time = params.time || '00:00:05';
      debugLog(`[队列] JPG参数: 时间=${time}`);

      const ffmpeg = spawn(api.getConfig('ffmpeg_path') || 'ffmpeg', [
        '-ss', time,
        '-i', filePath,
        '-vframes', '1',
        '-q:v', '2',
        '-f', 'image2',
        thumbnailPath
      ]);

      return new Promise((resolve, reject) => {
        let stderr = '';
        ffmpeg.stderr.on('data', data => { stderr += data.toString(); });
        
        ffmpeg.on('exit', code => {
          cleanupProcess(ffmpeg);
          if (code === 0) {
            debugLog(`[队列] JPG生成成功`);
            resolve(true);
          } else {
            debugLog(`[队列] JPG生成失败 (代码: ${code}): ${stderr}`);
            fsp.unlink(thumbnailPath).catch(() => {});
            reject(new Error(`JPG generation failed with code ${code}`));
          }
        });
        ffmpeg.on('error', reject);
      });
    }

    async extractCover(filePath, thumbnailPath, params) {
      debugLog(`[队列] 提取封面`);

      const ffmpeg = spawn(api.getConfig('ffmpeg_path') || 'ffmpeg', [
        '-i', filePath,
        '-an',
        '-vcodec', 'copy',
        thumbnailPath
      ]);

      return new Promise((resolve, reject) => {
        let stderr = '';
        ffmpeg.stderr.on('data', data => { stderr += data.toString(); });
        
        ffmpeg.on('exit', code => {
          cleanupProcess(ffmpeg);
          if (code === 0) {
            debugLog(`[队列] 封面提取成功`);
            resolve(true);
          } else {
            debugLog(`[队列] 封面提取失败 (代码: ${code}): ${stderr}`);
            fsp.unlink(thumbnailPath).catch(() => {});
            reject(new Error(`Cover extraction failed with code ${code}`));
          }
        });
        ffmpeg.on('error', reject);
      });
    }

    getStatus() {
      return {
        queueLength: this.queue.length,
        processing: this.isProcessing,
        currentProcesses: this.currentProcesses.size,
        maxConcurrent: this.maxConcurrent,
        processedCount: this.processedCount,
        failedCount: this.failedCount,
        currentTasks: Array.from(this.currentProcesses.keys())
      };
    }

    clear() {
      this.queue = [];
      this.currentProcesses.clear();
      debugLog('[队列] 已清空所有任务');
    }
  }

  // 初始化队列
  const thumbnailQueue = new ThumbnailQueue();

  // ================ 辅助函数 ================
  function parseTimeToSeconds(timeStr) {
    if (!timeStr.includes(':')) {
      return parseFloat(timeStr) || 0;
    }
    
    const parts = timeStr.split(':');
    if (parts.length !== 3) return 0;
    
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  function formatTimeFromSeconds(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function getGradientParams() {
    const gifWidth = api.getConfig('gif_width') || 320;
    
    const transcodeQuality = api.getConfig('transcode_quality') || 'balanced';
    let transcodeParams;
    
    switch(transcodeQuality) {
      case 'fast':
        transcodeParams = { crf: 28, preset: 'ultrafast', tune: 'fastdecode' };
        break;
      case 'high':
        transcodeParams = { crf: 18, preset: 'medium', tune: 'film' };
        break;
      default:
        transcodeParams = { crf: 23, preset: 'fast', tune: 'film' };
    }
    
    return {
      SHORT: {
        startTime: parseTimeToSeconds(api.getConfig('short_video_start_time') || '00:01:00'),
        duration: api.getConfig('short_video_duration') || 15,
        fps: api.getConfig('short_video_fps') || 5,
        width: gifWidth,
        transcode: transcodeParams
      },
      LONG: {
        startTime: parseTimeToSeconds(api.getConfig('long_video_start_time') || '00:03:00'),
        duration: api.getConfig('long_video_duration') || 12,
        fps: api.getConfig('long_video_fps') || 6,
        width: gifWidth,
        transcode: transcodeParams
      },
      BACKUP: {
        startTime: parseTimeToSeconds(api.getConfig('backup_video_start_time') || '00:00:00'),
        duration: api.getConfig('backup_video_duration') || 10,
        fps: api.getConfig('backup_video_fps') || 5,
        width: gifWidth,
        transcode: { crf: 26, preset: 'ultrafast', tune: 'fastdecode' }
      }
    };
  }

  async function validateAudioFile(filePath, format) {
    try {
      const stats = await fsp.stat(filePath);
      if (stats.size < MIN_FILE_SIZE) return false;
      
      if (format === 'wav') {
        return stats.size >= WAV_MIN_SIZE;
      } else if (format === 'flac') {
        const fd = await fsp.open(filePath, 'r');
        const buf = Buffer.alloc(4);
        await fd.read(buf, 0, 4, 0);
        await fd.close();
        return buf.equals(FLAC_HEADER);
      }
      return true;
    } catch {
      return false;
    }
  }

  async function cleanupTempFiles(dir) {
    try {
      const files = await fsp.readdir(dir);
      await Promise.all(files.map(async file => {
        if (file.startsWith(TEMP_PREFIX)) {
          try {
            await fsp.unlink(pathLib.join(dir, file));
            debugLog(`清理临时文件: ${file}`);
          } catch (e) {
            debugLog(`清理临时文件失败 ${file}: ${e}`);
          }
        }
      }));
    } catch (e) {
      if (e.code !== 'ENOENT') {
        debugLog(`临时文件清理失败: ${e}`);
      }
    }
  }

  async function cleanupZeroByteGifs(dir) {
    try {
      const files = await fsp.readdir(dir);
      await Promise.all(files.map(async file => {
        if (file.toLowerCase().endsWith('.gif')) {
          try {
            const filePath = pathLib.join(dir, file);
            const stats = await fsp.stat(filePath);
            if (stats.size === 0) {
              await fsp.unlink(filePath);
              debugLog(`清理0字节GIF: ${file}`);
            }
          } catch (e) {}
        }
      }));
    } catch (e) {}
  }

  function debugLog(message) {
    if (api.getConfig('debug_ffmpeg')) {
      api.log(`[DEBUG] ${message}`);
    }
  }

  function cleanupProcess(proc, force = false) {
    try {
      if (proc.killed) return;
      
      proc.kill('SIGTERM');
      
      const timeout = setTimeout(() => {
        if (proc && !proc.killed) {
          try {
            proc.kill('SIGKILL');
            debugLog(`强制终止 PID ${proc.pid}`);
          } catch (e) {
            debugLog(`SIGKILL 失败 PID ${proc.pid}: ${e}`);
          }
        }
      }, force ? 0 : PROCESS_CLEANUP_TIMEOUT);
      
      if (proc.stdout) proc.stdout.destroy();
      if (proc.stderr) proc.stderr.destroy();
      if (proc.stdin) proc.stdin.destroy();
      
      proc.once('exit', () => clearTimeout(timeout));
    } catch (e) {
      debugLog(`清理进程错误: ${e}`);
    }
  }

  async function getVideoParams(filePath, fileSizeMB) {
    const gradientParams = getGradientParams();
    const threshold = api.getConfig('video_size_threshold') || 250;
    const isLongVideo = fileSizeMB > threshold;
    
    const params = isLongVideo ? gradientParams.LONG : gradientParams.SHORT;
    
    debugLog(`视频: ${pathLib.basename(filePath)} (${fileSizeMB.toFixed(2)}MB, ${isLongVideo ? '长视频' : '短视频'})`);
    
    return {
      thumbnail: params,
      transcode: params.transcode,
      isLongVideo: isLongVideo
    };
  }

  // ================ 缩略图提取函数（使用队列 + 防抖） ================
  function extractVideoThumbnailAsync(filePath) {
    if (!api.getConfig('extract_video_thumbnails')) return Promise.resolve();

    const key = filePath;
    
    // 去重：如果正在处理相同文件，返回现有Promise
    if (pendingThumbnails.has(key)) {
      debugLog(`[防抖] 复用任务: ${pathLib.basename(filePath)}`);
      return pendingThumbnails.get(key);
    }

    // 创建防抖Promise
    const promise = new Promise((resolve) => {
      // 清除旧的定时器
      if (pendingThumbnails.has(`${key}_timer`)) {
        clearTimeout(pendingThumbnails.get(`${key}_timer`));
        pendingThumbnails.delete(`${key}_timer`);
      }

      // 设置防抖延迟
      const timer = setTimeout(async () => {
        pendingThumbnails.delete(`${key}_timer`);
        pendingThumbnails.delete(key);
        
        try {
          debugLog(`[防抖] 执行缩略图提取: ${pathLib.basename(filePath)}`);
          await extractVideoThumbnail(filePath);
        } catch (e) {
          debugLog(`[防抖] 缩略图提取失败: ${e}`);
        } finally {
          resolve();
        }
      }, THUMBNAIL_DEBOUNCE_DELAY);

      pendingThumbnails.set(`${key}_timer`, timer);
    });

    pendingThumbnails.set(key, promise);
    return promise;
  }

  async function extractVideoThumbnail(filePath) {
    const ext = pathLib.extname(filePath).toLowerCase().slice(1);
    if (!SUPPORTED_VIDEO_EXTS.includes(ext)) return;

    try {
      const dir = pathLib.dirname(filePath);
      const thumbnailsDir = pathLib.join(dir, CACHE_DIR, VIDEO_THUMBNAIL_DIR);
      await fsp.mkdir(thumbnailsDir, { recursive: true });
      
      await cleanupZeroByteGifs(thumbnailsDir);
      
      const filename = pathLib.basename(filePath, pathLib.extname(filePath));
      const format = api.getConfig('thumbnail_format') || 'jpg';
      const thumbnailPath = pathLib.join(thumbnailsDir, `${filename}.${format}`);
      
      try {
        await fsp.access(thumbnailPath);
        debugLog(`[队列] 缩略图已存在: ${thumbnailPath}`);
        return;
      } catch {}

      try {
        const stats = await fsp.stat(filePath);
        if (stats.size === 0) {
          debugLog(`[队列] 跳过0字节文件: ${filePath}`);
          return;
        }
      } catch (e) {
        debugLog(`[队列] 无法读取文件: ${filePath} - ${e}`);
        return;
      }

      const stats = await fsp.stat(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      const gradientParams = getGradientParams();
      const threshold = api.getConfig('video_size_threshold') || 250;
      const isLongVideo = fileSizeMB > threshold;

      if (format === 'jpg') {
        let time = api.getConfig('thumbnail_time') || '00:00:05';
        if (!time.includes(':')) {
          const seconds = parseInt(time) || 5;
          time = formatTimeFromSeconds(seconds);
        }

        await thumbnailQueue.add({
          type: 'jpg',
          filePath,
          thumbnailPath,
          params: { time }
        });
      } else {
        let success = false;
        let attempts = [];
        
        if (isLongVideo) {
          attempts = [
            { params: gradientParams.LONG, label: '长视频' },
            { params: gradientParams.SHORT, label: '短视频' },
            { params: gradientParams.BACKUP, label: '备用' }
          ];
        } else {
          attempts = [
            { params: gradientParams.SHORT, label: '短视频' },
            { params: gradientParams.BACKUP, label: '备用' }
          ];
        }

        for (const attempt of attempts) {
          try {
            debugLog(`[队列] 尝试${attempt.label}...`);
            await thumbnailQueue.add({
              type: 'gif',
              filePath,
              thumbnailPath,
              params: attempt.params
            });
            success = true;
            break;
          } catch (error) {
            debugLog(`[队列] ${attempt.label}失败: ${error.message}`);
          }
        }

        if (!success) {
          debugLog(`[队列] 所有尝试均失败: ${filePath}`);
          await fsp.unlink(thumbnailPath).catch(() => {});
        }
      }
    } catch (e) {
      debugLog(`[队列] 缩略图提取失败: ${filePath} - ${e}`);
    }
  }

  async function extractAlbumCover(filePath) {
    if (!api.getConfig('extract_covers')) return;
    
    const ext = pathLib.extname(filePath).toLowerCase().slice(1);
    if (!SUPPORTED_AUDIO_EXTS.includes(ext)) return;

    try {
      const dir = pathLib.dirname(filePath);
      const coversDir = pathLib.join(dir, CACHE_DIR, COVERS_DIR);
      await fsp.mkdir(coversDir, { recursive: true });
      
      const filename = pathLib.basename(filePath, pathLib.extname(filePath));
      const coverPath = pathLib.join(coversDir, `${filename}.jpg`);
      
      try {
        await fsp.access(coverPath);
        debugLog(`[队列] 封面已存在: ${coverPath}`);
        return;
      } catch {}

      await thumbnailQueue.add({
        type: 'cover',
        filePath,
        thumbnailPath: coverPath,
        params: {}
      });
    } catch (e) {
      debugLog(`[队列] 封面提取失败: ${filePath} - ${e}`);
    }
  }

  // ================ 主逻辑 ================
  return {
    unload() {
      // 清理所有运行中的FFmpeg进程
      for (const proc of running.keys()) cleanupProcess(proc, true);
      for (const proc of thumbnailProcesses.keys()) cleanupProcess(proc, true);
      
      // 清理所有定时器
      for (const [key, value] of pendingThumbnails) {
        if (key.endsWith('_timer')) {
          clearTimeout(value);
        }
      }
      pendingThumbnails.clear();
      
      // 清理队列
      thumbnailQueue.clear();
      debugLog('[队列] 已清理所有资源');
    },
    
    // 添加队列状态查询接口
    getQueueStatus() {
      return thumbnailQueue.getStatus();
    },

    middleware: async ctx => {
      return async () => {
        const src = ctx.state.fileSource;
        if (!src) return;

        const ext = pathLib.extname(src).toLowerCase().slice(1);
        
        // 异步处理缩略图（使用防抖）
        if (SUPPORTED_AUDIO_EXTS.includes(ext)) {
          extractAlbumCover(src).catch(e => debugLog(`封面提取错误: ${e}`));
        } 
        else if (SUPPORTED_VIDEO_EXTS.includes(ext)) {
          extractVideoThumbnailAsync(src);
        }

        const forceTranscodeFormats = (api.getConfig('force_transcode_formats') || 'wmv,mpg,avi,ts,rmvb,vob,flv')
          .toLowerCase()
          .split(',')
          .map(x => x.trim());
        
        const shouldForceTranscode = forceTranscodeFormats.includes(ext);
        
        if (ctx.querystring !== 'ffmpeg' && !shouldForceTranscode) return;

        if (ext === 'mp3') return;

        const accounts = api.getConfig('accounts');
        const username = api.getCurrentUsername(ctx);
        if (!api.getConfig('allowAnonymous')) {
          if (!username || (accounts?.length && !api.ctxBelongsTo(ctx, accounts))) {
            return ctx.status = api.Const.HTTP_UNAUTHORIZED;
          }
        }

        await new Promise(res => setTimeout(res, 500));
        if (ctx.socket.closed) return;

        const max = api.getConfig('max_processes');
        const maxA = !api.getConfig('allowAnonymous') && api.getConfig('max_processes_per_account');
        const waitLimit = 10;
        let waited = 0;

        function countUsername() {
          let ret = 0;
          for (const x of running.values()) {
            if (x.username === username) ret++;
          }
          return ret;
        }

        while (running.size >= max || (maxA && countUsername() >= maxA)) {
          if (++waited > waitLimit) return ctx.status = api.Const.HTTP_TOO_MANY_REQUESTS;
          await new Promise(res => setTimeout(res, 1000));
          if (ctx.socket.closed) return;
        }

        const isAudio = SUPPORTED_AUDIO_EXTS.includes(ext);
        const outFormat = api.getConfig('audio_format') || 'flac';
        const transcodeQuality = api.getConfig('transcode_quality') || 'balanced';
        const dsdConversionMode = api.getConfig('dsd_conversion_mode') || 'high';

        const additionalParams = api.getConfig('ffmpeg_parameters') || '';
        const parsedAdditionalParams = additionalParams.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map(s => s.replace(/^['"]|['"]$/g, '')) || [];

        const ffmpegArgs = [];
        if (api.getConfig('enable_hwaccel') && !isAudio) {
          ffmpegArgs.push('-hwaccel', 'auto');
        }
        ffmpegArgs.push('-i', src);

        if (isAudio) {
          if (['dsf', 'dff', 'dsd'].includes(ext)) {
            const dsdParams = {
              standard: {
                sampleRate: '44100',
                precision: '24',
                filter: 'aresample=resampler=soxr:precision=24:osr=44100'
              },
              high: {
                sampleRate: '88200',
                precision: '28',
                filter: 'aresample=resampler=soxr:precision=28:osr=88200'
              },
              ultra: {
                sampleRate: '176400',
                precision: '33',
                filter: 'aresample=resampler=soxr:precision=33:osr=176400'
              }
            };
            
            const { sampleRate, precision, filter } = dsdParams[dsdConversionMode] || dsdParams.high;

            ffmpegArgs.push(
              '-c:a', outFormat === 'wav' ? 'pcm_s24le' : 'flac',
              '-ar', sampleRate,
              '-sample_fmt', outFormat === 'wav' ? 's32' : 's16',
              '-filter_complex', filter,
              ...(outFormat === 'wav' ? [
                '-fflags', '+bitexact',
                '-write_xing', '0'
              ] : []),
              ...(outFormat === 'flac' ? [
                '-compression_level', '5',
                '-lpc_type', 'cholesky'
              ] : []),
              ...parsedAdditionalParams,
              '-f', outFormat,
              'pipe:1'
            );
          }
          else if (['aiff', 'aif'].includes(ext)) {
            ffmpegArgs.push(
              '-c:a', outFormat === 'wav' ? 'pcm_s24le' : 'flac',
              '-ar', '0',
              '-sample_fmt', outFormat === 'wav' ? 's32' : 's16',
              ...(outFormat === 'wav' ? [
                '-fflags', '+bitexact',
                '-write_xing', '0'
              ] : []),
              ...(outFormat === 'flac' ? [
                '-compression_level', '5',
                '-lpc_type', 'cholesky'
              ] : []),
              ...parsedAdditionalParams,
              '-f', outFormat,
              'pipe:1'
            );
          }
          else {
            ffmpegArgs.push(
              '-c:a', outFormat === 'wav' ? 'pcm_s16le' : 'flac',
              '-ar', '48000',
              ...(outFormat === 'wav' ? [
                '-fflags', '+bitexact',
                '-write_xing', '0'
              ] : []),
              ...(outFormat === 'flac' ? [
                '-compression_level', '5',
                '-lpc_type', 'cholesky'
              ] : []),
              ...parsedAdditionalParams,
              '-f', outFormat,
              'pipe:1'
            );
          }
        } else {
          let transcodeParams;
          try {
            const stats = await fsp.stat(src);
            const fileSizeMB = stats.size / (1024 * 1024);
            const videoParams = await getVideoParams(src, fileSizeMB);
            transcodeParams = videoParams.transcode;
          } catch {
            transcodeParams = { crf: 23, preset: 'fast', tune: 'film' };
          }

          let qualityArgs = [];
          switch (transcodeQuality) {
            case 'fast':
              qualityArgs = [
                '-crf', '28',
                '-preset', 'ultrafast',
                '-tune', 'fastdecode',
                '-threads', '2'
              ];
              break;
            case 'balanced':
              qualityArgs = [
                '-crf', transcodeParams.crf || '23',
                '-preset', transcodeParams.preset || 'fast',
                '-tune', transcodeParams.tune || 'film'
              ];
              break;
            case 'high':
              qualityArgs = [
                '-crf', '18',
                '-preset', 'medium',
                '-tune', 'film'
              ];
              break;
            default:
              qualityArgs = [
                '-crf', transcodeParams.crf || '23',
                '-preset', transcodeParams.preset || 'fast',
                '-tune', transcodeParams.tune || 'film'
              ];
          }

          ffmpegArgs.push(
            '-f', 'mp4',
            '-movflags', 'frag_keyframe+empty_moov+faststart',
            '-vcodec', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-acodec', 'aac',
            '-strict', '-2',
            ...qualityArgs,
            '-frag_duration', '10000',
            '-frag_size', '256',
            '-min_frag_duration', '5000',
            '-movflags', 'frag_custom',
            '-flush_packets', '1',
            '-max_muxing_queue_size', '256',
            ...parsedAdditionalParams,
            'pipe:1'
          );
        }

        const proc = spawn(api.getConfig('ffmpeg_path') || 'ffmpeg', ffmpegArgs);
        running.set(proc, {
          username,
          pid: proc.pid,
          startTime: Date.now()
        });
        
        let confirmed = false;
        proc.on('spawn', () => {
          confirmed = true;
          debugLog(`启动FFmpeg (PID: ${proc.pid}) 处理: ${pathLib.basename(src)}`);
        });
        
        proc.on('error', (err) => {
          if (!confirmed) running.delete(proc);
          cleanupProcess(proc);
          debugLog(`FFmpeg错误: ${src} - ${err}`);
        });
        
        proc.on('exit', (code) => {
          running.delete(proc);
          cleanupProcess(proc);
          debugLog(`FFmpeg结束 (PID: ${proc.pid}) 代码: ${code} - ${pathLib.basename(src)}`);
        });

        if (api.getConfig('debug_ffmpeg')) {
          proc.stderr.on('data', x => debugLog(`FFmpeg输出: ${String(x)}`));
        }

        ctx.type = isAudio ? `audio/${outFormat}` : 'video/mp4';
        ctx.body = proc.stdout;
        ctx.req.on('end', () => cleanupProcess(proc));
        ctx.status = 200;

        if (isAudio && api.getConfig('enable_lossless_cache') && (outFormat === 'flac' || outFormat === 'wav')) {
          try {
            const cacheExt = outFormat === 'wav' ? 'wav' : 'flac';
            const cacheDir = pathLib.join(pathLib.dirname(src), CACHE_DIR);
            const finalFile = pathLib.join(cacheDir, pathLib.basename(src, pathLib.extname(src)) + '.' + cacheExt);
            
            await fsp.mkdir(cacheDir, { recursive: true });
            await cleanupTempFiles(cacheDir);
            
            const tempFile = pathLib.join(cacheDir, TEMP_PREFIX + pathLib.basename(src, pathLib.extname(src)) + '.' + cacheExt);
            
            try { await fsp.unlink(tempFile); } catch {}

            const cacheArgs = ['-i', src];
            if (['dsf', 'dff', 'dsd'].includes(ext)) {
              const dsdParams = {
                standard: {
                  sampleRate: '44100',
                  precision: '24',
                  filter: 'aresample=resampler=soxr:precision=24:osr=44100'
                },
                high: {
                  sampleRate: '88200',
                  precision: '28',
                  filter: 'aresample=resampler=soxr:precision=28:osr=88200'
                },
                ultra: {
                  sampleRate: '176400',
                  precision: '33',
                  filter: 'aresample=resampler=soxr:precision=33:osr=176400'
                }
              };
              
              const { sampleRate, precision, filter } = dsdParams[dsdConversionMode] || dsdParams.high;

              cacheArgs.push(
                '-c:a', outFormat === 'wav' ? 'pcm_s24le' : 'flac',
                '-ar', sampleRate,
                '-sample_fmt', outFormat === 'wav' ? 's32' : 's16',
                '-filter_complex', filter,
                ...(outFormat === 'wav' ? [
                  '-fflags', '+bitexact',
                  '-write_xing', '0'
                ] : []),
                ...(outFormat === 'flac' ? [
                  '-compression_level', '5',
                  '-lpc_type', 'cholesky'
                ] : []),
                ...parsedAdditionalParams,
                '-f', outFormat,
                tempFile
              );
            }
            else if (['aiff', 'aif'].includes(ext)) {
              cacheArgs.push(
                '-c:a', outFormat === 'wav' ? 'pcm_s24le' : 'flac',
                '-ar', '0',
                '-sample_fmt', outFormat === 'wav' ? 's32' : 's16',
                ...(outFormat === 'wav' ? [
                  '-fflags', '+bitexact',
                  '-write_xing', '0'
                ] : []),
                ...(outFormat === 'flac' ? [
                  '-compression_level', '5',
                  '-lpc_type', 'cholesky'
                ] : []),
                ...parsedAdditionalParams,
                '-f', outFormat,
                tempFile
              );
            }
            else {
              cacheArgs.push(
                '-c:a', outFormat === 'wav' ? 'pcm_s16le' : 'flac',
                '-ar', '48000',
                ...(outFormat === 'wav' ? [
                  '-fflags', '+bitexact',
                  '-write_xing', '0'
                ] : []),
                ...(outFormat === 'flac' ? [
                  '-compression_level', '5',
                  '-lpc_type', 'cholesky'
                ] : []),
                ...parsedAdditionalParams,
                '-f', outFormat,
                tempFile
              );
            }

            const cacheProc = spawn(api.getConfig('ffmpeg_path') || 'ffmpeg', cacheArgs);

            cacheProc.on('exit', async (code) => {
              cleanupProcess(cacheProc);
              const isAcceptableError = 
                (outFormat === 'wav' && code === 255) || 
                (outFormat === 'flac' && code === 1);

              if (code === 0 || isAcceptableError) {
                const isValid = await validateAudioFile(tempFile, outFormat);
                if (isValid) {
                  await fsp.rename(tempFile, finalFile);
                  debugLog(`缓存保存${isAcceptableError ? ' (使用错误解决)' : ''}: ${finalFile}`);
                } else {
                  debugLog(`缓存验证失败，删除: ${tempFile}`);
                  await fsp.unlink(tempFile);
                }
              } else {
                debugLog(`缓存生成失败，代码 ${code}`);
                try { await fsp.unlink(tempFile); } catch {}
              }
            });

            cacheProc.on('error', e => {
              cleanupProcess(cacheProc);
              debugLog('缓存进程错误: ' + e);
              fsp.unlink(tempFile).catch(() => {});
            });

          } catch (e) {
            debugLog('缓存设置失败: ' + e);
          }
        }
      };
    }
  };
};