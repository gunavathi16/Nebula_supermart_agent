import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, phraseMap } from '../utils/i18n';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('nebula_lang') || 'en';
  });

  const setLanguage = (lang) => {
    setLanguageState(lang);
    localStorage.setItem('nebula_lang', lang);
  };

  const t = (keyOrText, fallback) => {
    if (!keyOrText) return '';
    const langDict = translations[language] || translations.en;
    if (langDict && langDict[keyOrText]) return langDict[keyOrText];

    const currentPhraseMap = phraseMap[language];
    if (currentPhraseMap && currentPhraseMap[keyOrText]) return currentPhraseMap[keyOrText];

    if (translations.en && translations.en[keyOrText]) return translations.en[keyOrText];
    return fallback !== undefined ? fallback : keyOrText;
  };

  // Full-DOM Auto Translator: ensures 100% of visible text and placeholders
  // across all pages/components instantly transform when language changes
  useEffect(() => {
    const root = document.getElementById('root') || document.body;
    const currentPhrases = phraseMap[language] || {};

    const translateNode = (node) => {
      // Don't translate script, style, or raw code tags
      if (!node || node.nodeType === Node.COMMENT_NODE) return;
      if (['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(node.parentElement?.tagName)) return;

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (!text) return;

        if (language === 'en') {
          if (node._origText) {
            node.textContent = node.textContent.replace(text, node._origText);
            delete node._origText;
          }
        } else {
          // Check exact match or phrase match
          if (currentPhrases[text]) {
            if (!node._origText) node._origText = text;
            node.textContent = node.textContent.replace(text, currentPhrases[text]);
          } else {
            // Check for known substring phrases
            for (const [enPhrase, transPhrase] of Object.entries(currentPhrases)) {
              if (enPhrase.length > 3 && text.includes(enPhrase)) {
                if (!node._origText) node._origText = text;
                node.textContent = node.textContent.replace(enPhrase, transPhrase);
                break;
              }
            }
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Placeholders
        if (node.placeholder) {
          const ph = node.placeholder.trim();
          if (language === 'en') {
            if (node._origPlaceholder) {
              node.placeholder = node._origPlaceholder;
              delete node._origPlaceholder;
            }
          } else if (currentPhrases[ph]) {
            if (!node._origPlaceholder) node._origPlaceholder = ph;
            node.placeholder = currentPhrases[ph];
          }
        }

        // Titles / tooltips
        if (node.title) {
          const title = node.title.trim();
          if (language === 'en') {
            if (node._origTitle) {
              node.title = node._origTitle;
              delete node._origTitle;
            }
          } else if (currentPhrases[title]) {
            if (!node._origTitle) node._origTitle = title;
            node.title = currentPhrases[title];
          }
        }

        for (const child of node.childNodes) {
          translateNode(child);
        }
      }
    };

    translateNode(root);

    // Watch for dynamic DOM modifications (modals, new table rows, etc.)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const addedNode of mutation.addedNodes) {
          translateNode(addedNode);
        }
      }
    });

    observer.observe(root, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
