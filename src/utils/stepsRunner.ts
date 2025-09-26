import ora, { Ora } from 'ora';

export type PromiseFunction<T> = () => Promise<T>;

export interface Result<T> {
  status: 'success' | 'error';
  message: T | string;
}

async function stepsRunner<T>(
  promises: PromiseFunction<T>[]
): Promise<Result<T>[]> {
  const results: Result<T>[] = [];

  for (const promise of promises) {
    const spinner: Ora = ora('Loading...').start();
    try {
      const result: T = await promise();
      spinner.succeed('Success!');
      results.push({ status: 'success', message: result });
    } catch (error) {
      spinner.fail(
        'Error: ' + (error instanceof Error ? error.message : 'Unknown Error')
      );
      results.push({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown Error'
      });
      break;
    }
  }

  return results;
}

export default stepsRunner;
