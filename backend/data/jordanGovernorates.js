// data/jordanGovernorates.js
// Curated dataset for every Jordanian governorate.
//
// Each entry provides:
//   - aliases: every spelling the user might type (English, Arabic, romanised)
//   - center: approximate lat/lng of the city core (used for nearbysearch bias)
//   - radius: meters — how far to search around the center
//   - landmarks: hand-picked seed names that always exist (used as fallback if
//                Google returns nothing or to enrich text queries)
//   - styleQueries: trip-style → bonus text queries we run for that style
//
// The keys are normalised (lowercase, no diacritics, no apostrophes). The
// lookup helper below handles user variations like "Ma'an", "maan", "معان".

const norm = (s = "") =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[`'’ʼ]/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const GOVERNORATES = {
  amman: {
    name: "Amman",
    aliases: ["amman", "عمان", "amman governorate"],
    center: { lat: 31.9539, lng: 35.9106 },
    radius: 12000,
    landmarks: [
      "Amman Citadel",
      "Roman Theatre Amman",
      "Rainbow Street",
      "Jordan Museum",
      "King Abdullah I Mosque",
      "Royal Automobile Museum",
      "Wakalat Street",
      "Abdali Boulevard",
      "Al-Husseini Mosque",
      "Darat al Funun",
      "Jordan Archaeological Museum",
      "Al Pasha Turkish Bath",
    ],
    styleQueries: {
      adventure: ["zip line activities", "go karting", "indoor climbing"],
      cultural: ["museums", "historical sites", "art galleries", "souks"],
      family: ["family parks", "kids play areas", "amusement parks"],
      romantic: ["rooftop restaurants", "fine dining", "scenic viewpoints"],
      relaxation: ["spa centers", "luxury cafes", "wellness centres"],
      food: ["traditional Jordanian restaurants", "popular shawarma", "mansaf restaurants"],
    },
  },

  zarqa: {
    name: "Zarqa",
    aliases: ["zarqa", "az zarqa", "الزرقاء"],
    center: { lat: 32.0727, lng: 36.0879 },
    radius: 15000,
    landmarks: [
      "Qasr Al-Hallabat",
      "Hammam As-Sarah",
      "Prince Mohammad Park",
      "Zarqa Public Park",
      "Russeifa",
    ],
    styleQueries: {
      adventure: ["desert castles", "off road tracks"],
      cultural: ["umayyad castles", "qasr al hallabat", "historic mosques"],
      family: ["public parks", "family restaurants"],
      romantic: ["scenic restaurants"],
      relaxation: ["quiet cafes", "parks"],
      food: ["popular kebab restaurants", "traditional bakeries"],
    },
  },

  irbid: {
    name: "Irbid",
    aliases: ["irbid", "اربد", "irbid governorate"],
    center: { lat: 32.5556, lng: 35.85 },
    radius: 25000,
    landmarks: [
      "Umm Qais",
      "Pella Jordan",
      "Yarmouk University",
      "Dar As-Saraya Museum",
      "Wadi Al Arab Dam",
      "Beit Ras (ancient Capitolias)",
      "Al Himmah Hot Springs",
      "Jordan University of Science and Technology",
    ],
    styleQueries: {
      adventure: ["hiking trails north Jordan", "hot springs"],
      cultural: ["roman ruins umm qais", "pella archaeological site", "museums"],
      family: ["public parks", "family resorts"],
      romantic: ["sunset viewpoints umm qais"],
      relaxation: ["hot springs", "nature spots"],
      food: ["mansaf restaurants irbid", "traditional restaurants"],
    },
  },

  ajloun: {
    name: "Ajloun",
    aliases: ["ajloun", "ajlun", "عجلون", "ajloun governorate"],
    center: { lat: 32.3326, lng: 35.7517 },
    radius: 18000,
    landmarks: [
      "Ajloun Castle",
      "Ajloun Forest Reserve",
      "Mar Elias",
      "Anjara",
      "Soap House Ajloun",
    ],
    styleQueries: {
      adventure: ["hiking trails ajloun", "forest cabins", "zipline ajloun"],
      cultural: ["ajloun castle", "byzantine churches", "religious sites"],
      family: ["forest reserves", "family eco lodges"],
      romantic: ["forest cabins", "scenic mountain restaurants"],
      relaxation: ["nature reserves", "forest cafes"],
      food: ["countryside restaurants", "village kitchens"],
    },
  },

  jerash: {
    name: "Jerash",
    aliases: ["jerash", "jarash", "جرش", "jerash governorate"],
    center: { lat: 32.2811, lng: 35.8989 },
    radius: 15000,
    landmarks: [
      "Jerash Archaeological Site",
      "Hadrian's Arch",
      "Oval Plaza Jerash",
      "South Theatre Jerash",
      "Artemis Temple",
      "Jerash Visitor Center",
      "Dibeen Forest Reserve",
    ],
    styleQueries: {
      adventure: ["hiking dibeen", "horse riding jerash"],
      cultural: ["roman ruins jerash", "ancient sites", "archaeological museum"],
      family: ["family restaurants jerash"],
      romantic: ["ancient ruins at sunset"],
      relaxation: ["forest spots", "quiet cafes"],
      food: ["traditional restaurants jerash"],
    },
  },

  mafraq: {
    name: "Mafraq",
    aliases: ["mafraq", "al mafraq", "المفرق", "mafraq governorate"],
    center: { lat: 32.343, lng: 36.208 },
    radius: 30000,
    landmarks: [
      "Umm Al-Jimal",
      "Qasr Burqu'",
      "Qasr Deir Al-Kahf",
      "Azraq Wetland Reserve",
      "Shaumari Wildlife Reserve",
    ],
    styleQueries: {
      adventure: ["desert safaris", "off road jeep tours", "wildlife reserves"],
      cultural: ["umm al jimal", "byzantine ruins", "ancient cities"],
      family: ["wildlife reserves", "azraq wetland"],
      romantic: ["desert lodges"],
      relaxation: ["eco lodges azraq", "wetland walks"],
      food: ["local desert restaurants"],
    },
  },

  balqa: {
    name: "Salt",
    aliases: ["balqa", "salt", "al salt", "as salt", "السلط", "balqa governorate"],
    center: { lat: 32.0392, lng: 35.7272 },
    radius: 15000,
    landmarks: [
      "Salt Archaeological Museum",
      "Historic Old Salt",
      "Abu Jaber Museum",
      "Salt Cultural Center",
      "Fuheis",
      "Wadi Shu'aib",
    ],
    styleQueries: {
      adventure: ["wadi hikes", "outdoor villages"],
      cultural: ["unesco old salt", "ottoman houses", "museums salt"],
      family: ["family restaurants fuheis", "public parks"],
      romantic: ["scenic restaurants fuheis"],
      relaxation: ["traditional cafes salt", "quiet alleys"],
      food: ["traditional jordanian restaurants fuheis", "knafeh shops"],
    },
  },

  madaba: {
    name: "Madaba",
    aliases: ["madaba", "مأدبا", "مادبا", "madaba governorate"],
    center: { lat: 31.7197, lng: 35.7956 },
    radius: 25000,
    landmarks: [
      "Madaba Mosaic Map",
      "Saint George Church Madaba",
      "Mount Nebo",
      "Mukawir (Machaerus)",
      "Madaba Archaeological Park",
      "Bani Hamida Weaving Centre",
      "Hammamat Ma'in Hot Springs",
    ],
    styleQueries: {
      adventure: ["hammamat main", "wadi hikes madaba"],
      cultural: ["byzantine mosaics", "religious sites", "mount nebo"],
      family: ["hot springs resorts", "family hotels"],
      romantic: ["hot springs spa", "ma'in resort"],
      relaxation: ["thermal springs", "spa resorts"],
      food: ["mansaf restaurants madaba", "byzantine restaurant"],
    },
  },

  karak: {
    name: "Karak",
    aliases: ["karak", "al karak", "kerak", "الكرك", "karak governorate"],
    center: { lat: 31.1854, lng: 35.7047 },
    radius: 25000,
    landmarks: [
      "Karak Castle",
      "Mu'tah",
      "Wadi Mujib Reserve",
      "Mujib Biosphere Reserve",
      "Dead Sea Panorama",
      "Lot's Cave Museum",
    ],
    styleQueries: {
      adventure: ["wadi mujib siq trail", "canyoning wadi mujib"],
      cultural: ["crusader castle", "karak castle", "historic sites"],
      family: ["mujib reserve", "family viewpoints"],
      romantic: ["dead sea panorama"],
      relaxation: ["nature reserves", "scenic stops"],
      food: ["mansaf karak", "local restaurants karak"],
    },
  },

  tafilah: {
    name: "Tafilah",
    aliases: ["tafilah", "tafileh", "tafila", "al tafilah", "الطفيلة", "tafilah governorate"],
    center: { lat: 30.8372, lng: 35.6044 },
    radius: 30000,
    landmarks: [
      "Dana Biosphere Reserve",
      "Dana Village",
      "Feynan Ecolodge",
      "Wadi Dana Trail",
      "Afra Hot Springs",
      "Burbeita Hot Springs",
    ],
    styleQueries: {
      adventure: ["dana hiking trails", "wadi dana", "feynan trek"],
      cultural: ["dana village heritage", "ottoman villages"],
      family: ["ecolodges dana", "family nature walks"],
      romantic: ["feynan ecolodge", "starry desert lodges"],
      relaxation: ["hot springs afra", "ecolodges"],
      food: ["dana village restaurants"],
    },
  },

  maan: {
    name: "Ma'an",
    aliases: ["maan", "ma'an", "ma`an", "معان", "maan governorate"],
    center: { lat: 30.1962, lng: 35.7244 },
    radius: 60000,
    landmarks: [
      "Petra",
      "Wadi Musa",
      "Little Petra",
      "Wadi Rum Protected Area",
      "Shobak Castle",
      "Petra by Night",
      "Petra Monastery",
      "Al-Khazneh Petra",
      "Petra Archaeological Park",
      "Beidha Neolithic Village",
      "Siq Trail Petra",
      "Aaron's Tomb",
      "Ma'an Historic Centre",
    ],
    styleQueries: {
      adventure: ["wadi rum jeep tours", "petra hiking trails", "rock climbing wadi rum", "desert camps wadi rum"],
      cultural: ["petra archaeological park", "nabatean sites", "shobak castle", "little petra"],
      family: ["bedouin camps wadi rum", "petra family tours"],
      romantic: ["luxury bedouin camps wadi rum", "petra by night"],
      relaxation: ["bedouin tea camps", "wadi rum eco lodges"],
      food: ["wadi musa restaurants", "bedouin zarb meals", "petra kitchen"],
    },
  },

  aqaba: {
    name: "Aqaba",
    aliases: ["aqaba", "al aqaba", "العقبة", "aqaba governorate"],
    center: { lat: 29.5267, lng: 35.0078 },
    radius: 25000,
    landmarks: [
      "Aqaba Marine Park",
      "Aqaba Castle (Mamluk Fort)",
      "Berenice Beach Club",
      "South Beach Aqaba",
      "Aqaba Aquarium",
      "Tala Bay",
      "Ayla Oasis",
      "Wadi Rum (near)",
      "Saraya Aqaba",
      "Aqaba Bird Observatory",
    ],
    styleQueries: {
      adventure: ["diving aqaba", "snorkeling red sea", "scuba diving", "glass boat tours"],
      cultural: ["aqaba castle", "ayla archaeological site"],
      family: ["beach resorts aqaba", "aqaba aquarium"],
      romantic: ["beachfront resorts", "tala bay marina"],
      relaxation: ["spa resorts aqaba", "beach clubs"],
      food: ["seafood restaurants aqaba", "fish restaurants aqaba"],
    },
  },
};

