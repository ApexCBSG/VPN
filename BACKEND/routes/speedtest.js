const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// 1. Ping Endpoint (lightweight)
router.get('/ping', (req, res) => {
    res.json({ timestamp: Date.now() });
});

// 2. Download Endpoint (Streams a 3MB chunk)
// Note: We generate this once on start to avoid CPU overhead during test
const DOWNLOAD_BUFFER = crypto.randomBytes(10 * 1024 * 1024); // 10MB

router.get('/download', (req, res) => {
    console.log(`[SPEEDTEST] Download start: ${new Date().toISOString()}`);
    res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Length': DOWNLOAD_BUFFER.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.send(DOWNLOAD_BUFFER);
});

// 3. Upload Endpoint (Consumes data)
router.post('/upload', express.raw({ type: 'application/octet-stream', limit: '20mb' }), (req, res) => {
    const size = req.body ? req.body.length : 0;
    console.log(`[SPEEDTEST] Upload complete: Received ${size} bytes`);
    res.json({ size, status: 'success' });
});

module.exports = router;
