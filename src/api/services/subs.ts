import fs from 'fs'
import { parse, stringify } from 'ass-compiler'
import { Readable } from 'stream'
import { finished } from 'stream/promises'

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
