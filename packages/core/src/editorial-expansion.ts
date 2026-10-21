import type { BilingualMobileFact } from './mobile-feed';

// Original English summaries checked against the linked sources on 2026-10-21.
// IDs are append-only; never regenerate existing IDs when editing the text.
const groups: [number,string,string,string,string,[string,string][]][] = [
  [
    13,
    "space-astronomy",
    "Space",
    "NASA",
    "https://science.nasa.gov/mercury/facts/",
    [
      [
        "A sunrise with an encore",
        "From some places on Mercury, the Sun appears to rise, briefly retreat, and rise again because of the planet’s unusual orbital motion."
      ],
      [
        "Mercury gets freezing nights",
        "Mercury can reach about 430°C by day and fall to roughly −180°C at night. Being close to the Sun does not guarantee warm nights."
      ],
      [
        "A birthday every 88 days",
        "Mercury completes an orbit in just 88 Earth days, giving it the shortest year of any planet in our solar system."
      ],
      [
        "A much bigger Sun in the sky",
        "Seen from Mercury, the Sun would look more than three times as wide as it does from Earth. Sunlight can be seven times brighter."
      ]
    ]
  ],
  [
    13,
    "space-astronomy",
    "Space",
    "NASA",
    "https://science.nasa.gov/venus/venus-facts/",
    [
      [
        "Venus could melt lead",
        "Venus has a surface temperature around 467°C. Its thick atmosphere traps enough heat to make it our solar system’s hottest planet."
      ],
      [
        "Crushing weather on Venus",
        "Atmospheric pressure at Venus’s surface is about 93 times Earth’s sea-level pressure. Its calm-looking cloud cover hides an extreme environment."
      ],
      [
        "Venus turns the other way",
        "Venus rotates in the opposite direction from most planets. Our familiar direction of sunrise is not a universal rule."
      ],
      [
        "A planetary map celebrating women",
        "Most named surface features on Venus honour women. The planet itself takes its name from the Roman goddess of love and beauty."
      ]
    ]
  ],
  [
    13,
    "space-astronomy",
    "Space",
    "NASA",
    "https://science.nasa.gov/mars/facts/",
    [
      [
        "Mars is rusty",
        "Iron minerals in Martian soil oxidize, giving the planet its reddish appearance. The Red Planet’s famous colour is connected to rust."
      ],
      [
        "A Martian year takes patience",
        "One trip around the Sun takes Mars about 687 Earth days. Birthdays would be much farther apart on a Martian calendar."
      ],
      [
        "Mars has seasons too",
        "Mars has a tilted axis and distinct seasons. Its elliptical orbit makes those seasons unequal in length."
      ],
      [
        "Sunlight takes longer to reach Mars",
        "At Mars’s average distance, sunlight needs about 13 minutes to arrive. Even light has a journey across the solar system."
      ]
    ]
  ],
  [
    13,
    "space-astronomy",
    "Space",
    "NASA",
    "https://science.nasa.gov/jupiter/jupiter-facts/",
    [
      [
        "Jupiter spins through its days",
        "Jupiter turns once in about 9.9 hours, faster than any other planet in our solar system despite being the largest."
      ],
      [
        "A storm larger than Earth",
        "Jupiter’s Great Red Spot is a huge atmospheric storm. It has persisted for hundreds of years and is larger than Earth."
      ],
      [
        "Jupiter wears moving stripes",
        "Jupiter’s dark belts and pale zones are atmospheric bands. Neighbouring bands flow in opposite directions."
      ],
      [
        "A planet eleven Earths wide",
        "Jupiter’s diameter is roughly eleven times Earth’s. NASA compares their relative widths to a basketball and a grape."
      ]
    ]
  ],
  [
    14,
    "animals-wildlife",
    "Animals",
    "Smithsonian",
    "https://nationalzoo.si.edu/animals/giant-panda",
    [
      [
        "Pandas have a bonus grip",
        "A panda’s apparent extra thumb is an enlarged wrist bone. It helps the bear hold bamboo while eating."
      ],
      [
        "The bamboo marathon",
        "Giant pandas can spend 10–16 hours a day finding and eating food. Their digestive system is poorly suited to extracting nutrients from bamboo."
      ],
      [
        "A tiny beginning for a giant panda",
        "A newborn panda weighs only about 85–140 grams. It arrives blind, pink and almost hairless."
      ],
      [
        "Pandas leave scent messages",
        "Giant pandas rub scent marks onto trees and rocks. These chemical messages help them communicate in dense forests."
      ],
      [
        "Panda naps can be messy",
        "A resting giant panda can keep producing droppings. Researchers can use the pile to help estimate how long it stayed there."
      ],
      [
        "Baby pandas wait weeks to see",
        "Panda cubs usually open their eyes at six to eight weeks old. Their first weeks depend heavily on their mother."
      ]
    ]
  ],
  [
    14,
    "animals-wildlife",
    "Animals",
    "Smithsonian",
    "https://nationalzoo.si.edu/animals/asian-elephant",
    [
      [
        "An elephant walks on tiptoe",
        "Elephants walk on their toes, supported by thick pads beneath their feet. The pads cushion the enormous load with each step."
      ],
      [
        "A trunk has no bones",
        "An elephant’s trunk combines its nose and upper lip. Muscles give this boneless tool both strength and delicate control."
      ],
      [
        "Elephant ears help cool the body",
        "Elephant ears contain many blood vessels. Flapping them helps release heat as blood circulates through the ears."
      ],
      [
        "Teeth on a conveyor belt",
        "Elephant chewing teeth move forward as they wear out and are replaced. Their replacement pattern differs from our up-and-down tooth changes."
      ],
      [
        "An elephant’s quiet long-distance call",
        "Elephants communicate with very low-pitched rumbles. Some are barely audible to humans but can carry messages to distant elephants."
      ],
      [
        "Asian elephants have a trunk finger",
        "An Asian elephant has one finger-like projection at its trunk tip. It helps with precise handling of food and other objects."
      ]
    ]
  ],
  [
    14,
    "animals-wildlife",
    "Animals",
    "Smithsonian",
    "https://nationalzoo.si.edu/animals/komodo-dragon",
    [
      [
        "A real dragon is a lizard",
        "Komodo dragons are the largest living lizards. Their name sounds mythical, but these animals live on Indonesian islands."
      ],
      [
        "A dragon smells with its tongue",
        "A Komodo dragon samples airborne chemicals with its forked tongue, then brings them to sensory organs in its mouth."
      ],
      [
        "A dragon-sized dinner",
        "A Komodo dragon can eat a meal weighing up to about 80% of its own body weight. Its expandable stomach helps accommodate it."
      ],
      [
        "The emergency dragon escape plan",
        "A threatened Komodo dragon can vomit up its meal to become lighter. Losing dinner may help it get away."
      ],
      [
        "Young dragons use a disgusting disguise",
        "Young Komodo dragons sometimes roll in faeces. The smell can help discourage larger dragons that might otherwise eat them."
      ],
      [
        "Komodo wrestling is real",
        "Male Komodo dragons compete by rising up and grappling with their forelimbs. Their tails help support them during these contests."
      ]
    ]
  ],
  [
    14,
    "animals-wildlife",
    "Ocean life",
    "NOAA",
    "https://oceanservice.noaa.gov/facts/coral.html",
    [
      [
        "Corals belong to the animal kingdom",
        "Corals may look like underwater plants, but they are animals. Tiny tentacles help them capture food from the water."
      ],
      [
        "A coral can be a whole community",
        "Many coral structures consist of hundreds or thousands of small animals called polyps. What looks like one organism can be a colony."
      ],
      [
        "Tiny animals build limestone homes",
        "Hard coral polyps produce calcium-carbonate skeletons. Generations of growth gradually build the limestone framework of a reef."
      ],
      [
        "Corals have microscopic housemates",
        "Many corals host algae inside their tissues. The algae receive shelter and supply the coral with products of photosynthesis."
      ],
      [
        "White coral is not always dead",
        "Bleaching happens when coral loses its resident algae. A bleached coral is stressed, but it may survive and recover."
      ]
    ]
  ],
  [
    14,
    "animals-wildlife",
    "Ocean life",
    "NOAA",
    "https://oceanservice.noaa.gov/facts/seahorse.html",
    [
      [
        "Seahorse dads carry the babies",
        "Female seahorses transfer eggs into a male’s brood pouch. The male carries the developing young and gives birth."
      ],
      [
        "Seahorses can change their colours",
        "Special cells called chromatophores help seahorses change colour. This helps them blend into their surroundings."
      ],
      [
        "Seahorse courtship takes its time",
        "Seahorses perform elaborate courtship dances that can continue for hours or days before eggs enter the male’s pouch."
      ],
      [
        "Tiny seahorses start independently",
        "After birth, young seahorses must fend for themselves. They leave the male’s pouch already shaped like miniature seahorses."
      ]
    ]
  ],
  [
    15,
    "physics-chemistry",
    "Water & colours",
    "NOAA",
    "https://oceanservice.noaa.gov/facts/oceanblue.html",
    [
      [
        "The ocean filters sunlight",
        "Water absorbs more of the red part of sunlight, leaving blue more visible. The sea’s colour is not simply a reflection of the sky."
      ],
      [
        "The deep ocean loses daylight",
        "Sunlight becomes scarce below about 200 metres and does not reach beyond roughly 1,000 metres. Most ocean water lies in darkness."
      ]
    ]
  ],
  [
    15,
    "physics-chemistry",
    "Water",
    "NOAA",
    "https://oceanservice.noaa.gov/facts/whysalty.html",
    [
      [
        "Ocean salt has a rocky origin",
        "Rain slowly weathers rocks on land. Rivers carry dissolved ions toward the sea, contributing to its saltiness."
      ],
      [
        "Seawater carries a salty fraction",
        "Dissolved salts account for about 3.5% of average seawater’s weight. Actual saltiness varies with conditions such as rainfall and evaporation."
      ]
    ]
  ],
  [
    15,
    "physics-chemistry",
    "Water & sound",
    "NOAA",
    "https://oceanservice.noaa.gov/facts/sound.html",
    [
      [
        "Sound speeds up underwater",
        "Sound travels at roughly 1,500 metres per second in seawater, compared with about 340 in air. Conditions change the exact speeds."
      ],
      [
        "The ocean has a sound channel",
        "Changes in temperature and pressure can bend sound waves into a channel. It can carry underwater sounds over thousands of kilometres."
      ]
    ]
  ],
  [
    15,
    "physics-chemistry",
    "Deep ocean",
    "NOAA",
    "https://oceanservice.noaa.gov/facts/pressure.html",
    [
      [
        "Every ten metres adds pressure",
        "Ocean pressure rises by about one atmosphere for every ten metres of depth. Deep-sea equipment must withstand an enormous squeeze."
      ],
      [
        "A whale’s lungs can safely collapse",
        "Diving whales have adaptations that let their lungs collapse under pressure. This helps protect them during deep dives."
      ]
    ]
  ],
  [
    15,
    "physics-chemistry",
    "Nature",
    "Royal Botanic Gardens, Kew",
    "https://www.kew.org/plants/venus-flytrap",
    [
      [
        "A plant that counts touches",
        "A Venus flytrap usually closes after two touches to its trigger hairs within about 20 seconds. One accidental touch need not trigger the trap."
      ],
      [
        "A leaf that snaps in a blink",
        "A Venus flytrap can close its trap in less than half a second. It is one of the plants capable of rapid movement."
      ],
      [
        "A flytrap turns prey into nutrients",
        "After trapping an insect or spider, a Venus flytrap releases digestive enzymes. These help it obtain nutrients in poor soils."
      ],
      [
        "Fire can help a flytrap habitat",
        "Periodic natural fires can suppress competing vegetation in Venus flytrap habitats. Fire suppression can therefore threaten this unusual plant."
      ],
      [
        "Venus flytraps take a winter break",
        "During winter dormancy, Venus flytraps reduce their trapping leaves and store energy in an underground bulb-like structure."
      ]
    ]
  ],
  [
    15,
    "physics-chemistry",
    "Food & nature",
    "Royal Botanic Gardens, Kew",
    "https://www.kew.org/plants/vanilla",
    [
      [
        "Vanilla comes from an orchid",
        "The familiar vanilla flavour comes from the fruit of an orchid. The pods and their tiny seeds are used in foods."
      ],
      [
        "Vanilla flowers get a human helping hand",
        "Outside their native range, cultivated vanilla flowers are commonly pollinated by hand. Growers carefully move pollen inside each flower."
      ],
      [
        "Fresh vanilla needs time to smell familiar",
        "Vanilla’s characteristic aroma develops during drying and curing. A freshly picked pod does not yet have the finished spice’s familiar flavour."
      ],
      [
        "Vanilla flowers offer a short window",
        "Kew’s vanilla flowers open for only about eight hours. Hand-pollination must happen within that brief opportunity."
      ]
    ]
  ],
  [
    15,
    "physics-chemistry",
    "Food & nature",
    "Royal Botanic Gardens, Kew",
    "https://www.kew.org/read-and-watch/caring-for-kews-chocolate",
    [
      [
        "Chocolate trees flower on their trunks",
        "Cacao flowers grow directly on the trunk and branches. Their unusual placement means pods can emerge along the woody parts of the tree."
      ],
      [
        "A cacao pod is a berry",
        "Botanically, a cacao pod is a berry. Inside it, seeds are packed into pale, jelly-like pulp."
      ],
      [
        "Tiny flies help chocolate trees",
        "Small flies pollinate cacao’s tiny flowers in the wild. These easily overlooked insects help the tree produce its seed-filled pods."
      ]
    ]
  ],
  [
    16,
    "technology-internet",
    "Technology",
    "CERN",
    "https://home.cern/science/computing/the-birth-of-the-web",
    [
      [
        "The Web began with a scientist",
        "Tim Berners-Lee invented the World Wide Web while working at CERN in 1989. It was designed to help scientists share information."
      ],
      [
        "The first website explained websites",
        "The world’s first website was about the World Wide Web project itself. It ran on Tim Berners-Lee’s NeXT computer at CERN."
      ],
      [
        "A free release helped the Web spread",
        "On 30 April 1993, CERN released Web software into the public domain. Removing licensing barriers helped the technology spread."
      ],
      [
        "You can revisit the first website",
        "CERN began restoring the first website in 2013. Its historic address, info.cern.ch, preserves a glimpse of the Web’s beginnings."
      ]
    ]
  ],
  [
    15,
    "physics-chemistry",
    "Everyday science",
    "Royal Society of Chemistry",
    "https://periodic-table.rsc.org/element/6/carbon",
    [
      [
        "A diamond and a pencil share an element",
        "Diamond and graphite are both forms of carbon. The same element can form materials with dramatically different properties."
      ],
      [
        "Graphene is an atom-thin sheet",
        "Graphene consists of carbon arranged in a sheet just one atom thick. It belongs to the same elemental family as graphite and diamond."
      ],
      [
        "Carbon can make light, strong equipment",
        "Carbon fibre combines low weight with high strength. It is used in products ranging from tennis rackets to aircraft."
      ]
    ]
  ],
  [
    15,
    "physics-chemistry",
    "Science & India",
    "Royal Society of Chemistry",
    "https://periodic-table.rsc.org/element/2/helium",
    [
      [
        "Helium was spotted in sunlight first",
        "Scientists detected helium in the Sun’s spectrum before identifying it on Earth. Its name comes from the Greek word for the Sun."
      ],
      [
        "An eclipse in India revealed a clue",
        "During an 1868 eclipse in India, Pierre Janssen observed an unfamiliar yellow spectral line. It became a clue to the discovery of helium."
      ],
      [
        "Helium helps giant magnets stay cold",
        "Helium is used to cool superconducting magnets in equipment such as MRI scanners and the Large Hadron Collider. Its usefulness goes beyond balloons."
      ]
    ]
  ],
  [
    16,
    "technology-internet",
    "Money & materials",
    "Royal Society of Chemistry",
    "https://periodic-table.rsc.org/element/79/gold",
    [
      [
        "Pure gold is surprisingly soft",
        "Pure, 24-carat gold is soft. Jewellery often mixes gold with other metals to improve its durability."
      ],
      [
        "Gold works inside electronics too",
        "Gold conducts electricity and resists corrosion. Thin coatings help protect electrical contacts, and fine gold wires are used inside computer chips."
      ],
      [
        "There is gold in seawater",
        "Seawater contains tiny traces of gold. The concentration is so low that extracting it is not a practical ocean treasure hunt."
      ]
    ]
  ],
  [
    16,
    "technology-internet",
    "India & wonders",
    "UNESCO World Heritage Centre",
    "https://whc.unesco.org/en/list/252/",
    [
      [
        "The Taj’s garden has an unusual layout",
        "The Taj Mahal’s main tomb stands at one end of its four-part garden rather than in the centre. This helps create its long, dramatic view."
      ],
      [
        "The Taj is more than white marble",
        "The Taj Mahal complex also includes red-sandstone buildings. Their colour contrasts with the famous marble mausoleum."
      ],
      [
        "Stone becomes floral art at the Taj",
        "The Taj Mahal’s decoration includes carefully inlaid precious and semi-precious stones. Craftspeople used stone itself to create detailed designs."
      ]
    ]
  ],
  [
    16,
    "technology-internet",
    "India & money",
    "Reserve Bank of India",
    "https://rbi.org.in/Scripts/BS_CurrencyFAQView.aspx?Id=136",
    [
      [
        "A banknote carries many languages",
        "Indian banknotes have a panel of fifteen languages, in addition to Hindi and English elsewhere on the note. One note communicates its value widely."
      ]
    ]
  ]
];
let sequence = 0;
export const editorialExpansion: BilingualMobileFact[] = groups.flatMap(([categoryId,categorySlug,categoryLabel,publisher,sourceUrl,items]) => items.map(([hook,body]) => {
 const index = ++sequence;
 return {en:{id:`00002026-1021-4000-8000-${String(index).padStart(12,'0')}`,categoryId,categorySlug,categoryLabel,categoryEmoji:({13:'🪐',14:'🐙',15:'✨',16:'💡'} as Record<number,string>)[categoryId]!,hook,body,sourceUrl,publisher,licence:'cc0',corroborationCount:1,difficulty:1,entities:[],quality:0.9,templateId:`editorial-20261021-${index}`}};
}));

