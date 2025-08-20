import fs from 'fs';
import path from 'path';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  checkEdgeRoutineType,
  EDGE_ROUTINE_TYPE
} from '../../src/utils/checkAssetsExist.js';
import { getProjectConfig } from '../../src/utils/fileUtils/index.js';

// Mock the fileUtils module
vi.mock('../../src/utils/fileUtils/index.js', () => ({
  getProjectConfig: vi.fn()
}));

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    statSync: vi.fn()
  }
}));

// Mock path module
vi.mock('path', () => ({
  default: {
    isAbsolute: vi.fn(),
    resolve: vi.fn()
  }
}));

describe('checkConfigRoutineType', () => {
  const mockGetProjectConfig = vi.mocked(getProjectConfig);
  const mockFs = vi.mocked(fs);
  const mockPath = vi.mocked(path);

  beforeEach(() => {
    vi.clearAllMocks();
    // Default path mocking
    mockPath.isAbsolute.mockReturnValue(false);
    mockPath.resolve.mockImplementation((p) => `/resolved/${p}`);

    // Default fs mocking
    mockFs.existsSync.mockReturnValue(true);
    mockFs.statSync.mockImplementation((path) => {
      if (String(path).includes('assets')) {
        return {
          isDirectory: () => true,
          isFile: () => false
        } as any;
      } else {
        return {
          isDirectory: () => false,
          isFile: () => true
        } as any;
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when no project config exists', () => {
    it('should return NOT_EXIST', () => {
      mockGetProjectConfig.mockReturnValue(null);

      const result = checkEdgeRoutineType();

      expect(result).toBe(EDGE_ROUTINE_TYPE.NOT_EXIST);
    });
  });

  describe('when project config exists but no assets or entry', () => {
    it('should return NOT_EXIST', () => {
      mockGetProjectConfig.mockReturnValue({
        name: 'test-project'
      } as any);

      const result = checkEdgeRoutineType();

      expect(result).toBe(EDGE_ROUTINE_TYPE.NOT_EXIST);
    });
  });

  describe('when only assets directory exists', () => {
    it('should return ASSETS_ONLY', () => {
      mockGetProjectConfig.mockReturnValue({
        name: 'test-project',
        assets: { directory: 'assets' }
      } as any);

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isDirectory: () => true,
        isFile: () => false
      } as any);

      const result = checkEdgeRoutineType();

      expect(result).toBe(EDGE_ROUTINE_TYPE.ASSETS_ONLY);
    });
  });

  describe('when only entry file exists', () => {
    it('should return JS_ONLY', () => {
      mockGetProjectConfig.mockReturnValue({
        name: 'test-project',
        entry: 'src/index.js'
      } as any);

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        isDirectory: () => false,
        isFile: () => true
      } as any);

      const result = checkEdgeRoutineType();

      expect(result).toBe(EDGE_ROUTINE_TYPE.JS_ONLY);
    });
  });

  describe('when both assets and entry exist', () => {
    it('should return JS_AND_ASSETS', () => {
      mockGetProjectConfig.mockReturnValue({
        name: 'test-project',
        assets: { directory: 'assets' },
        entry: 'src/index.js'
      } as any);

      // Mock path.resolve to handle the specific paths used in the function
      mockPath.resolve.mockImplementation((p1, p2) => {
        if (p1 === '' && p2 === 'assets') {
          return 'assets';
        } else if (p1 === '' && p2 === 'src/index.js') {
          return 'src/index.js';
        } else if (p1 === 'assets') {
          return '/resolved/assets';
        } else if (p1 === 'src/index.js') {
          return '/resolved/src/index.js';
        }
        return `/resolved/${p1}${p2 ? '/' + p2 : ''}`;
      });

      // Mock fs.existsSync to return true for the resolved paths
      mockFs.existsSync.mockImplementation((path) => {
        return path === '/resolved/assets' || path === '/resolved/src/index.js';
      });

      // Mock fs.statSync to return different stats for assets and entry
      mockFs.statSync.mockImplementation((path) => {
        if (path === '/resolved/assets') {
          return {
            isDirectory: () => true,
            isFile: () => false
          } as any;
        } else if (path === '/resolved/src/index.js') {
          return {
            isDirectory: () => false,
            isFile: () => true
          } as any;
        }
        return {
          isDirectory: () => false,
          isFile: () => false
        } as any;
      });

      const result = checkEdgeRoutineType();

      expect(result).toBe(EDGE_ROUTINE_TYPE.JS_AND_ASSETS);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string paths', () => {
      mockGetProjectConfig.mockReturnValue({
        name: 'test-project',
        assets: { directory: '' },
        entry: ''
      } as any);

      const result = checkEdgeRoutineType();

      expect(result).toBe(EDGE_ROUTINE_TYPE.NOT_EXIST);
    });

    it('should handle undefined paths', () => {
      mockGetProjectConfig.mockReturnValue({
        name: 'test-project',
        assets: { directory: undefined },
        entry: undefined
      } as any);

      const result = checkEdgeRoutineType();

      expect(result).toBe(EDGE_ROUTINE_TYPE.NOT_EXIST);
    });

    it('should handle whitespace-only paths', () => {
      mockGetProjectConfig.mockReturnValue({
        name: 'test-project',
        assets: { directory: '   ' },
        entry: '  '
      } as any);

      // Mock path.resolve to return empty strings for whitespace paths
      mockPath.resolve.mockImplementation((p1, p2) => {
        if (p1 === '' && (p2 === '   ' || p2 === '  ')) {
          return '';
        }
        return `/resolved/${p1}${p2 ? '/' + p2 : ''}`;
      });

      // Mock fs.existsSync to return false for empty paths
      mockFs.existsSync.mockImplementation((path) => {
        return path !== '';
      });

      const result = checkEdgeRoutineType();

      expect(result).toBe(EDGE_ROUTINE_TYPE.NOT_EXIST);
    });

    it('should handle non-existent paths', () => {
      mockGetProjectConfig.mockReturnValue({
        name: 'test-project',
        assets: { directory: 'non-existent-assets' },
        entry: 'non-existent-entry.js'
      } as any);

      mockFs.existsSync.mockReturnValue(false);

      const result = checkEdgeRoutineType();

      expect(result).toBe(EDGE_ROUTINE_TYPE.NOT_EXIST);
    });

    it('should handle fs.statSync errors gracefully', () => {
      mockGetProjectConfig.mockReturnValue({
        name: 'test-project',
        assets: { directory: 'assets' },
        entry: 'src/index.js'
      } as any);

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = checkEdgeRoutineType();

      expect(result).toBe(EDGE_ROUTINE_TYPE.NOT_EXIST);
    });
  });

  describe('path resolution', () => {
    it('should handle absolute paths correctly', () => {
      mockGetProjectConfig.mockReturnValue({
        name: 'test-project',
        assets: { directory: '/absolute/assets' },
        entry: '/absolute/src/index.js'
      } as any);

      mockPath.isAbsolute.mockImplementation((p) => p.startsWith('/'));
      mockPath.resolve.mockImplementation((p1, p2) => {
        if (p1 === '' && p2 === '/absolute/assets') {
          return '/absolute/assets';
        } else if (p1 === '' && p2 === '/absolute/src/index.js') {
          return '/absolute/src/index.js';
        }
        return p1;
      });

      mockFs.existsSync.mockImplementation((path) => {
        return path === '/absolute/assets' || path === '/absolute/src/index.js';
      });
      mockFs.statSync.mockImplementation((path) => {
        if (path === '/absolute/assets') {
          return {
            isDirectory: () => true,
            isFile: () => false
          } as any;
        } else if (path === '/absolute/src/index.js') {
          return {
            isDirectory: () => false,
            isFile: () => true
          } as any;
        }
        return {
          isDirectory: () => false,
          isFile: () => false
        } as any;
      });

      const result = checkEdgeRoutineType();

      expect(result).toBe(EDGE_ROUTINE_TYPE.JS_AND_ASSETS);
      expect(mockPath.isAbsolute).toHaveBeenCalledWith('/absolute/assets');
      expect(mockPath.isAbsolute).toHaveBeenCalledWith(
        '/absolute/src/index.js'
      );
    });

    it('should handle relative paths correctly', () => {
      mockGetProjectConfig.mockReturnValue({
        name: 'test-project',
        assets: { directory: './assets' },
        entry: './src/index.js'
      } as any);

      mockPath.isAbsolute.mockReturnValue(false);
      mockPath.resolve.mockImplementation((p1, p2) => {
        if (p1 === '' && p2 === './assets') {
          return './assets';
        } else if (p1 === '' && p2 === './src/index.js') {
          return './src/index.js';
        } else if (p1 === './assets') {
          return '/resolved/assets';
        } else if (p1 === './src/index.js') {
          return '/resolved/src/index.js';
        }
        return `/resolved/${p1}`;
      });

      mockFs.existsSync.mockImplementation((path) => {
        return path === '/resolved/assets' || path === '/resolved/src/index.js';
      });
      mockFs.statSync.mockImplementation((path) => {
        if (path === '/resolved/assets') {
          return {
            isDirectory: () => true,
            isFile: () => false
          } as any;
        } else if (path === '/resolved/src/index.js') {
          return {
            isDirectory: () => false,
            isFile: () => true
          } as any;
        }
        return {
          isDirectory: () => false,
          isFile: () => false
        } as any;
      });

      const result = checkEdgeRoutineType();

      expect(result).toBe(EDGE_ROUTINE_TYPE.JS_AND_ASSETS);
      expect(mockPath.resolve).toHaveBeenCalledWith('./assets');
      expect(mockPath.resolve).toHaveBeenCalledWith('./src/index.js');
    });
  });
});
