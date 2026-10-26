const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.UPLOAD_TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'streamvault-uploads-'));
process.env.MAX_UPLOAD_BYTES = String(1024 * 1024);
process.env.UPLOAD_RATE_MAX = '10000';
