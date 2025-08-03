let allVideos = [];
let filteredVideos = [];

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
    } catch (error) {
        console.error('加载视频列表失败:', error);
        document.getElementById('videoGrid').innerHTML = 
            '<div class="loading">加载失败，请刷新页面重试</div>';
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
    if (!searchTerm) {
        filteredVideos = allVideos;
    } else {
        const term = searchTerm.toLowerCase();
        filteredVideos = allVideos.filter(video => 
            video.name.toLowerCase().includes(term) ||
            video.filename.toLowerCase().includes(term)
        );
    }
    renderVideos();
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    filterVideos(e.target.value);
});

document.addEventListener('DOMContentLoaded', () => {
    loadServerInfo();
    loadVideos();
});