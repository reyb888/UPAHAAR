'use client';

import { useEffect } from 'react';
import { Languages } from 'lucide-react';

export default function GoogleTranslate() {
  useEffect(() => {
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

    // If script is already loaded and window.google.translate is available, initialize immediately
    if (
      (window as any).google &&
      (window as any).google.translate &&
      (window as any).google.translate.TranslateElement
    ) {
      initTranslate();
    } else {
      // Set callback on window so that when script loads, it triggers this callback
      (window as any).googleTranslateElementInit = initTranslate;

      // Add Google Translate Script if it doesn't exist
      if (!document.getElementById('google-translate-script')) {
        const script = document.createElement('script');
        script.id = 'google-translate-script';
        script.type = 'text/javascript';
        script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        script.async = true;
        document.body.appendChild(script);
      }
    }

    // Clean up Google Translate DOM elements when component unmounts to prevent duplicate / stuck elements
    return () => {
      try {
        const skipElements = document.querySelectorAll('.skiptranslate');
        skipElements.forEach((el) => el.remove());
        document.documentElement.classList.remove('translated-ltr', 'translated-rtl');
        document.body.classList.remove('translated-ltr', 'translated-rtl');
      } catch (error) {
        console.error('Error cleaning up Google Translate elements:', error);
      }
    };
  }, []);

  return (
    <div className="translate-btn relative flex items-center justify-center w-10 h-10 bg-blue-700 rounded-xl cursor-pointer hover:bg-blue-600 transition-colors">
      <Languages size={20} className="text-white pointer-events-none" />
      <div id="google_translate_element" className="translate-widget-overlay"></div>
    </div>
  );
}
