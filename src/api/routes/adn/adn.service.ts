import JSEncrypt from 'jsencrypt'
import CryptoJS from 'crypto-js'
import { server } from '../../api'
import { ADNPlayerConfig } from '../../types/adn'
import { messageBox } from '../../../electron/background'
import { useFetch } from '../useFetch'

// export async function getShowADN(q: number) {
//   const cachedData = server.CacheController.get(`getshowadn-${q}`)

//   if (cachedData) {
//     return cachedData
//   }

//   try {
//     const response = await fetch(`https://gw.api.animationdigitalnetwork.fr/show/${q}`, {
//       method: 'GET',
//       headers: {
//         'x-target-distribution': 'de'
//       }
//     })

//     if (response.ok) {
//       const data: {
//         show: Array<any>
//       } = JSON.parse(await response.text())

//       server.CacheController.set(`getshowadn-${q}`, data.show, 1000)

//       return data.show
//     } else {
//       throw new Error('Failed to fetch ADN')
//     }
//   } catch (e) {
//     throw new Error(e as string)
//   }
// }

// export async function getEpisodesWithShowIdADN(q: number) {
//   const cachedData = server.CacheController.get(`getepisodesadn-${q}`)

//   if (cachedData) {
//     return cachedData
//   }

//   try {
//     const response = await fetch(`https://gw.api.animationdigitalnetwork.fr/video/show/${q}?offset=0&limit=-1&order=asc`, {
//       method: 'GET',
//       headers: {
//         'x-target-distribution': 'de'
//       }
//     })

//     if (response.ok) {
//       const data: {
//         videos: Array<any>
//       } = JSON.parse(await response.text())

//       server.CacheController.set(`getepisodesadn-${q}`, data.videos, 1000)

//       return data.videos
//     } else {
//       throw new Error('Failed to fetch ADN')
//     }
//   } catch (e) {
//     throw new Error(e as string)
//   }
// }

// export async function getEpisodeADN(q: number) {
//   const cachedData = server.CacheController.get(`getepisodeadn-${q}`)

//   if (cachedData) {
//     return cachedData
//   }

//   try {
//     const response = await fetch(`https://gw.api.animationdigitalnetwork.fr/video/${q}/public`, {
//       method: 'GET',
//       headers: {
//         'x-target-distribution': 'de'
//       }
//     })

//     if (response.ok) {
//       const data: {
//         video: Array<any>
//       } = JSON.parse(await response.text())

//       server.CacheController.set(`getepisodeadn-${q}`, data.video, 1000)

//       return data.video
//     } else {
//       throw new Error('Failed to fetch ADN')
//     }
//   } catch (e) {
//     throw new Error(e as string)
//   }
// }

// export async function searchADN(q: string) {
//   const cachedData = server.CacheController.get(`searchadn-${q}`)

//   if (cachedData) {
//     return cachedData
//   }

//   try {
//     const response = await fetch(`https://gw.api.animationdigitalnetwork.fr/show/catalog?maxAgeCategory=18&search=${q}`, {
//       method: 'GET',
//       headers: {
//         'x-target-distribution': 'de'
//       }
//     })

//     if (response.ok) {
//       const data: {
//         shows: Array<any>
//       } = JSON.parse(await response.text())

//       server.CacheController.set(`searchadn-${q}`, data.shows, 1000)

//       return data.shows
//     } else {
//       throw new Error('Failed to fetch ADN')
//     }
//   } catch (e) {
//     throw new Error(e as string)
//   }
// }

// export async function loginADN() {
//   const cachedData = server.CacheController.get('adnlogin')
//   const cachedToken = server.CacheController.get('adntoken')

//   if (cachedData) {
//     return cachedData
//   }

//   if (cachedToken) {
//     const data = await loginADNToken(cachedToken as string)
//     return data
//   }

//   const body = {
//     source: 'Web',
//     rememberMe: true
//   }

//   try {
//     const response = await fetch(`https://gw.api.animationdigitalnetwork.fr/authentication/login`, {
//       method: 'POST',
//       headers: {
//         'x-target-distribution': 'de',
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(body)
//     })

