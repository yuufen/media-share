#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('启动媒体共享服务器...\n');

const serverPath = path.join(__dirname, 'server', 'index.js');
const node = spawn('node', [serverPath], {
    stdio: 'inherit',
    shell: true
});

node.on('error', (error) => {
    console.error('启动失败:', error);
    process.exit(1);
});

node.on('exit', (code) => {
    if (code !== 0) {
        console.error(`服务器退出，错误代码: ${code}`);
    }
    process.exit(code);
});

process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    node.kill('SIGINT');
});