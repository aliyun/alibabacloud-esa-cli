import { describe, expect, it, vi } from 'vitest';
import {
  displayRoutineList,
  handleList
} from '../../src/commands/routine/list.js';
import {
  EdgeFunctionItem,
  GetRoutineUserInfoRes
} from '../../src/libs/interface.js';
import { mockConsoleMethods } from '../helper/mockConsole.js';
import { ApiService } from '../../src/libs/apiService.js';

describe('displayRoutineList', () => {
  let std = mockConsoleMethods();

  it('should display routine list in a table', () => {
    const versionList = [
      {
        RoutineName: 'routine1',
        CreateTime: '2022-01-01',
        Description: 'SGVsbG8gd29ybGQ=',
        SpecName: 'spec1'
      },
      {
        RoutineName: 'routine2',
        CreateTime: '2022-01-02',
        Description: 'VGhpcyBpcyBhIHN0cmluZw==',
        SpecName: 'spec2'
      }
    ];

    displayRoutineList(versionList);

    expect(std.out).toMatchSnapshot();
  });

  it('should display empty table if versionList is empty', () => {
    const versionList: EdgeFunctionItem[] = [];

    displayRoutineList(versionList);
    expect(std.out).toMatchSnapshot();
  });

  it('should display a routine list by calling getRoutineUserInfo', async () => {
    const mockRes: GetRoutineUserInfoRes = {
      Routines: [
        {
          RoutineName: 'routine1',
          Description: 'SGVsbG8gd29ybGQ=',
          CreateTime: '2022-01-01',
          SpecName: 'spec1'
        },
        {
          RoutineName: 'routine2',
          Description: 'VGhpcyBpcyBhIHN0cmluZw==',
          CreateTime: '2022-01-02',
          SpecName: 'spec2'
        }
      ],
      Subdomains: ['subdomain1', 'subdomain2']
    };
    vi.mocked(
      (await ApiService.getInstance()).getRoutineUserInfo
    ).mockResolvedValue(mockRes);
    await handleList({
      _: [],
      $0: ''
    });
    expect(std.out).toMatchSnapshot();
    expect(std.out).toHaveBeenCalledWith(expect.stringContaining('Name'));
    expect(std.out).toHaveBeenCalledWith(expect.stringContaining('Created'));
    expect(std.out).toHaveBeenCalledWith(
      expect.stringContaining('Description')
    );
    expect(std.out).toHaveBeenCalledWith(
      expect.stringContaining('Specification')
    );

    expect(std.out).toHaveBeenCalledWith(expect.stringContaining('routine1'));
    expect(std.out).toHaveBeenCalledWith(
      expect.stringContaining('Hello world')
    );
    expect(std.out).toHaveBeenCalledWith(expect.stringContaining('2022/1/1'));
    expect(std.out).toHaveBeenCalledWith(expect.stringContaining('spec1'));

    expect(std.out).toHaveBeenCalledWith(expect.stringContaining('routine2'));
    expect(std.out).toHaveBeenCalledWith(
      expect.stringContaining('This is a string')
    );
    expect(std.out).toHaveBeenCalledWith(expect.stringContaining('2022/1/2'));
    expect(std.out).toHaveBeenCalledWith(expect.stringContaining('spec2'));
  });
});
