import crypto from 'crypto';

import fs from 'fs-extra';

export function calculateFileMD5(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const fileStream = fs.createReadStream(filePath);
    let md5sum = '';
    let settled = false;

    fileStream.on('data', (data) => {
      hash.update(data);
    });
    fileStream.on('end', () => {
      md5sum = hash.digest('hex');
    });
    fileStream.on('close', () => {
      if (!settled) {
        settled = true;
        resolve(md5sum);
      }
    });
    fileStream.on('error', (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
  });
}
