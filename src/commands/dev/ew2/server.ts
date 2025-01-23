import * as http from 'http';
import { ChildProcess } from 'child_process';
import spawn from 'cross-spawn';
import fetch from 'node-fetch';
import logger from '../../../libs/logger.js';
import { getRoot } from '../../../utils/fileUtils/base.js';
import { EW2BinPath } from '../../../utils/installEw2.js';
import { HttpProxyAgent } from 'http-proxy-agent';
import chalk from 'chalk';
import t from '../../../i18n/index.js';
import sleep from '../../../utils/sleep.js';

interface Props {
  port?: number;
  onClose?: () => void;
}

const getColorForStatusCode = (statusCode: number, message: string) => {
  if (statusCode >= 100 && statusCode < 200) {
    return chalk.blue(`${statusCode} ${message}`);
  } else if (statusCode >= 200 && statusCode < 300) {
    return chalk.green(`${statusCode} ${message}`);
  } else if (statusCode >= 300 && statusCode < 400) {
    return chalk.yellow(`${statusCode} ${message}`);
  } else if (statusCode >= 400 && statusCode < 500) {
    return chalk.red(`${statusCode} ${message}`);
  } else if (statusCode >= 500) {
    return chalk.magenta(chalk.bold(`${statusCode} ${message}`));
  } else {
    return `${statusCode} ${message}`;
  }
};

class Ew2Server {
  private worker: ChildProcess | null = null;
  private startingWorker = false;
  private workerStartTimeout: NodeJS.Timeout | undefined = undefined;
  private server: http.Server | null = null;
  private restarting = false;
  private port = 18080;
  private onClose?: () => void;
  constructor(props: Props) {
    // @ts-ignore
    if (global.port) this.port = global.port;
    if (props.port) this.port = props.port;
    if (props.onClose) this.onClose = props.onClose;
  }

  async start(): Promise<void> {
    this.startingWorker = true;
    const result = await this.openEdgeWorker();
    if (!result) {
      throw new Error('Worker start failed');
    }
    this.createServer();
  }

  openEdgeWorker() {
    if (this.worker) {
      return Promise.resolve();
    }
    const root = getRoot();
    // @ts-ignore
    const id = global.id || '';

    return new Promise((resolve, reject) => {
      this.worker = spawn(
        EW2BinPath,
        [
          '--config_file',
          `${root}/.dev/config-${id}.toml`,
          '--log_stdout',
          '-v'
        ],
        {
          stdio: ['pipe', 'pipe', 'pipe']
        }
      );

      this.workerStartTimeout = setTimeout(() => {
        reject(new Error(t('dev_worker_timeout').d('Worker start timeout')));
        this.worker && this.worker.kill();
      }, 60000);

      const sendToRuntime = () => {
        return new Promise((resolveStart) => {
          // @ts-ignore
          const ew2Port = global.ew2Port;
          const options = {
            hostname: '127.0.0.1',
            port: ew2Port,
            method: 'GET'
          };
          const req = http.get(options, (res) => {
            resolveStart(res.statusCode);
          });
          req.on('error', (err) => {
            resolveStart(null);
          });
          req.end();
        });
      };

      const checkRuntimeStart = async () => {
        while (this.startingWorker) {
          const [result] = await Promise.all([sendToRuntime(), sleep(500)]);
          if (result) {
            this.startingWorker = false;
            this.clearTimeout();
            resolve(result);
          }
        }
      };

      checkRuntimeStart();
      this.worker.stdout?.setEncoding('utf8');
      this.worker.stdout?.on('data', this.stdoutHandler.bind(this));
      this.worker.stderr?.on('data', this.stderrHandler.bind(this));
      this.worker.on('close', this.closeHandler.bind(this));
      this.worker.on('error', this.errorHandler.bind(this));
      process.on('SIGTERM', () => {
        this.worker && this.worker.kill();
      });
    });
  }

