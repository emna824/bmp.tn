from __future__ import annotations

import re


SUGGESTIONS = {
    "mason": {
        "en": {
            "materials": ["cement", "bricks", "sand"],
            "best_practices": [
                "Ensure proper alignment of bricks",
                "Use strong foundation",
            ],
            "safety": [
                "Wear gloves",
                "Use protective gear",
            ],
        },
        "fr": {
            "materials": ["ciment", "briques", "sable"],
            "best_practices": [
                "Assurez un bon alignement des briques",
                "Utilisez une fondation solide",
            ],
            "safety": [
                "Portez des gants",
                "Utilisez un équipement de protection",
            ],
        },
        "ar": {
            "materials": ["الإسمنت", "الطوب", "الرمل"],
            "best_practices": [
                "تأكد من استقامة الطوب بشكل صحيح",
                "استخدم أساسًا قويًا",
            ],
            "safety": [
                "ارتدِ القفازات",
                "استخدم معدات الحماية",
            ],
        },
    },
    "electrician": {
        "en": {
            "materials": ["cables", "switches", "pipes"],
            "best_practices": [
                "Check connections carefully",
                "Follow electrical standards",
            ],
            "safety": [
                "Turn off power before working",
                "Use insulated tools",
            ],
        },
        "fr": {
            "materials": ["câbles", "interrupteurs", "gaines"],
            "best_practices": [
                "Vérifiez soigneusement les connexions",
                "Respectez les normes électriques",
            ],
            "safety": [
                "Coupez l'alimentation avant d'intervenir",
                "Utilisez des outils isolés",
            ],
        },
        "ar": {
            "materials": ["الكابلات", "المفاتيح", "الأنابيب"],
            "best_practices": [
                "افحص التوصيلات بعناية",
                "اتبع معايير الكهرباء",
            ],
            "safety": [
                "افصل التيار قبل العمل",
                "استخدم أدوات معزولة",
            ],
        },
    },
    "painter": {
        "en": {
            "materials": ["paint", "brush", "roller"],
            "best_practices": [
                "Apply primer before painting",
                "Use even strokes",
            ],
            "safety": [
                "Use mask",
                "Ensure ventilation",
            ],
        },
        "fr": {
            "materials": ["peinture", "pinceau", "rouleau"],
            "best_practices": [
                "Appliquez une sous-couche avant de peindre",
                "Utilisez des passes régulières",
            ],
            "safety": [
                "Portez un masque",
                "Assurez une bonne ventilation",
            ],
        },
        "ar": {
            "materials": ["الطلاء", "الفرشاة", "الرول"],
            "best_practices": [
                "ضع طبقة أساس قبل الطلاء",
                "استخدم ضربات متساوية",
            ],
            "safety": [
                "استخدم قناعًا",
                "تأكد من وجود تهوية جيدة",
            ],
        },
    },
    "carpenter": {
        "en": {
            "materials": ["wood", "nails", "tools"],
            "best_practices": [
                "Measure twice before cutting",
                "Use quality wood",
            ],
            "safety": [
                "Wear safety glasses",
                "Handle tools carefully",
            ],
        },
        "fr": {
            "materials": ["bois", "clous", "outils"],
            "best_practices": [
                "Mesurez deux fois avant de couper",
                "Utilisez du bois de qualité",
            ],
            "safety": [
                "Portez des lunettes de sécurité",
                "Manipulez les outils avec précaution",
            ],
        },
        "ar": {
            "materials": ["الخشب", "المسامير", "الأدوات"],
            "best_practices": [
                "قم بالقياس مرتين قبل القص",
                "استخدم خشبًا جيد الجودة",
            ],
            "safety": [
                "ارتدِ نظارات السلامة",
                "تعامل مع الأدوات بحذر",
            ],
        },
    },
    "plumber": {
        "en": {
            "materials": ["pipes", "valves", "sealant"],
            "best_practices": [
                "Check for leaks",
                "Use proper sealing",
            ],
            "safety": [
                "Turn off water supply",
                "Use protective gloves",
            ],
        },
        "fr": {
            "materials": ["tuyaux", "vannes", "mastic d'étanchéité"],
            "best_practices": [
                "Vérifiez les fuites",
                "Utilisez une bonne étanchéité",
            ],
            "safety": [
                "Coupez l'arrivée d'eau",
                "Utilisez des gants de protection",
            ],
        },
        "ar": {
            "materials": ["الأنابيب", "الصمامات", "مادة العزل"],
            "best_practices": [
                "تحقق من وجود أي تسرب",
                "استخدم إحكامًا مناسبًا",
            ],
            "safety": [
                "أغلق مصدر المياه",
                "استخدم قفازات واقية",
            ],
        },
    },
}


FRENCH_HINTS = (
    "installer",
    "réparer",
    "reparer",
    "peindre",
    "mur",
    "briques",
    "tuyaux",
    "câbles",
    "cables",
    "bois",
)


def detect_language(text: str) -> str:
    sample = str(text or "").strip().lower()
    if not sample:
        return "en"

    if re.search(r"[\u0600-\u06FF]", sample):
        return "ar"

    if any(token in sample for token in FRENCH_HINTS):
        return "fr"

    return "en"


def get_task_suggestions(category: str, text: str = "") -> dict:
    language = detect_language(text)
    category_suggestions = SUGGESTIONS.get(category, {})
    selected = category_suggestions.get(language) or category_suggestions.get("en") or {}

    return {
        "materials": list(selected.get("materials", [])),
        "best_practices": list(selected.get("best_practices", [])),
        "safety": list(selected.get("safety", [])),
    }
