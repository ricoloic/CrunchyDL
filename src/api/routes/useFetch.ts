type ErrorType = {
  error: string
} | null

export async function useFetch<T>(
  url: string,
  options: {
    type: 'GET' | 'PUT' | 'POST' | 'DELETE'
    header: HeadersInit
    body: BodyInit
    query?: { [key: string]: string }
    credentials?: RequestCredentials
  }
): Promise<{ data: T | null; error: ErrorType }> {
  const querystring = new URLSearchParams(options.query)

  const raw = await fetch(`${url}${querystring ? querystring : ''}`, {
    method: options.type,
    headers: options.header,
    body: options.body,
    credentials: options.credentials
  })

  if (!raw.ok) {
    const errorText = await raw.text()
    let errorData: ErrorType = null
    try {
      errorData = JSON.parse(errorText)
    } catch (error) {
      console.error('Error parsing error text:', error)
    }
    return { data: null, error: errorData }
  }

  const data = await raw.json()

  return { data: data, error: null }
}
