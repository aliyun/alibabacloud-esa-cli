import { execSync } from 'child_process';
import { exit } from 'process';

import t from '../../i18n/index.js';
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
  try {
    execSync(`git clone ${url} ${path}`, { stdio: 'inherit' });
    logger.log('Repository cloned successfully.');
  } catch (error) {
    console.error('Error occurred while cloning the repository:', error);
    exit(0);
  }
}

export function installGit(path: string, debug = false) {
  try {
    execSync('git init', { stdio: 'ignore', cwd: path });
    if (debug) {
      logger.log('Git has been installed successfully.');
    }
    return true;
  } catch (error) {
    console.error('Error occurred during Git installation:', error);
    exit(0);
  }
}
