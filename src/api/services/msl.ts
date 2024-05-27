function getRandomInt(ca: BigInt) {
    return BigInt(Math.floor(Math.random() * Number(ca)))
}

function randomHex(length: number) {
    const characters = '0123456789ABCDEF'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    return result
}

function getESN() {
    return `NFANDROID1-PRV-P-SAMSUSM-G950F-7169-${randomHex(30)}`
}

export function encryptNetflixMSL(body: any) {
    var headers = {
        sender: getESN(),
        handshake: true,
        nonreplayable: 2,
        capabilities: { languages: [], compressionalgos: [] },
        recipient: 'Netflix',
        renewable: true,
        messageid: getRandomInt(BigInt(2) ** BigInt(52)),
        timestamp: Date.now() / 1000
    }
}
