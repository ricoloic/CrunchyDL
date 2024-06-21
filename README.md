# Crunchyroll Downloader
<img align="right" width="90" height="90" src="https://github.com/stratuma/Crunchyroll-Downloader-v4.0/assets/166541445/6aba2e4a-06ac-459e-8932-62a9b9c8640e">

![Downloads](https://img.shields.io/github/downloads/stratuma/Crunchyroll-Downloader-v4.0/total?style=for-the-badge&logo=&color=a1a1a1)
![GitHub Repo stars](https://img.shields.io/github/stars/stratuma/Crunchyroll-Downloader-v4.0?style=for-the-badge&logo=&color=a1a1a1)
[![Discord](https://img.shields.io/badge/Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/rtZn4zm7m5)

![Windows](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)
![Linux](https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black)
<!---![MacOS](https://img.shields.io/badge/mac%20os-000000?style=for-the-badge&logo=apple&logoColor=white)-->

### Important: At the moment its only possible to download with L3 Widevine keys since Crunchyroll added drm to the switch endpoint. More about that [here](https://github.com/stratuma/Crunchyroll-Downloader-v4.0/discussions/23)

**A simple tool for downloading videos from Crunchyroll and ADN.**

![animation_gif](https://github.com/stratuma/Crunchyroll-Downloader-v4.0/assets/166541445/907e23d0-00ed-4fd0-b279-b44450d6f9df)

-----------------

## Supported Platforms
- Windows
- Linux
<!---- MacOS-->

## Getting Started on Windows
**Step 1:** Download the latest windows installer [here](https://github.com/stratuma/Crunchyroll-Downloader-v4.0/releases).

**Step 2:** Run the installer. The app starts automatically after install and creates a desktop shortcut.

**Thats it!** Now you can start download!

## Getting Started on Linux
**Step 1:** Download one of the latest linux builds [here](https://github.com/stratuma/Crunchyroll-Downloader-v4.0/releases).

**Step 2 for .AppImage:** Just run it, the downloader will appear!

**Step 2 for .deb:** Run the .deb file with your package manager and install it!

**Thats it!** Now you can start download!

<!---## Getting Started on MacOS
**Step 1:** Download one of the latest macos builds [here](https://github.com/stratuma/Crunchyroll-Downloader-v4.0/releases).

**Step 2:** Run the installer (dmg).

**Step 3:** Run the app.

**Thats it!** Now you can start download!-->

## Build instructions

Requires:
```
1. NodeJS v19 or newer
2. FFMPEG Binaries (for your os)
3. MP4Decrypt Binaries (for your os)
```

1. Clone the repo: `git clone https://github.com/stratuma/Crunchyroll-Downloader-v4.0.git`

2. Use PNPM to install the packages `pnpm i`

3. Go to node_modules and search for the folder jsencrypt, open the jsencrypt.js file located in bin and replace this:
```
(function webpackUniversalModuleDefinition(root, factory) {
    if(typeof exports === 'object' && typeof module === 'object')
        module.exports = factory();
    else if(typeof define === 'function' && define.amd)
        define([], factory);
    else if(typeof exports === 'object')
        exports["JSEncrypt"] = factory();
    else
        root["JSEncrypt"] = factory();
})(window, () => {

```

with this:
```
(function (root, factory) {
  if (typeof exports === 'object' && typeof module === 'object')
      module.exports = factory();
  else if (typeof define === 'function' && define.amd)
      define([], factory);
  else if (typeof exports === 'object')
      exports["JSEncrypt"] = factory();
  else
      root["JSEncrypt"] = factory();
})(typeof self !== 'undefined' ? self : this, () => {
```

4. Put the ffmpeg binaries in the ffmpeg folder and the mp4decrypt binaries in the mp4decrypt folder.

5. To run dev run `pnpm dev:electron`  when on linux or mac, for windows use `pnpm dev:electron:win`

6. To build use the command `pnpm build:electron`

Note:
To change the platform you want to build (Windows, Linux, MacOS) you have to change the const in build.js `const platform = 'WINDOWS'` on line 70
