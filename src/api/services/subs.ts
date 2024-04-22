import fs from 'fs'
import { parse, stringify } from 'ass-compiler'
import { Readable } from 'stream'
import { finished } from 'stream/promises'
import CryptoJS from 'crypto-js'

export async function downloadCRSub(
  sub: {
    format: string
    language: string
    url: string
    isDub: boolean
  },
  dir: string
) {
  const path = `${dir}/${sub.language}${sub.isDub ? `-FORCED` : ''}.${sub.format}`

  const stream = fs.createWriteStream(path)
  const response = await fetch(sub.url)

  var parsedASS = parse(await response.text())

  // Disabling Changing ASS because still broken in vlc

  // parsedASS.info.PlayResX = "1920";
  // parsedASS.info.PlayResY = "1080";

  // for (const s of parsedASS.styles.style) {
  //     (s.Fontsize = "54"), (s.Outline = "4");
  // }

  const fixed = stringify(parsedASS)

  const readableStream = Readable.from([fixed])

  await finished(readableStream.pipe(stream))
  console.log(`Sub ${sub.language}.${sub.format} downloaded`)

  return path
}

export async function downloadADNSub(
  link: string,
  dir: string,
  secret: string
) {
  const path = `${dir}/de-DE.ass`

  const stream = fs.createWriteStream(path)
  const subURLFetch = await fetch(link)
  const subURL: {
    location: string
  } = JSON.parse(await subURLFetch.text())

  const rawSubsFetch = await fetch(subURL.location)
  const rawSubs = await rawSubsFetch.text()

  const subs = await ADNparseSub(rawSubs, secret)

  // Disabling Changing ASS because still broken in vlc

  // parsedASS.info.PlayResX = "1920";
  // parsedASS.info.PlayResY = "1080";

  // for (const s of parsedASS.styles.style) {
  //     (s.Fontsize = "54"), (s.Outline = "4");
  // }

  // const fixed = stringify(parsedASS)

  const readableStream = Readable.from([subs])

  await finished(readableStream.pipe(stream))
  console.log(`Sub downloaded`)

  return path
}

export async function ADNparseSub(raw: string, secret: string) {
  var key = secret + '7fac1178830cfe0c'

  console.log(key)

  var parsedSubtitle = CryptoJS.enc.Base64.parse(raw.substring(0, 24))
  var sec = CryptoJS.enc.Hex.parse(key)
  var som = raw.substring(24)

  try {
    // Fuck You ADN
    var decrypted: any = CryptoJS.AES.decrypt(som, sec, { iv: parsedSubtitle })
    decrypted = decrypted.toString(CryptoJS.enc.Utf8)
    return decrypted
  } catch (error) {
    console.error('Error decrypting subtitles:', error)
    return null
  }
}
