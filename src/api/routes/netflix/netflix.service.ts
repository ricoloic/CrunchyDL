export async function getNetflixBuildID() {
    try {
        const response = await fetch(`https://www.netflix.com/buildIdentifier`, {
            method: 'GET',
        })

        if (response.ok) {

            const raw = await response.text();

            const parsed: {
                BUILD_IDENTIFIER: string,
                isProdVersion: boolean
            } = await JSON.parse(raw);

            return parsed
        } else {
            throw new Error(await response.text())
        }
    } catch (e) {
        console.log('Getting Netflix Build ID failed')
        throw new Error(e as string)
    }
}