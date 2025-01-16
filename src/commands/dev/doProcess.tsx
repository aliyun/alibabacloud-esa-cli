import React, { FC, useEffect } from 'react';
import { Box, Text, useApp, useInput, useStdin, render } from 'ink';
import chalk from 'chalk';
import logger from '../../libs/logger.js';
import openInBrowser from '../../utils/openInBrowser.js';
import WorkerServer from './mockWorker/server.js';
import Ew2Server from './ew2/server.js';
import { getDevOpenBrowserUrl } from '../../utils/fileUtils/index.js';
import t from '../../i18n/index.js';

const InteractionBox: FC<{
  worker?: WorkerServer | Ew2Server;
}> = ({ worker }) => {
  const { exit } = useApp();
  const inspectLink = chalk.underline.blue('chrome://inspect/#devices');
  const remoteTarget = chalk.blue('Remote Target');
  const inspect = chalk.blue('inspect');
  /* eslint-disable no-unused-vars */
  useInput(async (input: any) => {
    switch (input.toLowerCase()) {
      case 'c':
        console.clear();
        logger.block();
        break;
      case 'b': {
        await openInBrowser(getDevOpenBrowserUrl());
        break;
      }
      case 'd': {
        logger.log(
          t('dev_input_inspect_tip1', { inspectLink }).d(
            `👉 Please visit ${inspectLink} in the Chrome browser`
          )
        );
        logger.log(
          t('dev_input_inspect_tip2', { inspect, remoteTarget }).d(
            `👉 See your debugger under ${remoteTarget} and click the ${inspect} button`
          )
        );
        break;
      }
      case 'x':
        exit();
        break;
      default:
        break;
    }
  });

  useEffect(() => {
    return () => {
      if (worker) {
        worker.stop();
      }
    };
  }, []);

  return (
    <>
      <Box borderStyle="classic" paddingLeft={1} paddingRight={1}>
        <Text bold={true}>[b]</Text>
        <Text> open a browser, </Text>
        <>
          <Text bold={true}>[d]</Text>
          <Text> open Devtools, </Text>
        </>
        <Text bold={true}>[c]</Text>
        <Text> clear console, </Text>
        <Text bold={true}>[x]</Text>
        <Text> to exit</Text>
      </Box>
    </>
  );
};

const doProcess = (worker?: WorkerServer | Ew2Server) => {
  const devElement = render(<InteractionBox worker={worker} />);
  return {
    devElement,
    exit: () => {
      devElement.unmount();
      setTimeout(() => {
        process.exit(0);
      }, 500);
    }
  };
};

export default doProcess;
