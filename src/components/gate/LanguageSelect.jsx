import { LANG_MAP } from '../../lib/ttsVoices'

const LANGUAGES = Object.keys(LANG_MAP)

export function LanguageSelect({ onSelect }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(40px)', backgroundColor: 'rgba(2,2,2,0.9)' }}>
      <div className="text-center">
        <h2 className="text-white text-2xl font-mono mb-8 tracking-widest">
          SELECT LANGUAGE
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {LANGUAGES.map(lang => (
            <button
              key={lang}
              onClick={() => onSelect(lang)}
              className="font-display text-5xl text-white hover:text-purple transition-colors duration-300"
            >
              {lang}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
