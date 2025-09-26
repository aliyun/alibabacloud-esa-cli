import chalk from 'chalk';
import inquirer from 'inquirer';
import portscanner from 'portscanner';

import t from '../i18n/index.js';
import logger from '../libs/logger.js';

export const checkPort = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    portscanner.checkPortStatus(port, '127.0.0.1', (error, status) => {
      if (error) {
        resolve(false);
      } else if (status === 'open') {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};

const findAvailablePort = async (startPort: number) => {
  return await portscanner.findAPortNotInUse(startPort, 65535);
};

const echoNewInspectTip = () => {
  logger.point(
    t('dev_inspect_tip1').d('You just provided a new inspection port')
  );
  logger.point(t('dev_inspect_tip2').d('You need to open chrome://inspect'));
  logger.point(
    t('dev_inspect_tip3').d(
      'Click Configure.. button behind the Discover network targets'
    )
  );
  logger.point(
    t('dev_inspect_tip4').d(
      'Config your new IP address and port in Target discovery settings'
    )
  );
  logger.point(
    t('dev_inspect_tip5').d('Now you can use Chrome inspect with new port 😉')
  );
  logger.block();
};

const checkAndInputPort = async (port: number, inspectPort?: number) => {
  let finalPort = port;
  let finalInspectPort = inspectPort;

  const isPortAvailable = await checkPort(port);

  const stringPort = port.toString();

  if (!isPortAvailable) {
    logger.error(
      t('dev_port_used', { stringPort }).d(`Port ${stringPort} already in use.`)
    );
    try {
      const availablePort = await findAvailablePort(port);
      finalPort = (
        await inquirer.prompt([
          {
            type: 'number',
            name: 'port',
            message: t('dev_port_ask_input').d('Input a new port:'),
            default: availablePort
          }
        ])
      ).port;
      const isNewPortAvailable = await checkPort(finalPort);
      if (!isNewPortAvailable) {
        logger.error(t('dev_port_invalid').d('This port is invalid.'));
        throw new Error('Specified port already in use.');
      }
    } catch (_) {
      const option = chalk.green('esa-cli dev --port <port>');
      logger.log(
        t('dev_port_used_advice', { option }).d(
          `You can use ${option} to specify another port.`
        )
      );
      throw new Error('Specified port already in use.');
    }
  }

  if (!inspectPort) {
    return {
      port: finalPort
    };
  }
  const stringInspectPort = inspectPort.toString();
  const isInspectPortAvailable = await checkPort(inspectPort);

  if (!isInspectPortAvailable) {
    logger.error(
      t('dev_inspect_port_used', { stringInspectPort }).d(
        `Inspect port ${stringInspectPort} already in use.`
      )
    );
    try {
      const availablePort = await findAvailablePort(inspectPort);
      finalInspectPort = (
        await inquirer.prompt([
          {
            type: 'number',
            name: 'port',
            message: t('dev_inspect_port_ask_input').d(
              'Input a new Chrome inspect port:'
            ),
            default: availablePort
          }
        ])
      ).port;
    } catch (_) {
      const option = chalk.green('esa-cli dev --inspect-port <port>');
      logger.log(
        t('dev_port_used_advice', { option }).d(
          `You can use ${option} to specify another port.`
        )
      );
      throw new Error('Inspect port already in use.');
    }
  }
  if (finalInspectPort !== inspectPort) {
    echoNewInspectTip();
  }
  return {
    port: finalPort,
    inspectPort: finalInspectPort
  };
};

export default checkAndInputPort;
