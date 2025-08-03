const path = require('path');
const os = require('os');

module.exports = {
    videoPaths: [
        path.join(os.homedir(), 'Movies'),
        path.join(os.homedir(), 'Videos'),
        path.join(os.homedir(), 'Downloads')
    ],
    
    supportedFormats: [
        '.mp4', '.mkv', '.avi', '.mov', '.wmv', 
        '.flv', '.webm', '.m4v', '.mpg', '.mpeg'
    ],
    
    thumbnailSize: {
        width: 320,
        height: 180
    },
    
    scanSubdirectories: true,
    
    cacheEnabled: true,
    cacheDuration: 3600000
};