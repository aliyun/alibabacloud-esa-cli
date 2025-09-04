import { execSync } from 'child_process';

import logger from '../../libs/logger.js';

export function isInstalledGit(): boolean {
  try {
    execSync('git --version');
    return true;
  } catch (error) {
    return false;
  }
}

export function isGitConfigured(): boolean {
  try {
    execSync('git config --get user.name');
    execSync('git config --get user.email');
    return true;
  } catch (error) {
    return false;
  }
}

export async function cloneRepository(url: string, path?: string) {
  if (!isInstalledGit()) {
    logger.error('Git is not installed on your system.');
    logger.info('Please install Git first:');
    logger.info('  • macOS: brew install git');
    logger.info('  • Ubuntu/Debian: sudo apt-get install git');
    logger.info('  • Windows: Download from https://git-scm.com/');
    logger.info('  • Or visit: https://git-scm.com/downloads');
    return false;
  }

  try {
    execSync(`git clone ${url} ${path}`, { stdio: 'inherit' });
    logger.log('Repository cloned successfully.');
    return true;
  } catch (error) {
    logger.error(`Error occurred while cloning the repository: ${error}`);
    return false;
  }
}

export function installGit(path: string, debug = false, autoInstall = false) {
  if (!isInstalledGit()) {
    if (autoInstall) {
      logger.info('Git not found. Attempting to auto-install...');
      if (autoInstallGit()) {
        logger.info(
          'Git installed successfully! Now initializing repository...'
        );
      } else {
        logger.error('Failed to auto-install Git.');
        logger.info('Please install Git manually:');
        logger.info('  • macOS: brew install git');
        logger.info('  • Ubuntu/Debian: sudo apt-get install git');
        logger.info('  • Windows: Download from https://git-scm.com/');
        logger.info('  • Or visit: https://git-scm.com/downloads');
        return false;
      }
    } else {
      logger.error('Git is not installed on your system.');
      logger.info('Please install Git first:');
      logger.info('  • macOS: brew install git');
      logger.info('  • Ubuntu/Debian: sudo apt-get install git');
      logger.info('  • Windows: Download from https://git-scm.com/');
      logger.info('  • Or visit: https://git-scm.com/downloads');
      return false;
    }
  }

  try {
    execSync('git init', { stdio: 'ignore', cwd: path });
    if (debug) {
      logger.log('Git repository initialized successfully.');
    }
    return true;
  } catch (error) {
    logger.error(`Error occurred while initializing Git repository: ${error}`);
    return false;
  }
}

/**
 * Attempt to automatically install Git on supported platforms
 * @returns true if installation was successful, false otherwise
 */
export function autoInstallGit(): boolean {
  try {
    const platform = process.platform;

    if (platform === 'darwin') {
      // macOS - try using Homebrew
      logger.info('Attempting to install Git using Homebrew...');
      execSync('brew install git', { stdio: 'inherit' });
      logger.success('Git installed successfully via Homebrew!');
      return true;
    } else if (platform === 'linux') {
      // Linux - try using apt-get (Ubuntu/Debian)
      logger.info('Attempting to install Git using apt-get...');
      execSync('sudo apt-get update && sudo apt-get install -y git', {
        stdio: 'inherit'
      });
      logger.success('Git installed successfully via apt-get!');
      return true;
    } else {
      logger.warn('Auto-installation is not supported on this platform.');
      logger.info(
        'Please install Git manually from: https://git-scm.com/downloads'
      );
      return false;
    }
  } catch (error) {
    logger.error(`Failed to auto-install Git: ${error}`);
    logger.info('Please install Git manually:');
    logger.info('  • macOS: brew install git');
    logger.info('  • Ubuntu/Debian: sudo apt-get install git');
    logger.info('  • Windows: Download from https://git-scm.com/');
    return false;
  }
}
