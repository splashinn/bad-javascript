import { builtinModules } from 'module'
import { extname } from 'path'
import https from 'https'

const JS_MEDIA_TYPE = 'text/javascript'
const dataToFileURLMap = new Map
const extToMediaTypeMap = new Map([
  ['.js', JS_MEDIA_TYPE],
  ['.json', 'application/json'],
  ['.mjs', JS_MEDIA_TYPE],
  ['.wasm', 'application/wasm']
])

const get = (options) => {
  return new Promise((resolve, reject) => {
    https
      .get(options, (response) => {
        const { statusCode } = response

        if (statusCode === 200) {
          let body = ''

          response
            .setEncoding('utf8')
            .on('data', (chunk) => { body += chunk })
            .on('end', () => { resolve(body) })
        } else {
          reject(new Error(`Request failed. Status code: ${statusCode}`))
        }
      })
      .on('error', reject)
  })
}

export async function resolve(specifier, parentModuleURL, defaultResolver) {
  if (! builtinModules.includes(specifier)) {
    parentModuleURL = dataToFileURLMap.get(parentModuleURL) || parentModuleURL

    try {
      const url = new URL(specifier, parentModuleURL)

      if (url.protocol === 'https:') {
        const body = await get(url)
        const encoded = Buffer.from(body).toString('base64')
        const mediaType = extToMediaTypeMap.get(extname(url.pathname)) || JS_MEDIA_TYPE

        specifier = `data:${mediaType};base64,${encoded}`
        dataToFileURLMap.set(specifier, url.href)
      }
    } catch {}
  }

  return defaultResolver(specifier, parentModuleURL)
}
