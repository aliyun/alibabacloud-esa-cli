import t from '../../i18n/index.js';

export const getSummary = (routineName: string) => {
  return [
    {
      title: t('summery_cd').d('Enter your project folder'),
      command: `💡 cd ${routineName}`
    },
    {
      title: t('summery_dev').d(
        'Start a local development server for your project'
      ),
      command: '💡 esa-cli dev'
    },
    {
      title: t('summery_commit').d('Save a new version of code'),
      command: '💡 esa-cli commit'
    },
    // Use Deploy or Release?
    {
      title: t('summery_deploy').d(
        'Deploy your project to different environments'
      ),
      command: '💡 esa-cli deploy'
    }
  ];
};

export const NODE_EXTERNALS = [
  'node:assert',
  'node:crypto',
  'node:async_hooks',
  'node:buffer',
  'node:diagnostics_channel',
  'node:events',
  'node:path',
  'node:process',
  'node:stream',
  'node:string_decoder',
  'node:util'
];
