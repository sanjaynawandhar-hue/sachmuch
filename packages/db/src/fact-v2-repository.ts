import type {Sql} from 'postgres';
import {parseFactV2, type FactV2} from '@sachmuch/core';

export async function readFactV2(sql:Sql,id:string):Promise<FactV2|null> {
 return (await readFactsV2(sql,[id]))[0]??null;
}
export async function readFactsV2(sql:Sql,ids:string[]):Promise<FactV2[]> {
 if(!ids.length)return [];
 if(ids.length>50)throw Error('Fact read exceeds page limit');
 const rows = await sql`
  SELECT f.id, f.original_language, f.category_id, c.slug, c.name_en, c.emoji,
   f.source_url, f.publisher, f.licence, f.attribution_text, f.knowledge_kind,
   f.as_of, f.valid_until, f.template_id, f.quality,
   (SELECT jsonb_object_agg(t.language,jsonb_build_object('hook',t.hook,'body',t.body))
     FROM fact_texts t WHERE t.fact_id=f.id AND t.review_state='accepted') AS texts
  FROM facts f JOIN categories c ON c.id=f.category_id JOIN sources s ON s.id=f.source_id
  WHERE f.id=ANY(${ids}::uuid[]) AND f.status='live' AND c.enabled AND s.enabled
   AND (f.valid_until IS NULL OR f.valid_until > now())`;
 return rows.flatMap(r=>{
 const texts=typeof r.texts==='string'?JSON.parse(r.texts):r.texts;
 if(!texts?.[r.original_language])return [];
 return [parseFactV2({id:r.id,originalLanguage:r.original_language,texts,
  categoryId:r.category_id,categorySlug:r.slug,categoryLabel:r.name_en,categoryEmoji:r.emoji,
  sourceUrl:r.source_url,publisher:r.publisher,licence:r.licence,knowledgeKind:r.knowledge_kind,
  ...(r.attribution_text?{attributionText:r.attribution_text}:{}),
  ...(r.template_id?{templateId:r.template_id}:{}),quality:r.quality,
  ...(r.as_of?{asOf:new Date(r.as_of).toISOString()}:{}),
  ...(r.valid_until?{validUntil:new Date(r.valid_until).toISOString()}:{}),
 })];
 });
}

/** Update a canonical record created by ingestion; never invent its source or claim identity. */
export async function writeFactV2(sql:Sql,input:FactV2):Promise<void> {
 const fact=parseFactV2(input);
 await sql.begin(async tx=>{
  const rows=await tx`SELECT id,status FROM facts WHERE id=${fact.id}::uuid FOR UPDATE`;
  const row=rows[0];
  if (!row) throw Error('Canonical fact must be created by ingestion first');
  await tx`UPDATE facts SET original_language=${fact.originalLanguage},knowledge_kind=${fact.knowledgeKind},
   hook_en=${fact.texts.en?.hook??null},body_en=${fact.texts.en?.body??null},
   hook_hi=${fact.texts.hi?.hook??null},body_hi=${fact.texts.hi?.body??null},hi_missing=${!fact.texts.hi},
   source_url=${fact.sourceUrl},publisher=${fact.publisher},licence=${fact.licence},
   attribution_text=${fact.attributionText??null},as_of=${fact.asOf??null},valid_until=${fact.validUntil??null}
   WHERE id=${fact.id}::uuid`;
  await tx`DELETE FROM fact_texts WHERE fact_id=${fact.id}::uuid`;
  for (const language of ['en','hi'] as const) {
   const text=fact.texts[language];
   if (text) await tx`INSERT INTO fact_texts(fact_id,language,hook,body,review_state)
    VALUES(${fact.id},${language},${text.hook},${text.body},${row.status==='live'?'accepted':'pending'})`;
  }
 });
}
