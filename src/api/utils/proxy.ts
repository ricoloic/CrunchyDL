import settings from 'electron-settings'
import { server } from '../api'

type ProxyStatuses = 'online' | 'offline'

export type Proxy = {
    name: string
    code: string
    url: string
    status: ProxyStatuses | undefined
}

const PROXIES: Proxy[] = [
    {
        name: 'US Proxy',
        code: 'US',
        url: 'https://us-proxy.crd.cx/',
        status: undefined
    },
    {
        name: 'UK Proxy',
        code: 'GB',
        url: 'https://uk-proxy.crd.cx/',
        status: undefined
    },
    {
        name: 'DE Proxy',
        code: 'DE',
        url: 'https://de-proxy.crd.cx/',
        status: undefined
    }
]

export async function validateProxies() {
    const cached = server.CacheController.get('proxycheck') as Proxy[]

    if (cached) return cached

    const proxies = [...PROXIES]

    for (const proxy of proxies) {
        await Promise.race([
            fetch(proxy.url + 'health', { method: 'GET' }),
            new Promise<Response>((_resolve, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 500)
            )
        ])
            .then((response) => {
                if (response.ok) proxy.status = 'online'
                else proxy.status = 'offline'
            })
            .catch(() => {
                proxy.status = 'offline'
            })
    }

    server.CacheController.set('proxycheck', proxies, 60)

    return proxies
}

export async function isProxyActive() {
    return !!(await settings.get('proxyActive'))
}
