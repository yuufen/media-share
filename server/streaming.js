const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

function streamVideo(videoPath, req, res) {
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const mimeType = mime.lookup(videoPath) || 'video/mp4';
    
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
        };
        
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*',
            'Accept-Ranges': 'bytes'
        };
        
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
    }
}

module.exports = {
    streamVideo
};