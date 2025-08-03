let allVideos = [];
let filteredVideos = [];
let currentCategoryPath = []; // 当前选中的分类路径
let categoryTree = {};

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
    
    videoGrid.innerHTML = filteredVideos.map(video => `
        <div class="video-card" onclick="playVideo('${video.id}')">
            <div class="video-thumbnail">
                ${getVideoIcon(video.extension)}
            </div>
            <div class="video-info">
                <h3 class="video-title" title="${video.name}">${video.name}</h3>
                <div class="video-meta">
                    <span>${video.extension.toUpperCase()}</span>
                    <span>${video.sizeFormatted}</span>
                </div>
            </div>
        </div>
    `).join('');
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

document.addEventListener('DOMContentLoaded', () => {
    loadServerInfo();
    loadVideos();
});