// Reverse index — every alias points to a canonical key.
const ALIAS_INDEX = {};
for (const [key, gov] of Object.entries(GOVERNORATES)) {
  ALIAS_INDEX[norm(key)] = key;
  ALIAS_INDEX[norm(gov.name)] = key;
  for (const a of gov.aliases || []) {
    ALIAS_INDEX[norm(a)] = key;
  }
}

const resolveGovernorate = (input) => {
  if (!input) return null;
  const n = norm(input);
  if (ALIAS_INDEX[n]) return GOVERNORATES[ALIAS_INDEX[n]];
  // Loose match: input contains a known alias as a token.
  for (const alias in ALIAS_INDEX) {
    if (n.includes(alias) || alias.includes(n)) {
      return GOVERNORATES[ALIAS_INDEX[alias]];
    }
  }
  return null;
};

const listGovernorateNames = () =>
  Object.values(GOVERNORATES).map((g) => g.name);

// Returns the merged style-specific query list for a destination + style.
// Falls back to a generic list when style is unknown.
const getStyleQueries = (governorateOrName, style) => {
  const gov = resolveGovernorate(governorateOrName);
  if (!gov) return [];
  const styleKey = String(style || "").toLowerCase();
  return gov.styleQueries?.[styleKey] || [];
};

export {
  GOVERNORATES,
  resolveGovernorate,
  listGovernorateNames,
  getStyleQueries,
  norm,
};
