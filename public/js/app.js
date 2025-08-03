let allVideos = [];
let filteredVideos = [];
let currentCategoryPath = []; // 当前选中的分类路径
let categoryTree = {};
let transcodeJobs = new Map(); // 存储转码任务

async function loadServerInfo() {
    try {
        const response = await fetch('/api/server-info');
        const info = await response.json();
        
        const serverInfoDiv = document.getElementById('serverInfo');
        if (info.qrCode) {
            serverInfoDiv.innerHTML = `
                <p>局域网地址: ${info.url}</p>
                <img src="${info.qrCode}" alt="QR Code" title="扫码访问">
            `;
        } else {
            serverInfoDiv.innerHTML = `<p>局域网地址: ${info.url}</p>`;
        }
    } catch (error) {
        console.error('获取服务器信息失败:', error);
    }
}

async function loadVideos() {
    try {
        const response = await fetch('/api/videos');
        allVideos = await response.json();
        filteredVideos = allVideos;
        renderVideos();
        loadCategories();
    } catch (error) {
        console.error('加载视频列表失败:', error);
        document.getElementById('videoGrid').innerHTML = 
            '<div class="loading">加载失败，请刷新页面重试</div>';
    }
}

async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        categoryTree = await response.json();
        renderCategoryTree();
    } catch (error) {
        console.error('加载分类失败:', error);
    }
}

function renderVideos() {
    const videoGrid = document.getElementById('videoGrid');
    
    if (filteredVideos.length === 0) {
        videoGrid.innerHTML = '<div class="loading">未找到视频文件</div>';
        return;
    }
    
    videoGrid.innerHTML = filteredVideos.map(video => {
        const jobForVideo = Array.from(transcodeJobs.values()).find(job => 
            job.inputPath === video.path
        );
        
        return `
        <div class="video-card">
            <div class="video-thumbnail" onclick="playVideo('${video.id}')">
                ${getVideoIcon(video.extension)}
            </div>
            <div class="video-info">
                <h3 class="video-title" title="${video.name}">${video.name}</h3>
                <div class="video-meta">
                    <span>${video.extension.toUpperCase()}</span>
                    <span>${video.sizeFormatted}</span>
                </div>
                <div class="video-actions">
                    <button class="action-btn" onclick="playVideo('${video.id}')" title="播放">
                        ▶️
                    </button>
                    <button class="action-btn" onclick="downloadVideo('${video.id}')" title="下载">
                        💾
                    </button>
                    ${jobForVideo ? renderTranscodeStatus(jobForVideo) : `
                        <button class="action-btn transcode-btn" onclick="startTranscode('${video.id}')" title="转码为安卓格式">
                            📱
                        </button>
                    `}
                </div>
            </div>
        </div>
    `}).join('');
}

function getVideoIcon(extension) {
    const icons = {
        '.mp4': '🎬',
        '.mkv': '🎥',
        '.avi': '📹',
        '.mov': '🎞️',
        '.webm': '🌐',
        '.flv': '📺'
    };
    return icons[extension] || '📽️';
}

function playVideo(videoId) {
    window.location.href = `/player.html?id=${videoId}`;
}

function filterVideos(searchTerm) {
    let videos = allVideos;
    
    // 先按分类过滤
    if (currentCategoryPath.length > 0) {
        videos = videos.filter(video => {
            // 检查视频的分类路径是否包含当前选中的路径
            return currentCategoryPath.every((folder, index) => 
                video.categoryPath[index] === folder
            );
        });
    }
    
    // 再按搜索词过滤
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        videos = videos.filter(video => 
            video.name.toLowerCase().includes(term) ||
            video.filename.toLowerCase().includes(term)
        );
    }
    
    filteredVideos = videos;
    renderVideos();
}

function renderCategoryTree() {
    const container = document.getElementById('categoryTree');
    const totalCount = allVideos.length;
    
    let html = `
        <div class="category-item ${currentCategoryPath.length === 0 ? 'active' : ''}" 
             onclick="selectCategory([])">
            <span class="category-icon">🏠</span>
            <span class="category-name">全部</span>
            <span class="category-count">(${totalCount})</span>
        </div>
    `;
    
    html += renderCategoryLevel(categoryTree, [], 0);
    container.innerHTML = html;
}

