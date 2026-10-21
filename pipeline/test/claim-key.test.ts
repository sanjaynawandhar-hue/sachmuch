import {it,expect} from 'vitest';
import {canonicalClaimKey} from '../src/gate/claim-key';
import type {CanonicalClaim} from '@sachmuch/templates';
const base:CanonicalClaim={subject:'Q313',predicate:'P2048',object:{kind:'quantity',value:'1000',unit:'m'},qualifiers:{datum:'sea level',method:'survey'},timeScope:'2020-01-01'};
it('normalizes units, entity URIs and qualifier order across sources',()=>{
 const key=canonicalClaimKey(base);
 expect(key).toMatch(/^[a-f0-9]{64}$/);
 expect(canonicalClaimKey({...base,subject:'https://www.wikidata.org/entity/Q313',object:{kind:'quantity',value:'1.000',unit:'km'},qualifiers:{method:'survey',datum:'sea level'}})).toBe(key);
});
it('keeps distinct claims and historical observations separate',()=>{
 expect(canonicalClaimKey({...base,object:{...base.object,value:'1001'}})).not.toBe(canonicalClaimKey(base));
 expect(canonicalClaimKey({...base,timeScope:'2021-01-01'})).not.toBe(canonicalClaimKey(base));
 expect(canonicalClaimKey({...base,subject:'Q314'})).not.toBe(canonicalClaimKey(base));
});
it('does not round distinct precise decimal quantities together',()=>{
 expect(canonicalClaimKey({...base,object:{...base.object,value:'1000.00000000000001'}})).not.toBe(canonicalClaimKey(base));
});
it.each(['parsecs-ish','guess',''])('rejects unsupported units rather than guessing %s',unit=>{
 expect(()=>canonicalClaimKey({...base,object:{...base.object,unit}})).toThrow();
});
it('normalizes date precision without inventing missing month/day',()=>{
 const claim={...base,object:{kind:'date' as const,value:'2020-01-01'}};
 expect(canonicalClaimKey(claim)).not.toBe(canonicalClaimKey({...claim,object:{kind:'date',value:'2020'}}));
 expect(()=>canonicalClaimKey({...claim,object:{kind:'date',value:'2020-02-30'}})).toThrow();
});
it('rejects inherited object properties as unit names',()=>{
 for(const unit of ['toString','constructor','__proto__'])
  expect(()=>canonicalClaimKey({...base,object:{...base.object,unit}})).toThrow('Unsupported quantity unit');
});
it('sorts qualifiers after normalizing their keys',()=>{
 expect(canonicalClaimKey({...base,qualifiers:{' z':'last',a:'first'}})).toBe(canonicalClaimKey({...base,qualifiers:{a:'first',z:'last'}}));
});
it('rejects ambiguous qualifiers that normalize to the same key',()=>{
 expect(()=>canonicalClaimKey({...base,qualifiers:{a:'one',' a ':'two'}})).toThrow('Duplicate qualifier');
});
