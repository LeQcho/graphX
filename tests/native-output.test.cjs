'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
test('native Blackmagic negotiation and YUVA pixel contract',{skip:process.platform!=='darwin'},()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'graphx-native-test-'));
 try{
  const binary=path.join(dir,'native-test');
  execFileSync('clang++',['-std=c++17','-O2',path.join(__dirname,'native-output.cpp'),'-framework','CoreFoundation','-o',binary]);
  assert.match(execFileSync(binary,{encoding:'utf8'}),/alignment: OK/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
