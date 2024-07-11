import type { CrunchyLogin } from './Types'
import type { Services } from '~/src/constants'

export async function crunchyLogin(geo: string) {
    const { data, error } = await useFetch<CrunchyLogin>('http://localhost:9941/api/crunchyroll/login', {
        method: 'POST',
        query: {
            geo
        }
    })

    return { data, error }
}

export async function checkAccount(service: Services) {
    const { data, error } = await useFetch<CrunchyLogin>(`http://localhost:9941/api/service/check/${service}`, {
        method: 'GET'
    })

    return { data, error }
}

export async function loginAccount(user: string, password: string, service: Services) {
    const { data, error } = await useFetch<CrunchyLogin>(`http://localhost:9941/api/service/login/${service}`, {
        method: 'POST',
        body: {
            user,
            password
        }
    })

    return { data, error }
}
