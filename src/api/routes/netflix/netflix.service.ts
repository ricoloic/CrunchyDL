export async function getNetflixBuildID() {
    try {
        const response = await fetch(`https://www.netflix.com/buildIdentifier`, {
            method: 'GET'
        })

        if (response.ok) {
            const raw = await response.text()

            const parsed: {
                BUILD_IDENTIFIER: string
                isProdVersion: boolean
            } = await JSON.parse(raw)

            return parsed
        } else {
            throw new Error(await response.text())
        }
    } catch (e) {
        console.log('Getting Netflix Build ID failed')
        throw new Error(e as string)
    }
}

export async function getNetflixMetadata(id: string) {
    const build = await getNetflixBuildID()

    if (!build) return

    const headers = {
        Accept: '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'es,ca;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        Host: 'www.netflix.com',
        Pragma: 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.82 Safari/537.36',
        'X-Netflix.browserName': 'Chrome',
        'X-Netflix.browserVersion': '99',
        'X-Netflix.clientType': 'akira',
        'X-Netflix.esnPrefix': 'NFCDCH-02-',
        'X-Netflix.osFullName': 'Windows 10',
        'X-Netflix.osName': 'Windows',
        'X-Netflix.osVersion': '10.0',
        'X-Netflix.playerThroughput': '58194',
        'X-Netflix.uiVersion': build.BUILD_IDENTIFIER
    }

    const params = {
        movieid: id,
        drmSystem: 'widevine',
        isWatchlistEnabled: 'false',
        isShortformEnabled: 'false',
        isVolatileBillboardsEnabled: 'false'
    }

    const querystring = new URLSearchParams(params)

    try {
        const response = await fetch(`https://www.netflix.com/nq/website/memberapi/${build.BUILD_IDENTIFIER}/metadata?${querystring ? querystring : ''}`, {
            method: 'GET',
            headers: headers
        })

        if (response.ok) {
            const raw = await response.text()

            const parsed = await JSON.parse(raw)

            return parsed
        } else {
            console.log(response)
            throw new Error(await response.text())
        }
    } catch (e) {
        console.log('Getting Netflix Build ID failed')
        console.log(e)
        throw new Error(e as string)
    }
}
