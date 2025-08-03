const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ip = require('ip');
const QRCode = require('qrcode');
const config = require('./config');
const scanner = require('./scanner');
const streaming = require('./streaming');
const transcodeService = require('./transcode');

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

// 下载视频
app.get('/api/download/:id', (req, res) => {
    const video = videoLibrary.find(v => v.id === req.params.id);
    if (!video) {
        return res.status(404).json({ error: 'Video not found' });
    }
    
    // 设置下载响应头
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(video.filename)}"`);
    res.setHeader('Content-Length', video.size);
    
    // 创建文件流并发送
    const stream = fs.createReadStream(video.path);
    stream.on('error', (err) => {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Download failed' });
    });
    stream.pipe(res);
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

// 开始转码任务
app.post('/api/transcode/:id', async (req, res) => {
    const video = videoLibrary.find(v => v.id === req.params.id);
    if (!video) {
        return res.status(404).json({ error: 'Video not found' });
    }
    
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
        transcodeService.transcodeForAndroid(video.path, jobId);
        res.json({ 
            jobId, 
            message: '转码任务已开始',
            videoName: video.name 
        });
    } catch (error) {
        res.status(500).json({ error: '启动转码失败', details: error.message });
    }
});

// 获取转码进度
app.get('/api/transcode/status/:jobId', (req, res) => {
    const job = transcodeService.getJob(req.params.jobId);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
});

// 获取所有转码任务
app.get('/api/transcode/jobs', (req, res) => {
    const jobs = transcodeService.getAllJobs();
    res.json(jobs);
});

// 下载转码后的文件
app.get('/api/transcode/download/:jobId', (req, res) => {
    const job = transcodeService.getJob(req.params.jobId);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.status !== 'completed') {
        return res.status(400).json({ error: 'Job not completed' });
    }
    
    const filename = path.basename(job.outputPath);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const stream = fs.createReadStream(job.outputPath);
    stream.on('error', (err) => {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Download failed' });
    });
    stream.pipe(res);
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
    
    // 定期清理旧的转码任务
    setInterval(() => {
        transcodeService.cleanupOldJobs();
    }, 60 * 60 * 1000); // 每小时清理一次
}

startServer().catch(console.error);