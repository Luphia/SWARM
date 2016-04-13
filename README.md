# SWARM
Peer to Peer network

## Build Client
### prepare
```shell
npm install electron-prebuilt electron-packager electron-builder -g
```
### build
https://github.com/maxogden/electron-packager
```shell
### OSX
electron-packager ./ SWARM --platform=darwin --arch=x64 --version=0.35.4 --icon="./icon.icns" --overwrite --asar=true --out="./build"

### Windows
electron-packager ./ SWARM --platform=win32 --arch=x64 --version=0.35.4 --icon="./icon.ico" --overwrite --asar=true --out="./build"
