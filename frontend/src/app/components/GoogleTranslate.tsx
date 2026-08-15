'use client';

import { useEffect } from 'react';
import { Languages } from 'lucide-react';

export default function GoogleTranslate() {
  useEffect(() => {
    // 1. Perform cleanup first to ensure a clean slate and prevent duplication
    const cleanup = () => {
      try {
        const script = document.getElementById('google-translate-script');
        if (script) {
          script.remove();
        }
        delete (window as any).google;
        delete (window as any).googleTranslateElementInit;

        const skipElements = document.querySelectorAll('.skiptranslate');
        skipElements.forEach((el) => el.remove());
        
        document.documentElement.classList.remove('translated-ltr', 'translated-rtl');
        document.body.classList.remove('translated-ltr', 'translated-rtl');
        
        // Remove style properties added by google translate
        document.body.style.removeProperty('top');
        document.body.style.removeProperty('position');
        document.documentElement.style.removeProperty('top');
        document.documentElement.style.removeProperty('position');
      } catch (error) {
        console.error('Error during Google Translate cleanup:', error);
      }
    };

    cleanup();

    // 2. Define init callback
    const initTranslate = () => {
      if (
        typeof window !== 'undefined' &&
        (window as any).google &&
        (window as any).google.translate &&
        (window as any).google.translate.TranslateElement
      ) {
        try {
          new (window as any).google.translate.TranslateElement(
            {
              pageLanguage: 'en',
              autoDisplay: false,
            },
            'google_translate_element'
          );
        } catch (error) {
          console.error('Error initializing Google Translate Element:', error);
        }
      }
    };

    (window as any).googleTranslateElementInit = initTranslate;

    // 3. Inject the script fresh
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.type = 'text/javascript';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);

    // 4. Return cleanup function
    return cleanup;
  }, []);

  return (
    <div className="translate-btn relative flex items-center justify-center w-10 h-10 bg-blue-700 rounded-xl cursor-pointer hover:bg-blue-600 transition-colors">
      <Languages size={20} className="text-white pointer-events-none" />
      <div id="google_translate_element" className="translate-widget-overlay"></div>
    </div>
  );
}
