'use strict';
const fs=require('node:fs');const path=require('node:path');const {validateProject,createProject}=require('./model.cjs');
class Storage{
 constructor(dir){this.dir=dir;fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(path.join(dir,'media'),{recursive:true});this.file=path.join(dir,'project.json');this.recovered=false;}
 load(){for(const name of [this.file,this.file+'.bak']){try{const p=validateProject(JSON.parse(fs.readFileSync(name,'utf8')));this.recovered=name.endsWith('.bak');return p;}catch(e){if(e.code!=='ENOENT')this.recovered=true;}}return createProject();}
 save(project){const content=JSON.stringify(validateProject(project),null,2);const tmp=this.file+'.tmp';fs.writeFileSync(tmp,content,{mode:0o600});if(fs.existsSync(this.file)){try{validateProject(JSON.parse(fs.readFileSync(this.file,'utf8')));fs.copyFileSync(this.file,this.file+'.bak');}catch{}}fs.renameSync(tmp,this.file);}
}
module.exports={Storage};
