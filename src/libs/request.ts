import fetch, { Headers, RequestInit, Response } from 'node-fetch';

class HttpRequest {
  private static instance: HttpRequest;
  private defaultHeaders: Headers;
  private timeout: number;
  private retryCount: number;

  constructor(
    defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    },
    timeout = 15000,
    retryCount = 3
  ) {
    this.defaultHeaders = new Headers(defaultHeaders);
    this.timeout = timeout;
    this.retryCount = retryCount;
  }

  static getInstance(
    defaultHeaders?: Record<string, string>,
    timeout?: number,
    retryCount?: number
  ): HttpRequest {
    if (!HttpRequest.instance) {
      HttpRequest.instance = new HttpRequest(
        defaultHeaders,
        timeout,
        retryCount
      );
      Object.freeze(HttpRequest.instance);
    }
    return HttpRequest.instance;
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeout);
    options.signal = controller.signal;

    try {
      return await fetch(url, options);
    } catch (error) {
      throw new Error(`请求超时或失败: ${(error as Error).message}`);
    } finally {
      clearTimeout(id);
    }
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, options);
        if (response.ok) {
          return response;
        }
        throw new Error(
          `服务器响应错误: ${response.status} ${response.statusText}`
        );
      } catch (error) {
        if (attempt === this.retryCount) {
          throw error;
        }
      }
    }
    throw new Error('达到最大重试次数');
  }

  async get(url: string, headers?: Record<string, string>): Promise<any> {
    try {
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: headers
          ? new Headers({ ...this.defaultHeaders, ...headers })
          : this.defaultHeaders
      });

      return await response.json();
    } catch (error) {
      console.error(`GET请求错误: ${(error as Error).message}`);
      throw error;
    }
  }

  async post(
    url: string,
    data: any,
    headers?: Record<string, string>
  ): Promise<any> {
    try {
      const response = await this.fetchWithRetry(url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: headers
          ? new Headers({ ...this.defaultHeaders, ...headers })
          : this.defaultHeaders
      });

      return await response.json();
    } catch (error) {
      console.error(`POST请求错误: ${(error as Error).message}`);
      throw error;
    }
  }
}

const request = HttpRequest.getInstance();

export default request;
