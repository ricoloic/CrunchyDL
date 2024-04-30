// eslint-disable-next-line @typescript-eslint/no-var-requires
const builder = require('electron-builder')
const Platform = builder.Platform

/**
 * @type {import('electron-builder').Configuration}
 */
const options = {
  appId: 'com.stratum.crunchyrolldownloader',
  productName: 'Crunchyroll Downloader',

  compression: 'maximum',
  removePackageScripts: true,

  nodeGypRebuild: true,
  buildDependenciesFromSource: true,

  publish: {
    provider: 'github',
    releaseType: 'release'
  },

  directories: {
    output: 'crunchyroll-downloader-output-${version}'
  },

  win: {
    artifactName: 'crunchyroll-downloader-${version}-windows-installer.${ext}',
    icon: 'public/favicon.ico',
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'ia32']
      }
    ]
  },
  nsis: {
    deleteAppDataOnUninstall: true
  },
  mac: {
    category: 'public.app-category.entertainment',
    hardenedRuntime: false,
    gatekeeperAssess: false,
    target: [
      {
        target: 'default',
        arch: ['x64', 'arm64']
      }
    ]
  },
  linux: {
    maintainer: 'Stratum',
    desktop: {
      StartupNotify: 'false',
      Encoding: 'UTF-8',
      MimeType: 'x-scheme-handler/deeplink'
    },
    target: ['AppImage', 'rpm', 'deb']
  }
}

const platform = 'WINDOWS'
builder
  .build({
    targets: Platform[platform].createTarget(),
    config: options
  })
  .then((result) => {
    console.log('----------------------------')
    console.log('Platform:', platform)
    console.log('Output:', JSON.stringify(result, null, 2))
  })
