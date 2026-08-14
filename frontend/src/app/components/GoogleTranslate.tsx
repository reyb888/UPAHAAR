'use client';

import { useEffect } from 'react';
import { Languages } from 'lucide-react';

export default function GoogleTranslate() {
  useEffect(() => {
    // Add Google Translate Script if it doesn't exist
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.type = 'text/javascript';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);

      // Define the callback function globally
      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
          },
          'google_translate_element'
        );
      };
    }
  }, []);

  return (
    <div className="translate-btn relative flex items-center justify-center w-10 h-10 bg-blue-700 rounded-xl cursor-pointer hover:bg-blue-600 transition-colors">
      <Languages size={20} className="text-white pointer-events-none" />
      <div id="google_translate_element" className="translate-widget-overlay"></div>
    </div>
  );
}
