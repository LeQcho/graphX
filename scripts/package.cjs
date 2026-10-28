'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),release=path.join(root,'release'),dest=path.join(release,'graphX.app');
const source=path.join(root,'build/electron/Electron.app');if(!fs.existsSync(source))throw Error('Runtime Electron absent de build/electron.');if(!fs.existsSync(path.join(root,'build/graphx-output')))throw Error('Compiler le moteur natif avant de créer le paquet.');
fs.mkdirSync(release,{recursive:true});if(fs.existsSync(dest))fs.renameSync(dest,path.join(release,'graphX-previous-'+Date.now()+'.app'));
fs.cpSync(source,dest,{recursive:true,verbatimSymlinks:true});const contents=path.join(dest,'Contents'),res=path.join(contents,'Resources');
fs.rmSync(path.join(res,'default_app.asar'),{force:true});const appDir=path.join(res,'app');fs.mkdirSync(appDir,{recursive:true});
for(const name of ['app','web','examples','docs'])fs.cpSync(path.join(root,name),path.join(appDir,name),{recursive:true});
fs.rmSync(path.join(appDir,'app/qa.cjs'),{force:true});for(const name of ['package.json','README.md','THIRD-PARTY-NOTICES.md'])fs.copyFileSync(path.join(root,name),path.join(appDir,name));
fs.mkdirSync(path.join(res,'bin'),{recursive:true});fs.copyFileSync(path.join(root,'build/graphx-output'),path.join(res,'bin/graphx-output'));fs.chmodSync(path.join(res,'bin/graphx-output'),0o755);
fs.copyFileSync(path.join(root,'build/electron/LICENSE'),path.join(res,'LICENSE.electron.txt'));fs.copyFileSync(path.join(root,'build/electron/LICENSES.chromium.html'),path.join(res,'LICENSES.chromium.html'));
fs.copyFileSync(path.join(root,'build/GraphX.icns'),path.join(res,'electron.icns'));
const plist=path.join(contents,'Info.plist');for(const [key,value]of Object.entries({CFBundleName:'graphX',CFBundleDisplayName:'graphX',CFBundleIdentifier:'ch.graphx.engine',CFBundleShortVersionString:'0.1.0',CFBundleVersion:'1',CFBundleExecutable:'graphX'})){try{execFileSync('/usr/libexec/PlistBuddy',['-c',`Set :${key} ${value}`,plist]);}catch{execFileSync('/usr/libexec/PlistBuddy',['-c',`Add :${key} string ${value}`,plist]);}}
fs.renameSync(path.join(contents,'MacOS/Electron'),path.join(contents,'MacOS/graphX'));
const entitlements=path.join(root,'build/entitlements.plist');fs.writeFileSync(entitlements,'<?xml version="1.0"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>com.apple.security.cs.allow-jit</key><true/></dict></plist>');
execFileSync('/usr/bin/codesign',['--force','--deep','--sign','-','--entitlements',entitlements,dest],{stdio:'inherit'});execFileSync('/usr/bin/codesign',['--verify','--deep','--strict',dest],{stdio:'inherit'});
fs.cpSync(path.join(root,'examples'),path.join(release,'Exemples'),{recursive:true});fs.copyFileSync(path.join(root,'docs/PREMIER-ESSAI.md'),path.join(release,'LIRE-MOI.md'));
console.log(dest);
