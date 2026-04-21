export interface ApiResponse<TBody> {
  body: TBody
  headers: Headers
}

export class ApiRequestError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.statusCode = statusCode
  }
}

export default class ApiService {
  async request<TBody>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    headers: Record<string, string> = {},
    body?: string,
  ): Promise<ApiResponse<TBody>> {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body,
    })

    let parsedBody: unknown = null

    try {
      parsedBody = await response.json()
    } catch {
      parsedBody = null
    }

    if (!response.ok) {
      throw new ApiRequestError(response.statusText || 'Request failed', response.status)
    }

    return {
      body: parsedBody as TBody,
      headers: response.headers,
    }
  }

  async loadSpec(): Promise<void> {
    return Promise.resolve()
  }
}
