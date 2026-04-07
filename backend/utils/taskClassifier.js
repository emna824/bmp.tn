const CATEGORY_KEYWORDS = {
  carpenter: [
    'wood',
    'wooden',
    'door',
    'cabinet',
    'furniture',
    'shelf',
    'bookshelf',
    'drawer',
    'wardrobe',
    'frame',
    'stair',
    'bois',
    'porte',
    'armoire',
    'meuble',
    'placard',
    'etagere',
    'bibliotheque',
    'tiroir',
    'escalier',
    'خشب',
    'خشبي',
    'خزانة',
    'أثاث',
    'اثاث',
    'رف',
    'رفوف',
    'باب',
    'دولاب',
    'درج',
  ],
  painter: [
    'paint',
    'repaint',
    'primer',
    'coating',
    'facade',
    'ceiling',
    'peindre',
    'peinture',
    'repeindre',
    'plafond',
    'sous couche',
    'peint',
    'طلاء',
    'صبغ',
    'دهان',
    'الوان',
    'ألوان',
    'جدار',
    'سقف',
  ],
  electrician: [
    'wire',
    'wiring',
    'cable',
    'cables',
    'socket',
    'switch',
    'circuit',
    'breaker',
    'fuse',
    'light',
    'electrical',
    'electrique',
    'cablage',
    'prise',
    'interrupteur',
    'luminaire',
    'tableau electrique',
    'اسلاك',
    'أسلاك',
    'كهرباء',
    'كهربائي',
    'قاطع',
    'قواطع',
    'فيوز',
    'مصباح',
    'مفتاح',
    'تماس',
  ],
  mason: [
    'brick',
    'bricks',
    'concrete',
    'cement',
    'mortar',
    'plaster',
    'masonry',
    'block',
    'stone',
    'screed',
    'beton',
    'brique',
    'briques',
    'mortier',
    'chape',
    'parpaing',
    'mur',
    'جدار',
    'طوب',
    'خرسانة',
    'اسمنت',
    'إسمنت',
    'ملاط',
    'بلوك',
    'حجر',
  ],
  plumber: [
    'pipe',
    'pipes',
    'plumbing',
    'leak',
    'leakage',
    'drain',
    'faucet',
    'valve',
    'toilet',
    'sink',
    'shower',
    'tuyau',
    'tuyaux',
    'plomberie',
    'fuite',
    'robinet',
    'evier',
    'toilette',
    'mitigeur',
    'أنبوب',
    'أنابيب',
    'انبوب',
    'انابيب',
    'تسرب',
    'تسريب',
    'صنبور',
    'صرف',
    'مرحاض',
    'دش',
    'صمام',
  ],
};

