import api from '../api'

const REMOTE_CLASSIFIER_URL = String(import.meta.env.VITE_TASK_CLASSIFIER_API || '')
  .trim()
  .replace(/\/$/, '')

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
    'facade',
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
}

const CATEGORY_SUGGESTIONS = {
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
}

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
]

const predictionCache = new Map()
const inflightRequests = new Map()
let remoteClassifierAvailable = Boolean(REMOTE_CLASSIFIER_URL)

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function detectSuggestionLanguage(text, languageHint = '') {
  const normalizedText = String(text || '').trim().toLowerCase()
  const normalizedLanguage = String(languageHint || '').toLowerCase().split('-')[0]

  if (normalizedLanguage === 'fr' || normalizedLanguage === 'ar' || normalizedLanguage === 'en') {
    return normalizedLanguage
  }

  if (!normalizedText) return 'en'
  if (/[\u0600-\u06FF]/.test(normalizedText)) return 'ar'
  if (FRENCH_HINTS.some((token) => normalizedText.includes(token))) return 'fr'

  return 'en'
}

export function getTaskSuggestions(category, text = '', languageHint = '') {
  const normalizedCategory = normalizeCategoryKey(category)
  if (!normalizedCategory) {
    return {
      materials: [],
      best_practices: [],
      safety: [],
    }
  }

  const language = detectSuggestionLanguage(text, languageHint)
  const suggestionSet = CATEGORY_SUGGESTIONS[normalizedCategory] || {}
  const selectedSuggestions = suggestionSet[language] || suggestionSet.en || {}

  return {
    materials: [...(selectedSuggestions.materials || [])],
    best_practices: [...(selectedSuggestions.best_practices || [])],
    safety: [...(selectedSuggestions.safety || [])],
  }
}

function localPredict(normalizedText) {
  if (!normalizedText) return null

  let bestCategory = ''
  let bestScore = 0
  let totalScore = 0

  Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
    const score = keywords.reduce((sum, keyword) => {
      if (!normalizedText.includes(keyword)) return sum
      return sum + (keyword.includes(' ') ? 2 : 1)
    }, 0)

    totalScore += score

    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  })

  if (!bestCategory || bestScore === 0) {
    return null
  }

  const suggestions = getTaskSuggestions(bestCategory, normalizedText)

  return {
    category: bestCategory,
    confidence: Number((bestScore / Math.max(totalScore, bestScore)).toFixed(4)),
    source: 'local',
    materials: suggestions.materials,
    best_practices: suggestions.best_practices,
    safety: suggestions.safety,
  }
}

async function remotePredict(text) {
  if (!remoteClassifierAvailable && !REMOTE_CLASSIFIER_URL) return null

  try {
    const payload = REMOTE_CLASSIFIER_URL
      ? await fetch(`${REMOTE_CLASSIFIER_URL}/predict`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ task: text }),
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error(`Classifier request failed with ${response.status}`)
          }
          return response.json()
        })
      : (await api.post('/task-classifier/predict', { task: text })).data

    if (!payload?.category) return null

    return {
      category: String(payload.category),
      confidence: Number(payload.confidence ?? 0),
      source: payload.source || 'ml',
      materials: Array.isArray(payload.materials) ? payload.materials : [],
      best_practices: Array.isArray(payload.best_practices) ? payload.best_practices : [],
      safety: Array.isArray(payload.safety) ? payload.safety : [],
    }
  } catch {
    if (REMOTE_CLASSIFIER_URL) {
      remoteClassifierAvailable = false
    }
    return null
  }
}

export async function predictTaskCategory(text, languageHint = '') {
  const normalizedText = normalizeText(text)
  if (!normalizedText) return null

  const cacheKey = `${normalizedText}::${languageHint}`

  if (predictionCache.has(cacheKey)) {
    return predictionCache.get(cacheKey)
  }

  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey)
  }

  const request = (async () => {
    const prediction =
      (await remotePredict(text)) ||
      localPredict(normalizedText) ||
      null

    const nextPrediction = prediction?.category
      ? {
          ...prediction,
          materials: prediction.materials || getTaskSuggestions(prediction.category, text, languageHint).materials,
          best_practices:
            prediction.best_practices || getTaskSuggestions(prediction.category, text, languageHint).best_practices,
          safety: prediction.safety || getTaskSuggestions(prediction.category, text, languageHint).safety,
        }
      : prediction

    predictionCache.set(cacheKey, nextPrediction)
    inflightRequests.delete(cacheKey)
    return nextPrediction
  })()

  inflightRequests.set(cacheKey, request)
  return request
}

export function normalizeCategoryKey(category) {
  const normalizedCategory = String(category || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')

  if (['carpenter', 'painter', 'electrician', 'mason', 'plumber'].includes(normalizedCategory)) {
    return normalizedCategory
  }

  return ''
}

export function formatTradeLabel(category) {
  return String(category || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
