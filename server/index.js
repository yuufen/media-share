const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ip = require('ip');
const QRCode = require('qrcode');
const config = require('./config');
const scanner = require('./scanner');
const streaming = require('./streaming');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

let videoLibrary = [];

app.get('/api/videos', (req, res) => {
    res.json(videoLibrary);
});

app.get('/api/categories', (req, res) => {
    const categoryTree = {};
    
    // 构建树状结构
    videoLibrary.forEach(video => {
        let currentLevel = categoryTree;
        
        video.categoryPath.forEach((folder, index) => {
            if (!currentLevel[folder]) {
                currentLevel[folder] = {
                    count: 0,
                    children: {}
                };
            }
            currentLevel[folder].count++;
            currentLevel = currentLevel[folder].children;
        });
    });
    
    res.json(categoryTree);
});

app.get('/api/video/:id', (req, res) => {
    const video = videoLibrary.find(v => v.id === req.params.id);
    if (!video) {
        return res.status(404).json({ error: 'Video not found' });
    }
    res.json(video);
});

app.get('/api/stream/:id', (req, res) => {
    const video = videoLibrary.find(v => v.id === req.params.id);
    if (!video) {
        return res.status(404).json({ error: 'Video not found' });
    }
    streaming.streamVideo(video.path, req, res);
});

app.get('/api/server-info', async (req, res) => {
    const serverIP = ip.address();
    const serverURL = `http://${serverIP}:${PORT}`;
    
    try {
        const qrCode = await QRCode.toDataURL(serverURL);
        res.json({
            ip: serverIP,
            port: PORT,
            url: serverURL,
            qrCode: qrCode
        });
    } catch (error) {
        res.json({
            ip: serverIP,
            port: PORT,
            url: serverURL
        });
    }
});

async function startServer() {
    console.log('扫描视频文件...');
    videoLibrary = await scanner.scanVideos(config.videoPaths);
    console.log(`找到 ${videoLibrary.length} 个视频文件`);
    
    app.listen(PORT, '0.0.0.0', () => {
        const serverIP = ip.address();
        console.log(`\n媒体共享服务器已启动！`);
        console.log(`本地访问: http://localhost:${PORT}`);
        console.log(`局域网访问: http://${serverIP}:${PORT}`);
        console.log(`\n在VR设备浏览器中打开上述地址即可访问`);
    });
}

startServer().catch(console.error);