//     if (response.ok) {
//       const data: {
//         accessToken: string
//       } = JSON.parse(await response.text())

//       server.CacheController.set('adnlogin', data, 100)
//       server.CacheController.set('adntoken', data.accessToken, 300)
//       server.CacheController.del('adnplayerconfig')

//       return data
//     } else {
//       throw new Error('Failed to fetch ADN')
//     }
//   } catch (e) {
//     throw new Error(e as string)
//   }
// }

// async function loginADNToken(t: string) {
//   const body = {
//     source: 'Web',
//     rememberMe: true
//   }

//   try {
//     const response = await fetch(`https://gw.api.animationdigitalnetwork.fr/authentication/refresh`, {
//       method: 'POST',
//       headers: {
//         'x-target-distribution': 'de',
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${t}`,
//         'X-Access-Token': t
//       },
//       body: JSON.stringify(body)
//     })

//     if (response.ok) {
//       const data: {
//         accessToken: string
//       } = JSON.parse(await response.text())

//       server.CacheController.set('adnlogin', data, 100)
//       server.CacheController.set('adntoken', data.accessToken, 300)
//       server.CacheController.del('adnplayerconfig')

//       return data
//     } else {
//       console.log(await response.text())
//       throw new Error('Failed to fetch ADN')
//     }
//   } catch (e) {
//     throw new Error(e as string)
//   }
// }

// export async function getPlayerConfigADN() {
//   const cachedData: ADNPlayerConfig | undefined = server.CacheController.get('adnplayerconfig')

//   if (cachedData) {
//     return cachedData
//   }

//   const token: any = await loginADN()

//   try {
//     const response = await fetch(`https://gw.api.animationdigitalnetwork.fr/player/video/19830/configuration`, {
//       method: 'GET',
//       headers: {
//         'x-target-distribution': 'de',
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${token.accessToken}`
//       }
//     })

//     if (response.ok) {
//       const data: ADNPlayerConfig = JSON.parse(await response.text())

//       server.CacheController.set('adnplayerconfig', data, 300)

//       return data
//     } else {
//       throw new Error('Failed to fetch ADN')
//     }
//   } catch (e) {
//     throw new Error(e as string)
//   }
// }

// async function getPlayerToken() {
//   const r = await getPlayerConfigADN()

//   try {
//     const response = await fetch(`https://gw.api.animationdigitalnetwork.fr/player/refresh/token`, {
//       method: 'POST',
//       headers: {
//         'x-target-distribution': 'de',
//         'Content-Type': 'application/json',
//         'X-Player-Refresh-Token': r.player.options.user.refreshToken
//       }
//     })

//     if (response.ok) {
//       const data: {
//         token: string
//         accessToken: string
//         refreshToken: string
//       } = JSON.parse(await response.text())

//       return data
//     } else {
//       throw new Error('Failed to fetch ADN')
//     }
//   } catch (e) {
//     throw new Error(e as string)
//   }
// }

// function randomHexaString(length: number) {
//   const characters = '0123456789abcdef'
//   let result = ''
//   for (let i = 0; i < length; i++) {
//     result += characters[Math.floor(Math.random() * characters.length)]
//   }
//   return result
// }

// async function getPlayerEncryptedToken() {
//   const token = await getPlayerToken()

//   var key = new JSEncrypt()
//   var random = randomHexaString(16)

//   key.setPublicKey(
//     '-----BEGIN PUBLIC KEY-----MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCbQrCJBRmaXM4gJidDmcpWDssgnumHinCLHAgS4buMtdH7dEGGEUfBofLzoEdt1jqcrCDT6YNhM0aFCqbLOPFtx9cg/X2G/G5bPVu8cuFM0L+ehp8s6izK1kjx3OOPH/kWzvstM5tkqgJkNyNEvHdeJl6KhS+IFEqwvZqgbBpKuwIDAQAB-----END PUBLIC KEY-----'
//   )

//   const data = {
//     k: random,
//     t: String(token.token)
//   }

//   const finisheddata = JSON.stringify(data)

//   const encryptedData = key.encrypt(finisheddata) || ''

//   return { data: encryptedData, random: random }
// }

// export async function getPlayerPlaylists(animeid: number) {
//   const token = await getPlayerEncryptedToken()