function renderCategoryLevel(tree, parentPath, level) {
    let html = '';
    
    for (const [folderName, data] of Object.entries(tree)) {
        const currentPath = [...parentPath, folderName];
        const pathStr = currentPath.join('/');
        const isActive = currentCategoryPath.join('/') === pathStr;
        const hasChildren = Object.keys(data.children).length > 0;
        
        html += `
            <div class="category-item ${isActive ? 'active' : ''}" 
                 style="padding-left: ${20 + level * 20}px"
                 data-path="${currentPath.join('/')}"
                 onclick="selectCategoryByPath(this)">
                <span class="category-icon">${hasChildren ? '📁' : '📄'}</span>
                <span class="category-name">${folderName}</span>
                <span class="category-count">(${data.count})</span>
            </div>
        `;
        
        if (hasChildren) {
            html += renderCategoryLevel(data.children, currentPath, level + 1);
        }
    }
    
    return html;
}

function selectCategory(path) {
    currentCategoryPath = path;
    renderCategoryTree();
    filterVideos(document.getElementById('searchInput').value);
}

function selectCategoryByPath(element) {
    const pathStr = element.getAttribute('data-path');
    const path = pathStr ? pathStr.split('/') : [];
    selectCategory(path);
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    filterVideos(e.target.value);
});

function renderTranscodeStatus(job) {
    if (job.status === 'processing') {
        return `
            <div class="transcode-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${job.progress}%"></div>
                </div>
                <span class="progress-text">${job.progress}%</span>
            </div>
        `;
    } else if (job.status === 'completed') {
        return `
            <button class="action-btn success-btn" onclick="downloadTranscodedVideo('${job.id}')" title="下载转码后的视频">
                ✅ 下载
            </button>
        `;
    } else if (job.status === 'failed') {
        return `
            <span class="error-text" title="${job.error || '转码失败'}">❌ 失败</span>
        `;
    }
}

async function startTranscode(videoId) {
    try {
        const response = await fetch(`/api/transcode/${videoId}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('转码请求失败');
        }
        
        const result = await response.json();
        console.log('转码任务已开始:', result);
        
        // 开始监控转码进度
        monitorTranscodeJob(result.jobId);
        
    } catch (error) {
        console.error('启动转码失败:', error);
        alert('启动转码失败: ' + error.message);
    }
}

async function monitorTranscodeJob(jobId) {
    const checkInterval = setInterval(async () => {
        try {
            const response = await fetch(`/api/transcode/status/${jobId}`);
            if (!response.ok) {
                clearInterval(checkInterval);
                return;
            }
            
            const job = await response.json();
            transcodeJobs.set(jobId, job);
            
            // 更新界面
            renderVideos();
            
            // 如果任务完成或失败，停止监控
            if (job.status === 'completed' || job.status === 'failed') {
                clearInterval(checkInterval);
            }
        } catch (error) {
            console.error('获取转码状态失败:', error);
            clearInterval(checkInterval);
        }
    }, 1000); // 每秒检查一次
}

async function downloadVideo(videoId) {
    window.location.href = `/api/download/${videoId}`;
}

async function downloadTranscodedVideo(jobId) {
    window.location.href = `/api/transcode/download/${jobId}`;
}

async function loadTranscodeJobs() {
    try {
        const response = await fetch('/api/transcode/jobs');
        const jobs = await response.json();
        
        // 更新本地存储的任务
        transcodeJobs.clear();
        jobs.forEach(job => {
            transcodeJobs.set(job.id, job);
            // 如果任务还在进行中，继续监控
            if (job.status === 'processing') {
                monitorTranscodeJob(job.id);
            }
        });
        
        renderVideos();
    } catch (error) {
        console.error('加载转码任务失败:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadServerInfo();
    loadVideos();
    loadTranscodeJobs();
});