const aliases={nom:'title',name:'title',title:'title',titre:'title',fonction:'subtitle',function:'subtitle',subtitle:'subtitle','sous-titre':'subtitle',label:'label',libelle:'label',group:'group',groupe:'group',notes:'notes',note:'notes',type:'type',skip:'skip',ignorer:'skip'};
export function parseCSV(source){
 if(source.length>1024*1024)throw Error('CSV limité à 1 Mo.');source=source.replace(/^\uFEFF/,'');
 const header=source.split(/\r?\n/,1)[0],delimiter=(header.match(/;/g)||[]).length>(header.match(/,/g)||[]).length?';':',';
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<source.length;i++){const ch=source[i];if(ch==='"'){if(quoted&&source[i+1]==='"'){cell+='"';i++;}else if(quoted||!cell)quoted=!quoted;else throw Error('Guillemet inattendu dans le CSV.');}else if(ch===delimiter&&!quoted){row.push(cell);cell='';}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&source[i+1]==='\n')i++;row.push(cell);if(row.some(c=>c.trim()))rows.push(row);row=[];cell='';}else cell+=ch;}
 if(quoted)throw Error('Guillemets non fermés dans le CSV.');row.push(cell);if(row.some(c=>c.trim()))rows.push(row);
 if(rows.length<2)throw Error('Ajoute une ligne d’en-tête et au moins un intervenant.');
 const fields=rows.shift().map(h=>aliases[h.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')]);
 if(!fields.includes('title'))throw Error('Colonne « nom », « titre » ou « title » requise.');
 const defined=fields.filter(Boolean);if(new Set(defined).size!==defined.length)throw Error('Deux colonnes désignent le même champ.');
 if(rows.length>250)throw Error('250 lignes maximum.');
 return rows.map((values,i)=>{if(values.length!==fields.length)throw Error(`Ligne ${i+2} : nombre de colonnes incorrect.`);const cue={type:'lowerthird'};fields.forEach((key,j)=>{if(key)cue[key]=values[j].trim();});if(!cue.title)throw Error(`Ligne ${i+2} : nom vide.`);if(!['lowerthird','title','ticker','logo','timer','score','fullscreen','note'].includes(cue.type))throw Error(`Ligne ${i+2} : type inconnu.`);cue.label=cue.label||cue.title;cue.skip=['1','true','oui','yes'].includes(String(cue.skip).toLowerCase());return cue;});
}
