import type { Proxies } from './Types'

export async function getProxies() {
    const { data, error } = await useFetch<Proxies>('http://localhost:9941/api/service/proxies', {
        method: 'GET'
    })

    return { data, error }
}
