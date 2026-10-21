import {createHash} from 'node:crypto';
import type {CanonicalClaim} from '@sachmuch/templates';
const UNITS:Record<string,[string,number]>={
 '1':['1',0],m:['m',0],metre:['m',0],meter:['m',0],km:['m',3],cm:['m',-2],mm:['m',-3],
 g:['g',0],kg:['g',3],mg:['g',-3],s:['s',0],ms:['s',-3],
};
function text(value:string):string {
 if(typeof value!=='string'||!value.trim()||value.length>2000) throw Error('Invalid claim value');
 return value.normalize('NFC').trim().replace(/\s+/g,' ');
}
function entity(value:string):string {
 const v=text(value);
 const m=v.match(/^(?:https?:\/\/(?:www\.)?wikidata\.org\/entity\/|wd:)?([QP]\d+)$/i);
 return m?m[1]!.toUpperCase():v;
}
function date(value:string):string {
 const v=text(value);
 if (/^\d{4}$/.test(v)) return v;
 if (/^\d{4}-\d{2}$/.test(v) && Number(v.slice(5))>=1 && Number(v.slice(5))<=12) return v;
 if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
  const d=new Date(v);
  if(Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v) return v;
 }
 throw Error('Unsupported claim date');
}
/** Decimal arithmetic uses digits, not floating point: close measurements remain distinct. */
function quantity(value:string,power:number):string {
 const v=text(value);
 const m=v.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
 if(!m||v.length>128) throw Error('Unsupported quantity');
 const fraction=m[3]??'';
 let digits=(m[2]!+fraction).replace(/^0+/,'')||'0';
 let scale=fraction.length-power;
 if(scale<0){digits+='0'.repeat(-scale);scale=0;}
 if(scale>0) digits=digits.padStart(scale+1,'0');
 const whole=scale?digits.slice(0,-scale):digits;
 const decimal=scale?digits.slice(-scale).replace(/0+$/,''):'';
 const result=whole+(decimal?'.'+decimal:'');
 return m[1]==='-' && /[1-9]/.test(result)?'-'+result:result;
}
export function canonicalClaimKey(claim:CanonicalClaim):string {
 let object:CanonicalClaim['object'];
 switch(claim.object.kind){
  case 'entity': object={kind:'entity',value:entity(claim.object.value)};break;
  case 'text': object={kind:'text',value:text(claim.object.value)};break;
  case 'date': object={kind:'date',value:date(claim.object.value)};break;
  case 'quantity': {
   const conversion=UNITS[claim.object.unit??''];
   if(!conversion) throw Error('Unsupported quantity unit; review required');
   object={kind:'quantity',value:quantity(claim.object.value,conversion[1]),unit:conversion[0]};break;
  }
  default: throw Error('Unsupported claim object');
 }
 const qualifiers=Object.fromEntries(Object.entries(claim.qualifiers).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[text(k),text(v)]));
 const canonical={subject:entity(claim.subject),predicate:entity(claim.predicate),object,qualifiers,...(claim.timeScope?{timeScope:date(claim.timeScope)}:{})};
 return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}
