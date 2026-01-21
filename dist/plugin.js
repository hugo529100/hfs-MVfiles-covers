exports.repo = "Hug3O/MVfiles-covers"
exports.version = 5.3
exports.description = "Media file cover/thumbnail display with WebM video format support using single-path graft mode"
exports.apiRequired = 8.65
exports.frontend_js = 'main.js'
exports.frontend_css = 'style.css'
exports.afterPlugin = 'Musicplayer+'
exports.depend = [{ "repo": "rejetto/thumbnails", "version": 4.83 }]
exports.config = {
  videoThumbFormat: {
    type: 'select',
    options: [
      { value: 'jpg', label: 'JPG' },
      { value: 'gif', label: 'GIF' }
    ],
    defaultValue: 'jpg',
    frontend: true,
    label: 'Video thumbnail format (preferred)'
  },
  enableGraftMode: {
    type: 'boolean',
    defaultValue: false,
    frontend: true,
    label: 'Enable single-path graft mode (once enabled, all paths will be redirected to the specified path below)'
  },
  graftPath: {
    type: 'vfs_path',
    label: 'Custom graft path for all media covers (default: /images/cache)',
    folders: true,
    files: false,
    multiple: false,
    showIf: values => values.enableGraftMode,
    frontend: true,
    defaultValue: '/images/cache'
  },
  graftVideoCovers: {
    type: 'boolean',
    defaultValue: true,
    frontend: true,
    label: 'Graft video covers (gif thumbnails)',
    showIf: values => values.enableGraftMode
  },
  graftMusicCovers: {
    type: 'boolean',
    defaultValue: true,
    frontend: true,
    label: 'Graft music covers',
    showIf: values => values.enableGraftMode
  }
}

exports.init = api => {
  const { join, basename } = api.require('path')
  const fs = api.require('fs')

  return {
    onDirEntry({ entry, node }) {
      const ext = entry.ext?.toLowerCase()
      const audioExts = ['mp3','flac','wav','ape','aac','ogg','m4a','alac','dsf','dsd','aif','aiff']
      const videoExts = ['mp4','webm','mkv','avi','mov','mpeg','mpg','wmv','rmvb','rm','dat','ts','vob','flv']
      const fileName = basename(entry.n, '.' + ext)

      const enableGraftMode = api.getConfig('enableGraftMode') || false
      const graftPath = (api.getConfig('graftPath') || '/images/cache').trim()
      const graftVideoCovers = api.getConfig('graftVideoCovers') !== false // 默认true
      const graftMusicCovers = api.getConfig('graftMusicCovers') !== false // 默认true

      if (audioExts.includes(ext)) {
        // 音樂文件：檢查封面
        if (enableGraftMode && graftMusicCovers) {
          // 嫁接模式下：檢查嫁接路徑的音樂封面
          const graftCoverPath = join(graftPath, node.path, 'cache/covers', fileName + '.jpg')
          if (fs.existsSync(graftCoverPath)) {
            entry._hasCover = true
            entry._coverType = 'audio'
            entry._graftMode = true
            entry._graftMusicCovers = true
            entry._graftPath = graftPath
          }
        } else {
          // 非嫁接模式或禁用音樂嫁接：檢查原始路徑
          const coverPath = join(node.path, 'cache/covers', fileName + '.jpg')
          if (fs.existsSync(coverPath)) {
            entry._hasCover = true
            entry._coverType = 'audio'
            entry._graftMode = false
            entry._graftMusicCovers = false
            entry._graftPath = ''
          }
        }
      } else if (videoExts.includes(ext)) {
        // 視頻文件：根據配置檢查封面
        const preferred = api.getConfig('videoThumbFormat') || 'jpg'
        const formats = preferred === 'gif' ? ['gif', 'jpg'] : ['jpg', 'gif']
        
        let thumbFound = false
        
        if (enableGraftMode && graftVideoCovers) {
          // 嫁接模式下：檢查嫁接路徑的視頻封面
          for (const fmt of formats) {
            const graftThumbPath = join(graftPath, node.path, 'cache/videothumbnail', fileName + '.' + fmt)
            if (fs.existsSync(graftThumbPath)) {
              entry._hasCover = true
              entry._coverType = 'video'
              entry._graftMode = true
              entry._graftVideoCovers = true
              entry._graftPath = graftPath
              entry.coverExt = fmt
              thumbFound = true
              break
            }
          }
        } else {
          // 非嫁接模式或禁用視頻嫁接：檢查原始路徑
          for (const fmt of formats) {
            const thumbPath = join(node.path, 'cache/videothumbnail', fileName + '.' + fmt)
            if (fs.existsSync(thumbPath)) {
              entry._hasCover = true
              entry._coverType = 'video'
              entry._graftMode = false
              entry._graftVideoCovers = false
              entry._graftPath = ''
              entry.coverExt = fmt
              thumbFound = true
              break
            }
          }
        }
      }
    }
  }
}