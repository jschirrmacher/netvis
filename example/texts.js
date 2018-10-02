const lang = window.navigator.language
const defaultLang = "en"
const allTexts = {
  "de": {
    "topics": "Themen",
    "interestedParties": "Interessierte Personen",
    "linkTitle": "{{title}} anzeigen"
  },
  "en": {
    "topics": "Topics",
    "interestedParties": "interested Parties",
    "linkTitle": "Show {{title}}"
  }
}
const texts = allTexts[lang] || allTexts[lang.substr(0, 2)] || allTexts[defaultLang]
