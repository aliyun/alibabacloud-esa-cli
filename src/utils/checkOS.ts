import os from 'os';

export enum Platforms {
  Win = 'win',
  AppleArm = 'darwin-arm64',
  AppleIntel = 'darwin-x86_64',
  LinuxX86 = 'linux-x86_64',
  Linux = 'linux',
  others = 'others'
}

export const checkOS = (): Platforms => {
  const platform = os.platform();
  const cpus = os.cpus();
  const cpuModel = cpus[0].model.toLowerCase();
  const arch = os.arch();

  if (platform === 'win32') {
    return Platforms.Win;
  }
  if (platform === 'darwin') {
    if (cpuModel.includes('apple')) {
      return Platforms.AppleArm;
    }
    return Platforms.AppleIntel;
  }
  if (platform === 'linux') {
    if (arch === 'x64') {
      return Platforms.LinuxX86;
    }
    return Platforms.Linux;
  }
  return Platforms.others;
};