const SUGGESTIONS = {
  mason: {
    en: {
      materials: ['cement', 'bricks', 'sand'],
      best_practices: ['Ensure proper alignment of bricks', 'Use strong foundation'],
      safety: ['Wear gloves', 'Use protective gear'],
    },
    fr: {
      materials: ['ciment', 'briques', 'sable'],
      best_practices: ['Assurez un bon alignement des briques', 'Utilisez une fondation solide'],
      safety: ['Portez des gants', 'Utilisez un équipement de protection'],
    },
    ar: {
      materials: ['الإسمنت', 'الطوب', 'الرمل'],
      best_practices: ['تأكد من استقامة الطوب بشكل صحيح', 'استخدم أساسًا قويًا'],
      safety: ['ارتدِ القفازات', 'استخدم معدات الحماية'],
    },
  },
  electrician: {
    en: {
      materials: ['cables', 'switches', 'pipes'],
      best_practices: ['Check connections carefully', 'Follow electrical standards'],
      safety: ['Turn off power before working', 'Use insulated tools'],
    },
    fr: {
      materials: ['câbles', 'interrupteurs', 'gaines'],
      best_practices: ['Vérifiez soigneusement les connexions', 'Respectez les normes électriques'],
      safety: ["Coupez l'alimentation avant d'intervenir", 'Utilisez des outils isolés'],
    },
    ar: {
      materials: ['الكابلات', 'المفاتيح', 'الأنابيب'],
      best_practices: ['افحص التوصيلات بعناية', 'اتبع معايير الكهرباء'],
      safety: ['افصل التيار قبل العمل', 'استخدم أدوات معزولة'],
    },
  },
  painter: {
    en: {
      materials: ['paint', 'brush', 'roller'],
      best_practices: ['Apply primer before painting', 'Use even strokes'],
      safety: ['Use mask', 'Ensure ventilation'],
    },
    fr: {
      materials: ['peinture', 'pinceau', 'rouleau'],
      best_practices: ['Appliquez une sous-couche avant de peindre', 'Utilisez des passes régulières'],
      safety: ['Portez un masque', 'Assurez une bonne ventilation'],
    },
    ar: {
      materials: ['الطلاء', 'الفرشاة', 'الرول'],
      best_practices: ['ضع طبقة أساس قبل الطلاء', 'استخدم ضربات متساوية'],
      safety: ['استخدم قناعًا', 'تأكد من وجود تهوية جيدة'],
    },
  },
  carpenter: {
    en: {
      materials: ['wood', 'nails', 'tools'],
      best_practices: ['Measure twice before cutting', 'Use quality wood'],
      safety: ['Wear safety glasses', 'Handle tools carefully'],
    },
    fr: {
      materials: ['bois', 'clous', 'outils'],
      best_practices: ['Mesurez deux fois avant de couper', 'Utilisez du bois de qualité'],
      safety: ['Portez des lunettes de sécurité', 'Manipulez les outils avec précaution'],
    },
    ar: {
      materials: ['الخشب', 'المسامير', 'الأدوات'],
      best_practices: ['قم بالقياس مرتين قبل القص', 'استخدم خشبًا جيد الجودة'],
      safety: ['ارتدِ نظارات السلامة', 'تعامل مع الأدوات بحذر'],
    },
  },
  plumber: {
    en: {
      materials: ['pipes', 'valves', 'sealant'],
      best_practices: ['Check for leaks', 'Use proper sealing'],
      safety: ['Turn off water supply', 'Use protective gloves'],
    },
    fr: {
      materials: ['tuyaux', 'vannes', "mastic d'étanchéité"],
      best_practices: ['Vérifiez les fuites', 'Utilisez une bonne étanchéité'],
      safety: ["Coupez l'arrivée d'eau", 'Utilisez des gants de protection'],
    },
    ar: {
      materials: ['الأنابيب', 'الصمامات', 'مادة العزل'],
      best_practices: ['تحقق من وجود أي تسرب', 'استخدم إحكامًا مناسبًا'],
      safety: ['أغلق مصدر المياه', 'استخدم قفازات واقية'],
    },
  },
};

const FRENCH_HINTS = [
  'installer',
  'réparer',
  'reparer',
  'peindre',
  'mur',
  'briques',
  'tuyaux',
  'câbles',
  'cables',
  'bois',
];

function normalizeTaskText(text = '') {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectSuggestionLanguage(text = '') {
  const normalizedText = String(text || '').trim().toLowerCase();

  if (!normalizedText) return 'en';
  if (/[\u0600-\u06FF]/.test(normalizedText)) return 'ar';
  if (FRENCH_HINTS.some((token) => normalizedText.includes(token))) return 'fr';

  return 'en';
}

function getTaskSuggestions(category = '', text = '') {
  const language = detectSuggestionLanguage(text);
  const categorySuggestions = SUGGESTIONS[category] || {};
  const selected = categorySuggestions[language] || categorySuggestions.en || {};

  return {
    materials: [...(selected.materials || [])],
    best_practices: [...(selected.best_practices || [])],
    safety: [...(selected.safety || [])],
  };
}

function localPredictTaskCategory(text = '') {
  const normalizedText = normalizeTaskText(text);
  if (!normalizedText) return null;

  let bestCategory = '';
  let bestScore = 0;
  let totalScore = 0;

  Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
    const score = keywords.reduce((sum, keyword) => {
      if (!normalizedText.includes(keyword)) return sum;
      return sum + (keyword.includes(' ') ? 2 : 1);
    }, 0);

    totalScore += score;

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  });

  if (!bestCategory || bestScore === 0) {
    return null;
  }

  const suggestions = getTaskSuggestions(bestCategory, text);

  return {
    category: bestCategory,
    confidence: Number((bestScore / Math.max(totalScore, bestScore)).toFixed(4)),
    source: 'local',
    materials: suggestions.materials,
    best_practices: suggestions.best_practices,
    safety: suggestions.safety,
  };
}

module.exports = {
  getTaskSuggestions,
  localPredictTaskCategory,
  normalizeTaskText,
};