//   try {
//     const response = await fetch(`https://gw.api.animationdigitalnetwork.fr/player/video/${animeid}/link`, {
//       method: 'GET',
//       headers: {
//         'x-target-distribution': 'de',
//         'X-Player-Token': token.data
//       }
//     })

//     if (response.ok) {
//       const data: {
//         links: {
//           subtitles: {
//             all: string
//           }
//         }
//       } = await JSON.parse(await response.text())

//       const subtitlelink = await fetch(data.links.subtitles.all, {
//         method: 'GET',
//         headers: {
//           'x-target-distribution': 'de'
//         }
//       })

//       const link: {
//         location: string
//       } = await JSON.parse(await subtitlelink.text())

//       const subs = await parseSubs(link.location, token.random)

//       return subs
//     } else {
//       const data: {
//         token: string
//         accessToken: string
//         refreshToken: string
//       } = JSON.parse(await response.text())

//       return data
//     }
//   } catch (e) {
//     throw new Error(e as string)
//   }
// }

// export async function parseSubs(url: string, grant: string) {
//   const response = await fetch(url)

//   const data = await response.text()

//   var key = grant + '7fac1178830cfe0c'

//   console.log(key)

//   var parsedSubtitle = CryptoJS.enc.Base64.parse(data.substring(0, 24))
//   var sec = CryptoJS.enc.Hex.parse(key)
//   var som = data.substring(24)

//   try {
//     // Fuck You ADN
//     var decrypted: any = CryptoJS.AES.decrypt(som, sec, { iv: parsedSubtitle })
//     decrypted = decrypted.toString(CryptoJS.enc.Utf8)
//     return decrypted
//   } catch (error) {
//     console.error('Error decrypting subtitles:', error)
//     return null
//   }
// }

export async function adnyLogin(user: string, passw: string) {
    const cachedData:
      | {
          access_token: string
          refresh_token: string
          expires_in: number
          token_type: string
          scope: string
          country: string
          account_id: string
          profile_id: string
        }
      | undefined = server.CacheController.get('adntoken')
  
    if (!cachedData) {
      var { data, error } = await adnLoginFetch(user, passw)
  
      if (error) {
        messageBox(
          'error',
          ['Cancel'],
          2,
          'Failed to login',
          'Failed to login to ADN',
          (error.error as string)
        )
        return { data: null, error: error.error }
      }
  
      if (!data) {
        messageBox('error', ['Cancel'], 2, 'Failed to login', 'Failed to login to ADN', 'ADN returned null')
        return { data: null, error: 'ADN returned null' }
      }
  
      if (!data.access_token) {
        messageBox('error', ['Cancel'], 2, 'Failed to login', 'Failed to login to ADN', 'ADN returned malformed data')
        return { data: null, error: 'ADN returned malformed data' }
      }
  
      server.CacheController.set('adntoken', data, data.expires_in - 30)
  
      return { data: data, error: null }
    }
  
    return { data: cachedData, error: null }
  }
  
  async function adnLoginFetch(user: string, passw: string) {
    const headers = {
      Authorization: 'Basic dC1rZGdwMmg4YzNqdWI4Zm4wZnE6eWZMRGZNZnJZdktYaDRKWFMxTEVJMmNDcXUxdjVXYW4=',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Crunchyroll/3.46.2 Android/13 okhttp/4.12.0'
    }
  
    const body: any = {
      username: user,
      password: passw,
      grant_type: 'password',
      scope: 'offline_access',
      device_name: 'RMX2170',
      device_type: 'realme RMX2170'
    }
  
    const { data, error } = await useFetch<{
      access_token: string
      refresh_token: string
      expires_in: number
      token_type: string
      scope: string
      country: string
      account_id: string
      profile_id: string
    }>('https://beta-api.crunchyroll.com/auth/v1/token', {
      type: 'POST',
      body: new URLSearchParams(body).toString(),
      header: headers,
      credentials: 'same-origin'
    })
  
    if (error) {
      return { data: null, error: error }
    }
  
    if (!data) {
      return { data: null, error: null }
    }
  
    return { data: data, error: null }
  }
