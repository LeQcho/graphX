'use strict';
const fs=require('node:fs');const path=require('node:path');const {validateProject,createProject}=require('./model.cjs');
class Storage{
 constructor(dir){this.dir=dir;fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(path.join(dir,'media'),{recursive:true});this.file=path.join(dir,'project.json');this.recovered=false;}
 load(){for(const name of [this.file,this.file+'.bak']){try{const p=validateProject(JSON.parse(fs.readFileSync(name,'utf8')));this.recovered=name.endsWith('.bak');return p;}catch(e){if(e.code!=='ENOENT')this.recovered=true;}}return createProject();}
 save(project){const content=JSON.stringify(validateProject(project),null,2);const tmp=this.file+'.tmp';fs.writeFileSync(tmp,content,{mode:0o600});if(fs.existsSync(this.file)){try{validateProject(JSON.parse(fs.readFileSync(this.file,'utf8')));fs.copyFileSync(this.file,this.file+'.bak');}catch{}}fs.renameSync(tmp,this.file);}
 async saveAsync(project){
  const content=JSON.stringify(validateProject(project),null,2),tmp=this.file+'.tmp';
  await fs.promises.writeFile(tmp,content,{mode:0o600});
  try{validateProject(JSON.parse(await fs.promises.readFile(this.file,'utf8')));await fs.promises.copyFile(this.file,this.file+'.bak');}catch{}
  await fs.promises.rename(tmp,this.file);
  if(!this.lastSnapshot||Date.now()-this.lastSnapshot>60000){const dir=path.join(this.dir,'backups');await fs.promises.mkdir(dir,{recursive:true});await fs.promises.writeFile(path.join(dir,new Date().toISOString().replace(/[:.]/g,'-')+'.json'),content,{mode:0o600});this.lastSnapshot=Date.now();const names=(await fs.promises.readdir(dir)).filter(n=>n.endsWith('.json')).sort();for(const name of names.slice(0,-30))await fs.promises.unlink(path.join(dir,name));}
 }
}
module.exports={Storage};
