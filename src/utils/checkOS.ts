import os from 'os';

export enum Platforms {
  Win = 'win',
  AppleArm = 'darwin-arm64',
  AppleIntel = 'darwin-x86_64',
  Linux = 'linux',
  others = 'others'
}

export const checkOS = (): Platforms => {
  const platform = os.platform();
  const cpus = os.cpus();
  const cpuModel = cpus[0].model.toLowerCase();
  if (platform === 'win32') {
    return Platforms.Win;
  }
  if (platform === 'darwin') {
    if (cpuModel.includes('apple')) {
      return Platforms.AppleArm;
    } else {
      return Platforms.AppleIntel;
    }
  }
  if (platform === 'linux') {
    return Platforms.Linux;
  }
  return Platforms.others;
};
