import type { FactCardData } from '@sachmuch/ui';

/**
 * Placeholder corpus until the pipeline has a database.
 *
 * Every entry here is deliberately a DISTINGUISHED fact — a record, a
 * superlative, a first, an only, or a comparison that means something. "X won an
 * award in 1955" is not on this list, because somebody wins every year and the
 * statement carries no information. If a fact does not make a reader stop, it
 * does not belong in the feed.
 *
 * The three award facts came out of our own Wikidata aggregate template, so they
 * are the real output of the pipeline rather than invented numbers.
 */
function f(
  id: string, categoryId: number, categoryLabel: string, emoji: string,
  hook: string, body: string, sourceUrl: string, entities: [string, string][],
  corroborationCount = 1, difficulty = 3,
): FactCardData {
  return {
    id, categoryId, categorySlug: '', categoryLabel, categoryEmoji: emoji,
    hook, body, sourceUrl, publisher: 'Wikidata', licence: 'cc0',
    corroborationCount, difficulty,
    entities: entities.map(([qid, label]) => ({ qid, label })),
  };
}

export const FACTS: FactCardData[] = [
  /* ── Space: distances and the coincidence that follows from them ── */
  f('sp-eclipse', 13, 'Space', '🪐',
    'The Sun is 400 times wider than the Moon — and almost exactly 400 times farther away.',
    'The Sun’s diameter is about 1,391,000 km against the Moon’s 3,474 km, a ratio of roughly 400 to 1. The Sun also sits about 390 to 400 times farther from us. Those two numbers very nearly cancel, so the two objects appear almost the same size in our sky. That coincidence is the only reason a total solar eclipse exists at all — and it is temporary.',
    'https://en.wikipedia.org/wiki/Solar_eclipse',
    [['Q525', 'Sun'], ['Q405', 'Moon']], 2, 2),

  f('sp-moon-dist', 13, 'Space', '🪐',
    'The Moon is 384,400 km away — and drifting 3.8 cm farther every year.',
    'The mean Earth–Moon distance is 384,400 km. Laser reflectors left by the Apollo missions let that distance be measured to within millimetres, and they show the Moon receding by about 3.8 cm a year. In roughly 600 million years it will be too far away to cover the Sun completely, and total solar eclipses will stop happening.',
    'https://en.wikipedia.org/wiki/Lunar_distance',
    [['Q405', 'Moon']], 2, 2),

  f('sp-sun-dist', 13, 'Space', '🪐',
    'The Sun is 390 times farther from Earth than the Moon is.',
    'Earth sits about 149.6 million km from the Sun — a distance used as a unit in its own right, the astronomical unit. The Moon is 384,400 km away. The Sun is therefore roughly 390 times more distant. Sunlight crosses that gap in 8 minutes 20 seconds; moonlight takes about 1.3 seconds.',
    'https://en.wikipedia.org/wiki/Astronomical_unit',
    [['Q525', 'Sun'], ['Q405', 'Moon']], 2, 2),

  f('sp-sun-moon', 13, 'Space', '🪐',
    'The Moon’s distance from the Sun is almost identical to Earth’s.',
    'Because the Moon orbits Earth at only 384,400 km, and Earth orbits the Sun at 149.6 million km, the Moon is never more than about 0.26% closer or farther from the Sun than we are. Asking how far the Moon is from the Sun is, for almost every practical purpose, the same question as asking how far Earth is.',
    'https://en.wikipedia.org/wiki/Orbit_of_the_Moon',
    [['Q405', 'Moon'], ['Q525', 'Sun']], 1, 3),

  f('sp-venus', 13, 'Space', '🪐',
    'A day on Venus is longer than its year.',
    'Venus turns on its axis once every 243 Earth days but completes an orbit in 225. Its day is therefore longer than its year, and it rotates backwards relative to almost every other planet, so on Venus the Sun would rise in the west. It is the only planet in the solar system that does both.',
    'https://en.wikipedia.org/wiki/Venus',
    [['Q313', 'Venus']], 2, 2),

  f('sp-mars', 13, 'Space', '🪐',
    'India is the only country to have reached Mars orbit on its first attempt.',
    'The Mars Orbiter Mission entered orbit in September 2014. Every other agency that has reached Mars — NASA, the Soviet programme, ESA — failed at least once first. It was also built for around ₹450 crore, less than several films made about going to space, which says as much about the cost of spaceflight elsewhere as about the mission.',
    'https://en.wikipedia.org/wiki/Mars_Orbiter_Mission',
    [['Q1191963', 'Mars Orbiter Mission']], 2, 2),

  f('sp-moonwalkers', 13, 'Space', '🪐',
    'Only twelve people have ever walked on the Moon.',
    'Twelve humans walked on the lunar surface across six Apollo landings between 1969 and 1972. Nobody has been back since. More people have been to space overall — over 700 — but the surface of another world remains a list of twelve names, all of them men, all of them American, all within a single 41-month window.',
    'https://en.wikipedia.org/wiki/List_of_people_who_have_walked_on_the_Moon',
    [['Q43653', 'Apollo program']], 2, 2),

  /* ── Cricket: records, not results ── */
  f('cr-bradman', 9, 'Cricket', '🏏',
    'Bradman averaged 99.94. The next best in Test history is around 61.',
    'Don Bradman finished with a Test batting average of 99.94 across 52 matches. No other batter with a substantial career has come close — the next names sit near 61. In almost any other sport, the best performer beats the field by a few percent. Bradman beats it by more than half again, which is why the number is quoted as a statistic in its own right.',
    'https://en.wikipedia.org/wiki/Don_Bradman',
    [['Q182085', 'Don Bradman']], 2, 2),

  f('cr-sachin', 9, 'Cricket', '🏏',
    'Sachin Tendulkar is the only cricketer with 100 international centuries.',
    'Tendulkar reached 100 centuries across Tests and one-day internationals in 2012, having debuted at 16 in 1989. No other player has passed 80. The record depends on longevity as much as talent: it took 24 years of international cricket, a span in which most careers begin and end twice over.',
    'https://en.wikipedia.org/wiki/Sachin_Tendulkar',
    [['Q9488', 'Sachin Tendulkar']], 2, 2),

  /* ── Film: aggregates from our own pipeline ── */
  f('bw-rahman', 2, 'Bollywood', '🎬',
    'A. R. Rahman has won 29 Filmfare Awards, from 1993 to 2014.',
    'Twenty-nine wins across twenty-one years is not a good run, it is a different category of career. Any given year produces a winner, so a single award tells you a name and a date. A total like this tells you that a composer stayed at the top of a jury’s list while the industry, the audience and the voters all changed around him.',
    'https://en.wikipedia.org/wiki/A._R._Rahman',
    [['Q114675', 'A. R. Rahman']], 2, 3),

  f('bw-saroj', 2, 'Bollywood', '🎬',
    'Saroj Khan won 8 Filmfare Awards — for choreography, a craft most viewers never name.',
    'Saroj Khan choreographed more than 2,000 songs across four decades and took eight Filmfare awards between 1989 and 2008. Choreography is the part of a Hindi film everyone remembers and almost nobody credits: audiences can reproduce the steps from memory while being unable to name the person who devised them.',
    'https://en.wikipedia.org/wiki/Saroj_Khan',
    [['Q3473027', 'Saroj Khan']], 1, 3),

  /* ── Human body ── */
  f('hb-cells', 8, 'Human Body', '🫀',
    'Your body contains roughly 37 trillion cells — and about as many bacteria.',
    'The most careful estimate puts a reference adult at around 37 trillion human cells and a comparable number of bacterial cells, mostly in the gut. The older claim that microbes outnumber us ten to one traces to a 1972 back-of-envelope figure that was never rechecked for forty years. The real ratio is closer to one to one.',
    'https://en.wikipedia.org/wiki/Human_microbiome',
    [['Q7365', 'Human body']], 2, 3),

  f('hb-heart', 8, 'Human Body', '🫀',
    'Your heart beats about 2.5 billion times in an average lifetime.',
    'At roughly 70 beats a minute over 75 years, a human heart contracts about 2.5 billion times without a single scheduled pause. Across mammals the total is oddly consistent — a mouse at 500 beats a minute and an elephant at 30 both arrive near a billion. Humans are one of the few species that substantially exceed the pattern.',
    'https://en.wikipedia.org/wiki/Heart_rate',
    [['Q1072', 'Heart']], 1, 3),

  /* ── Animals ── */
  f('an-octopus', 14, 'Animals', '🐘',
    'An octopus has three hearts, nine brains and blue blood.',
    'Two hearts pump blood through the gills and a third serves the rest of the body — and that third one stops beating when the animal swims, which is part of why octopuses prefer to crawl. Its blood is blue because it carries oxygen on copper rather than iron, and two thirds of its neurons sit in its arms rather than its head.',
    'https://en.wikipedia.org/wiki/Octopus',
    [['Q6501221', 'Octopus']], 2, 2),

  f('an-whale', 14, 'Animals', '🐘',
    'A blue whale’s tongue weighs as much as an elephant.',
    'The blue whale is the largest animal known to have existed — larger than any dinosaur yet found — reaching 30 metres and 150 tonnes. Its tongue alone weighs around 2.7 tonnes, roughly an adult African elephant, and its heart is about the size of a small car. A newborn gains around 90 kg a day on milk alone.',
    'https://en.wikipedia.org/wiki/Blue_whale',
    [['Q42196', 'Blue whale']], 2, 1),

  /* ── Maths ── */
  f('nu-ramanujan', 28, 'Numbers', '🔢',
    'Ramanujan produced around 3,900 results — most of them without proof, and almost all correct.',
    'Working largely alone and with almost no formal training, Srinivasa Ramanujan compiled roughly 3,900 identities and equations. He rarely supplied proofs, which made the notebooks maddening for other mathematicians. A century on, the overwhelming majority have been verified, and results from his "lost notebook" were still being proved into the 2010s.',
    'https://en.wikipedia.org/wiki/Srinivasa_Ramanujan',
    [['Q83036', 'Srinivasa Ramanujan']], 2, 3),

  f('nu-kerala', 28, 'Numbers', '🔢',
    'The Kerala school found infinite series for π and sine 250 years before Newton.',
    'Madhava of Sangamagrama and his successors, working in Kerala from around 1350, derived infinite series expansions for sine, cosine and arctangent — the results later attributed to Gregory, Leibniz and Newton. The work was written in Sanskrit verse and stayed largely unknown outside the region until the nineteenth century.',
    'https://en.wikipedia.org/wiki/Kerala_school_of_astronomy_and_mathematics',
    [['Q1741776', 'Kerala school']], 1, 4),

  /* ── Geography ── */
  f('ge-antarctica', 17, 'Geography', '🗺️',
    'Antarctica is the largest desert on Earth.',
    'A desert is defined by precipitation, not temperature, and much of Antarctica receives under 50 mm a year — drier than the Sahara. At 14 million km² it is the largest desert on the planet, and its Dry Valleys have seen almost no rain for around two million years, which makes them the closest analogue to Mars available on Earth.',
    'https://en.wikipedia.org/wiki/Antarctica',
    [['Q51', 'Antarctica']], 2, 2),

  f('ge-everest', 17, 'Geography', '🗺️',
    'Everest grows about 4 mm a year, and moves north-east as it does.',
    'The Indian plate is still driving into Asia, lifting the Himalayas by roughly 4 mm annually and shifting Everest a few centimetres north-east. The 2015 Nepal earthquake dropped the summit by about 2.5 cm in a single event. A mountain height is not a fixed number but a measurement with a date attached to it.',
    'https://en.wikipedia.org/wiki/Mount_Everest',
    [['Q513', 'Mount Everest']], 2, 2),

  /* ── Finance ── */
  f('fi-bse', 1, 'Finance', '📈',
    'The Bombay Stock Exchange is the oldest stock exchange in Asia.',
    'The BSE traces its origins to brokers meeting under a banyan tree on what became Dalal Street, and was formally established in 1875 — older than the exchanges of Tokyo, Hong Kong and Shanghai, and older than most of the regulation that now governs it. India had a functioning securities market decades before it had a central bank.',
    'https://en.wikipedia.org/wiki/Bombay_Stock_Exchange',
    [['Q1055334', 'Bombay Stock Exchange']], 2, 3),

  f('fi-upi', 1, 'Finance', '📈',
    'UPI handles more real-time payments than any other system in the world.',
    'Launched in 2016, the Unified Payments Interface now processes a volume of instant retail payments with no close international comparison. The unusual part is not the technology but the ownership: it was built by a not-for-profit owned by the banks themselves, rather than a card network taking a percentage of every transaction.',
    'https://en.wikipedia.org/wiki/Unified_Payments_Interface',
    [['Q56276583', 'UPI']], 2, 3),

  /* ── World history ── */
  f('wh-angkor', 11, 'World History', '🏺',
    'Angkor Wat is the largest religious monument ever built.',
    'The temple complex covers about 162 hectares — roughly 200 football pitches — and was built in the twelfth century for the Khmer empire. Medieval Angkor may have supported around 750,000 people across its wider settlement, which would have made it the largest pre-industrial urban area in the world.',
    'https://en.wikipedia.org/wiki/Angkor_Wat',
    [['Q43473', 'Angkor Wat']], 2, 3),

  f('wh-oxford', 11, 'World History', '🏺',
    'Oxford University was already old when the Aztec empire was founded.',
    'Teaching at Oxford is documented from 1096. Tenochtitlan, the Aztec capital, was founded in 1325 — more than two centuries later. The medieval and the "ancient" rarely line up the way intuition suggests: Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.',
    'https://en.wikipedia.org/wiki/University_of_Oxford',
    [['Q34433', 'University of Oxford']], 2, 3),

  /* ── Environment ── */
  f('en-ozone', 24, 'Environment', '🌏',
    'The ozone hole is the one global environmental problem humanity has actually reversed.',
    'The Montreal Protocol of 1987 phased out CFCs, and the Antarctic ozone hole has been measurably shrinking since around 2000. It is currently projected to close entirely by the 2060s. It remains the only universally ratified UN treaty, and the only case where a planetary-scale atmospheric problem was identified, agreed on and largely fixed.',
    'https://en.wikipedia.org/wiki/Montreal_Protocol',
    [['Q170430', 'Montreal Protocol']], 2, 3),
];
