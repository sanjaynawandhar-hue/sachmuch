# Editorial expansion — 21 October 2026

The production app was serving a static 20-card curated edition. This release appends 80 distinct English cards, preserving every existing ID and optional Hindi translation. Total: 100 cards. This is an interim content release; the approved 100,000+ corpus is not complete.

Each new card is an original short summary checked against the linked source on 2026-10-21. No translations, candidate records or alternate wording are counted as additional facts. Source metadata remains in the API for auditability; no source button is added to the app. New IDs use the 2026-1021 prefix; keep them stable when editing. Do not insert or reorder groups without explicitly preserving IDs.

| Source | New cards |
|---|---:|
| https://science.nasa.gov/mercury/facts/ | 4 |
| https://science.nasa.gov/venus/venus-facts/ | 4 |
| https://science.nasa.gov/mars/facts/ | 4 |
| https://science.nasa.gov/jupiter/jupiter-facts/ | 4 |
| https://nationalzoo.si.edu/animals/giant-panda | 6 |
| https://nationalzoo.si.edu/animals/asian-elephant | 6 |
| https://nationalzoo.si.edu/animals/komodo-dragon | 6 |
| https://oceanservice.noaa.gov/facts/coral.html | 5 |
| https://oceanservice.noaa.gov/facts/seahorse.html | 4 |
| https://oceanservice.noaa.gov/facts/oceanblue.html | 2 |
| https://oceanservice.noaa.gov/facts/whysalty.html | 2 |
| https://oceanservice.noaa.gov/facts/sound.html | 2 |
| https://oceanservice.noaa.gov/facts/pressure.html | 2 |
| https://www.kew.org/plants/venus-flytrap | 5 |
| https://www.kew.org/plants/vanilla | 4 |
| https://www.kew.org/read-and-watch/caring-for-kews-chocolate | 3 |
| https://home.cern/science/computing/the-birth-of-the-web | 4 |
| https://periodic-table.rsc.org/element/6/carbon | 3 |
| https://periodic-table.rsc.org/element/2/helium | 3 |
| https://periodic-table.rsc.org/element/79/gold | 3 |
| https://whc.unesco.org/en/list/252/ | 3 |
| https://rbi.org.in/Scripts/BS_CurrencyFAQView.aspx?Id=136 | 1 |

Validation: core contract/content tests 81/81; web endpoint/pagination tests 10/10; mobile tests 60/60; core and web type checks passed. Deployment verification must independently confirm 100 unique IDs, complete English text and the original 20 IDs on the public v2 and legacy fun endpoints.

The independent canonical-claim database work remains uncommitted and no database migration is part of this content release. The static edition remains independent of database credentials.

