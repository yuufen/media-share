const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;

class TranscodeService {
    constructor() {
        this.activeJobs = new Map();
        this.outputDir = path.join(process.cwd(), 'transcoded');
        this.ensureOutputDir();
    }

    async ensureOutputDir() {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
        } catch (error) {
            console.error('创建输出目录失败:', error);
        }
    }

    async transcodeForAndroid(inputPath, jobId) {
        const filename = path.basename(inputPath, path.extname(inputPath));
        const outputPath = path.join(this.outputDir, `${filename}_android.mp4`);
        
        const job = {
            id: jobId,
            inputPath,
            outputPath,
            progress: 0,
            status: 'processing',
            startTime: Date.now()
        };
        
        this.activeJobs.set(jobId, job);

        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions([
                    '-c:v libx264',
                    '-preset fast',
                    '-profile:v baseline',
                    '-level 3.0',
                    '-c:a aac',
                    '-b:a 128k',
                    '-ar 44100',
                    '-ac 2',
                    '-movflags +faststart',
                    '-pix_fmt yuv420p',
                    '-vf scale=1280:-2:force_original_aspect_ratio=decrease',
                    '-maxrate 2000k',
                    '-bufsize 2000k'
                ])
                .on('progress', (progress) => {
                    job.progress = Math.round(progress.percent || 0);
                    job.status = 'processing';
                })
                .on('end', () => {
                    job.progress = 100;
                    job.status = 'completed';
                    job.endTime = Date.now();
                    resolve(job);
                })
                .on('error', (err) => {
                    job.status = 'failed';
                    job.error = err.message;
                    reject(err);
                })
                .save(outputPath);
        });
    }

    getJob(jobId) {
        return this.activeJobs.get(jobId);
    }

    getAllJobs() {
        return Array.from(this.activeJobs.values());
    }

    async cleanupOldJobs() {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        for (const [jobId, job] of this.activeJobs) {
            if (job.endTime && job.endTime < oneHourAgo) {
                this.activeJobs.delete(jobId);
            }
        }
    }
}

module.exports = new TranscodeService();