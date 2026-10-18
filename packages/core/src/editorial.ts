import type { BilingualMobileFact } from './mobile-feed';

export function isDiscoveryFact(fact: { categorySlug: string }): boolean {
  return !/bollywood|hollywood|cinema|movie|film|actors-actresses/.test(fact.categorySlug);
}
/** One card per available topic per round, preserving ranking within each topic. */
export function balanceTopics<T extends { categoryId: number }>(facts: T[]): T[] {
  const groups = new Map<number, T[]>();
  for (const fact of facts) groups.set(fact.categoryId, [...(groups.get(fact.categoryId) ?? []), fact]);
  const result: T[] = [];
  while (groups.size) for (const [category, queue] of groups) {
    result.push(queue.shift()!);
    if (!queue.length) groups.delete(category);
  }
  return result;
}

// Original concise explanations, checked against the linked primary sources on 2026-10-18.
// Source metadata stays in the data for editorial verification, even when cards hide it.
const entries: [number, string, string, string, string, string, string, string, string][] = [
 [13,'space-astronomy','Space','अंतरिक्ष','A year before one full spin','Venus completes an orbit in about 225 Earth days, but takes about 243 Earth days to rotate once. A sunrise-to-sunrise day is different: about 117 Earth days.','एक चक्कर से पहले पूरा साल','शुक्र सूर्य की परिक्रमा लगभग 225 पृथ्वी दिनों में करता है, लेकिन अपनी धुरी पर एक बार घूमने में लगभग 243 दिन लगाता है। वहाँ एक सूर्योदय से अगले सूर्योदय तक लगभग 117 पृथ्वी दिन होते हैं।','https://science.nasa.gov/venus/venus-facts/'],
 [14,'animals-wildlife','Animals','जानवर','An octopus has three hearts','Two hearts move blood through the gills to collect oxygen. A third pumps that oxygen-rich blood around the rest of the body.','ऑक्टोपस के तीन दिल होते हैं','दो दिल खून को गलफड़ों तक पहुँचाते हैं, जहाँ उसे ऑक्सीजन मिलती है। तीसरा दिल ऑक्सीजन वाला खून बाकी शरीर में भेजता है।','https://oceanservice.noaa.gov/news/feb26/undersea-creatures-valentines-day.html'],
 [16,'technology-internet','Inventions','आविष्कार','A sticky seed inspired a fastener','Burrs clinging to clothes and a dog’s fur led George de Mestral to inspect their tiny hooks. That natural hook-and-loop mechanism inspired Velcro.','चिपकते बीज से बना एक आविष्कार','कपड़ों और कुत्ते के बालों में फँसे काँटेदार बीज देखकर जॉर्ज डी मेस्ट्रल ने उनके छोटे हुकों को जाँचा। इसी प्राकृतिक हुक और फंदे की बनावट से वेल्क्रो का विचार आया।','https://invention.si.edu/invention-stories/george-de-mestral-velcror-inventor?wpmobileexternal=true'],
 [15,'physics-chemistry','Everyday science','रोज़मर्रा का विज्ञान','Popcorn is a tiny pressure cooker','Water trapped inside a kernel turns to steam as it heats. Pressure builds until the shell bursts, letting the softened starch expand into fluffy popcorn.','पॉपकॉर्न एक छोटा प्रेशर कुकर है','मक्के के दाने में मौजूद पानी गर्म होकर भाप बनता है। दबाव बढ़ने पर उसका खोल फट जाता है और नरम स्टार्च फैलकर फूला हुआ पॉपकॉर्न बन जाता है।','https://www.popcorn.org/All-About-Popcorn/What-Makes-Popcorn-Pop/trk/article-ssr-frontend-pulse_little-text-block'],
 [13,'space-astronomy','Space','अंतरिक्ष','Mars has blue sunsets','Near sunset, fine dust in the Martian atmosphere creates a blue glow around the Sun. NASA’s rovers have photographed this surprising reversal of familiar Earth colours.','मंगल पर सूर्यास्त नीला दिखता है','मंगल के वायुमंडल की बारीक धूल सूर्यास्त के समय सूर्य के आसपास नीली चमक बनाती है। नासा के रोवर इसकी तस्वीरें ले चुके हैं।','https://science.nasa.gov/solar-system/planets/mars/what-does-a-sunrise-sunset-look-like-on-mars/'],
 [14,'animals-wildlife','Animals','जानवर','Sharks came before trees','The shark lineage is older than trees—and much older than dinosaurs. The sharks alive today belong to a group with a remarkably long evolutionary history.','पेड़ों से भी पुराना है शार्क का वंश','शार्क का वंश पेड़ों से भी पहले का है और डायनासोर से बहुत पुराना है। आज की शार्क एक ऐसे समूह का हिस्सा हैं जिसका विकास का इतिहास बेहद लंबा है।','https://sanctuaries.noaa.gov/education/teachers/sharks/background.html'],
 [16,'technology-internet','Inventions','आविष्कार','Velcro’s name hides two French words','The name combines velours, meaning velvet, and crochet, meaning hook. Those words describe the two cooperating surfaces of the fastener.','वेल्क्रो के नाम में दो फ़्रेंच शब्द हैं','वेल्क्रो नाम फ़्रेंच के वेलूर यानी मखमल और क्रोशे यानी हुक से बना है। ये शब्द उसकी आपस में जुड़ने वाली दो सतहों का वर्णन करते हैं।','https://invention.si.edu/invention-stories/george-de-mestral-velcror-inventor?wpmobileexternal=true'],
 [15,'physics-chemistry','Food science','खाने का विज्ञान','One kernel can become a giant puff','A popcorn kernel can expand to around 40–50 times its original size when it pops. Most of that dramatic transformation comes from the starch expanding as pressure is released.','एक दाना कई गुना फूल सकता है','पॉपकॉर्न का दाना फूटने पर अपने मूल आकार से लगभग 40–50 गुना तक फैल सकता है। दबाव निकलने पर स्टार्च का फैलना इस बदलाव की मुख्य वजह है।','https://www.popcorn.org/All-About-Popcorn/What-Makes-Popcorn-Pop/trk/article-ssr-frontend-pulse_little-text-block'],
];
export const editorialFacts: BilingualMobileFact[] = entries.map(([categoryId,categorySlug,categoryLabel,hiLabel,hook,body,hiHook,hiBody,sourceUrl],index) => {
 const publisher = sourceUrl.includes('nasa') ? 'NASA' : sourceUrl.includes('noaa') ? 'NOAA' : sourceUrl.includes('si.edu') ? 'Smithsonian' : 'The Popcorn Board';
 const en = {id:`00002026-1018-4000-8000-${String(index+1).padStart(12,'0')}`,categoryId,categorySlug,categoryLabel,categoryEmoji:({13:'🪐',14:'🐙',15:'✨',16:'💡'} as Record<number,string>)[categoryId]!,hook,body,sourceUrl,publisher,licence:'cc0' as const,corroborationCount:1,difficulty:1,entities:[],quality:0.9,templateId:`editorial-${index+1}`};
 return {en,hi:{...en,categoryLabel:hiLabel,hook:hiHook,body:hiBody}};
});