  clearTimeout() {
    clearTimeout(this.workerStartTimeout);
  }

  createServer() {
    this.server = http.createServer(async (req, res) => {
      try {
        const host = req.headers.host;
        const url = req.url;
        // @ts-ignore
        const ew2Port = global.ew2Port;
        // @ts-ignore
        const localUpstream = global.localUpstream;
        const workerRes = await fetch(
          `http://${localUpstream ? localUpstream : host}${url}`,
          {
            method: 'GET',
            headers: {
              'x-er-context':
                'eyJzaXRlX2lkIjogIjYyMjcxODQ0NjgwNjA4IiwgInNpdGVfbmFtZSI6ICJjb21wdXRlbHguYWxpY2RuLXRlc3QuY29tIiwgInNpdGVfcmVjb3JkIjogIm1vY2hlbi1uY2RuLmNvbXB1dGVseC5hbGljZG4tdGVzdC5jb20iLCAiYWxpdWlkIjogIjEzMjI0OTI2ODY2NjU2MDgiLCAic2NoZW1lIjoiaHR0cCIsICAiaW1hZ2VfZW5hYmxlIjogdHJ1ZX0=',
              'x-er-id': 'a.bA'
            },
            agent: new HttpProxyAgent(`http://127.0.0.1:${ew2Port}`)
          }
        );
        const workerHeaders = Object.fromEntries(workerRes.headers.entries());
        // 解决 gzip 兼容性问题，防止net::ERR_CONTENT_DECODING_FAILED
        workerHeaders['content-encoding'] = 'identity';
        if (workerRes.body) {
          if (workerRes.headers.get('content-type')?.includes('text/')) {
            const text = await workerRes.text();
            // 出现换行符之类会导致 content-length 不一致
            workerHeaders['content-length'] =
              Buffer.byteLength(text).toString();
            res.writeHead(workerRes.status, workerHeaders);
            res.end(text);
          } else {
            res.writeHead(workerRes.status, workerHeaders);
            workerRes.body.pipe(res);
          }
          logger.log(
            `[ESA Dev] ${req.method} ${url} ${getColorForStatusCode(workerRes.status, workerRes.statusText)}`
          );
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('EW2 return null');
        }
      } catch (err) {
        console.log(err);
      }
    });
    this.server.listen(this.port, () => {
      logger.log(`listening on port ${this.port}`);
    });
  }

  private stdoutHandler(chunk: any) {
    logger.log(`${chalk.bgGreen('[Worker]')} ${chunk.toString().trim()}`);
  }

  private stderrHandler(chunk: any) {
    logger.subError(
      `${chalk.bgGreen('[Worker Error]')} ${chunk.toString().trim()}`
    );
  }

  private errorHandler(error: any) {
    logger.error(error.message ? error.message : error);
    if (error.code && error.code === 'EACCES') {
      logger.pathEacces(EW2BinPath);
    }
    this.stop();
  }

  private closeHandler(code: number | null, signal: NodeJS.Signals | null) {
    if (this.restarting) {
      this.restarting = false;
      return;
    }
    this.stop().then(() => {
      logger.log(t('dev_server_closed').d('Worker server closed'));
      logger.info('Worker server closed');
      // @ts-ignore
      global.port = undefined;
      this.onClose && this.onClose();
    });
  }

  runCommand(command: string) {
    this.worker?.stdin?.write(command);
  }

  stop(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.worker) {
        resolve(false);
        return;
      }

      const onExit = (code: string, signal: string) => {
        this.worker = null;
        resolve(true);
      };

      this.worker.on('exit', onExit);
      this.worker.kill('SIGTERM');
      this.server?.close();
    });
  }

  async restart() {
    this.restarting = true;
    await this.stop();
    this.start();
    logger.log(t('dev_server_restart').d('Worker server restarted'));
    logger.info('Worker server restarted');
  }
}

export default Ew2Server;
