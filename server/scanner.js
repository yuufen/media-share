const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const config = require('./config');

async function scanVideos(directories) {
    const videos = [];
    
    for (const dir of directories) {
        try {
            await fs.access(dir);
            const dirVideos = await scanDirectory(dir, dir);
            videos.push(...dirVideos);
        } catch (error) {
            console.log(`跳过不存在的目录: ${dir}`);
        }
    }
    
    return videos.sort((a, b) => b.modifiedTime - a.modifiedTime);
}

async function scanDirectory(dir, rootDir) {
    const videos = [];
    
    try {
        const files = await fs.readdir(dir);
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = await fs.stat(filePath);
            
            if (stat.isDirectory() && config.scanSubdirectories) {
                const subVideos = await scanDirectory(filePath, rootDir);
                videos.push(...subVideos);
            } else if (stat.isFile() && isVideoFile(file)) {
                // 计算相对于根目录的路径
                const relativePath = path.relative(rootDir, dir);
                const categoryPath = relativePath ? relativePath.split(path.sep) : [];
                
                const video = {
                    id: generateId(filePath),
                    name: path.basename(file, path.extname(file)),
                    filename: file,
                    path: filePath,
                    size: stat.size,
                    sizeFormatted: formatFileSize(stat.size),
                    extension: path.extname(file).toLowerCase(),
                    modifiedTime: stat.mtime,
                    modifiedTimeFormatted: formatDate(stat.mtime),
                    category: relativePath || path.basename(rootDir),
                    categoryPath: categoryPath.length > 0 ? categoryPath : [path.basename(rootDir)]
                };
                videos.push(video);
            }
        }
    } catch (error) {
        console.error(`扫描目录失败: ${dir}`, error.message);
    }
    
    return videos;
}

function isVideoFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return config.supportedFormats.includes(ext);
}

function generateId(filePath) {
    return crypto.createHash('md5').update(filePath).digest('hex');
}

function formatFileSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(date) {
    return new Date(date).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

module.exports = {
    scanVideos,
    scanDirectory
};