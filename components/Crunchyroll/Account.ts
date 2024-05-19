import type { CrunchyLogin } from './Types'

export async function crunchyLogin(geo: string) {
    const { data, error } = await useFetch<CrunchyLogin>('http://localhost:9941/api/crunchyroll/login', {
        method: 'POST',
        query: {
            geo: geo
        }
    })

    return { data, error }
}

export async function checkAccount(service: string) {
    const { data, error } = await useFetch<CrunchyLogin>(`http://localhost:9941/api/service/check/${service}`, {
        method: 'GET'
    })

    return { data, error }
}

export async function loginAccount(user: string, password: string, service: string) {
    const { data, error } = await useFetch<CrunchyLogin>(`http://localhost:9941/api/service/login/${service}`, {
        method: 'POST',
        body: {
            user: user,
            password: password
        }
    })

    return { data, error }
}
