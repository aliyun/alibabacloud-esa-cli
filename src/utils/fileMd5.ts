import fs from 'fs-extra';
import crypto from 'crypto';

export function calculateFileMD5(filePath: string) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('data', (data) => {
      hash.update(data);
    });
    fileStream.on('end', () => {
      const md5sum = hash.digest('hex');
      resolve(md5sum);
    });
    fileStream.on('error', (err) => {
      reject(err);
    });
  });
}
