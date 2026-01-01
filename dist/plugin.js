exports.repo = "Hug3O/MVfiles-covers"
exports.version = 4.2
exports.description = "Media file cover/thumbnail display with WebM video format support with simplified path configuration"
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
  enableImagesPath: {
    type: 'boolean',
    defaultValue: false,
    frontend: true,
    label: 'Enable images path for video thumbnails (dual-path mode for all supported media files)'
  },
  imagesCachePath: {
    type: 'vfs_path',
    label: 'Custom cache path for images (default: /images/cache)',
    folders: true,
    files: false,
    multiple: false,
    showIf: values => values.enableImagesPath,
    frontend: true,
    defaultValue: '/images/cache'
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

      if (audioExts.includes(ext)) {
        // 音樂文件：始終檢查原始路徑的封面
        const coverPath = join(node.path, 'cache/covers', fileName + '.jpg')
        if (fs.existsSync(coverPath)) {
          entry._hasCover = true
          entry._coverType = 'audio'
        }
      } else if (videoExts.includes(ext)) {
        // 視頻文件：根據配置檢查封面
        const preferred = api.getConfig('videoThumbFormat') || 'jpg'
        const formats = preferred === 'gif' ? ['gif', 'jpg'] : ['jpg', 'gif']
        const enableImagesPath = api.getConfig('enableImagesPath') || false
        const imagesCachePath = (api.getConfig('imagesCachePath') || '/images/cache').trim()
        
        let thumbFound = false
        for (const fmt of formats) {
          // 如果啟用 images 路徑，檢查自定義緩存路徑
          if (enableImagesPath) {
            const imagesThumbPath = join(imagesCachePath, node.path, 'cache/videothumbnail', fileName + '.' + fmt)
            if (fs.existsSync(imagesThumbPath)) {
              entry._hasCover = true
              entry._coverType = 'video'
              entry._useImagesPath = true
              entry._imagesPathEnabled = true
              entry._imagesCachePath = imagesCachePath
              entry.coverExt = fmt
              thumbFound = true
              break
            }
          }
          
          // 檢查原始路徑
          if (!thumbFound) {
            const thumbPath = join(node.path, 'cache/videothumbnail', fileName + '.' + fmt)
            if (fs.existsSync(thumbPath)) {
              entry._hasCover = true
              entry._coverType = 'video'
              entry._imagesPathEnabled = enableImagesPath
              entry._imagesCachePath = imagesCachePath
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