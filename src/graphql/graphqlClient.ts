import logger from '../utils/logger';

export interface GraphQLClientConfig {
  endpoint: string;
  apiKey?: string;
  retryAttempts?: number;
  retryDelay?: number;
  requestTimeout?: number;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

export class GraphQLClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly graphqlErrors?: Array<{ message: string }>
  ) {
    super(message);
    this.name = 'GraphQLClientError';
  }
}

export class GraphQLClient {
  private readonly endpoint: string;
  private readonly apiKey?: string;
  private readonly retryAttempts: number;
  private readonly retryDelay: number;
  private readonly requestTimeout: number;

  constructor(config: GraphQLClientConfig) {
    this.endpoint = config.endpoint;
    this.apiKey = config.apiKey;
    this.retryAttempts = config.retryAttempts ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
    this.requestTimeout = config.requestTimeout ?? 30000;
  }

  async query<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await this.executeQuery<T>(query, variables);
        return result;
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * attempt;
          logger.warn(
            `GraphQL query failed (attempt ${attempt}/${this.retryAttempts}), retrying in ${delay}ms: ${lastError.message}`
          );
          await this.sleep(delay);
        }
      }
    }

    logger.error(
      `GraphQL query failed after ${this.retryAttempts} attempts: ${lastError?.message}`
    );
    throw lastError;
  }

  private async executeQuery<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          variables,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new GraphQLClientError(
          `HTTP error: ${response.status} ${response.statusText}`,
          response.status
        );
      }

      const json = (await response.json()) as GraphQLResponse<T>;

      if (json.errors && json.errors.length > 0) {
        const errorMessages = json.errors.map((e) => e.message).join(', ');
        throw new GraphQLClientError(
          `GraphQL errors: ${errorMessages}`,
          undefined,
          json.errors
        );
      }

      if (!json.data) {
        throw new GraphQLClientError('GraphQL response missing data');
      }

      return json.data;
    } catch (error) {
      if (error instanceof GraphQLClientError) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        throw new GraphQLClientError(
          `Request timeout after ${this.requestTimeout}ms`
        );
      }

      throw new GraphQLClientError(
        `Network error: ${(error as Error).message}`
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getEndpoint(): string {
    return this.endpoint;
  }
}
