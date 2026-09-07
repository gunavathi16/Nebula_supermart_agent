/**
 * Multi-language support (English, Hindi, Tamil) for Nebula Supermarket & Retail Bot.
 * Supports script detection, Hinglish / Tanglish romanized detection, grocery synonyms, and localized responses.
 */

export const SUPPORTED_LANGUAGES = {
  en: { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  hi: { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  ta: { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' }
};

// Common grocery product synonyms across Hindi, Tamil, and English
export const PRODUCT_SYNONYMS = {
  sugar: {
    en: ['sugar', 'white sugar', 'loose sugar'],
    hi: ['chini', 'cheeni', 'shakkar', 'चीनी', 'शक्कर'],
    ta: ['sarkarai', 'chakkara', 'sakkarai', 'சர்க்கரை']
  },
  milk: {
    en: ['milk', 'dairy milk', 'fresh milk', 'packet milk'],
    hi: ['doodh', 'dudh', 'दूध'],
    ta: ['paal', 'pal', 'பால்']
  },
  rice: {
    en: ['rice', 'raw rice', 'boiled rice', 'sona masoori'],
    hi: ['chawal', 'chaval', 'चावल'],
    ta: ['arisi', 'arici', 'saadham', 'அரிசி']
  },
  atta: {
    en: ['atta', 'wheat flour', 'flour', 'gehun'],
    hi: ['aata', 'atta', 'gehu', 'आटा', 'गेहूं'],
    ta: ['maavu', 'kothumai maavu', 'atta', 'மாவு', 'கோதுமை']
  },
  oil: {
    en: ['oil', 'cooking oil', 'sunflower oil'],
    hi: ['tel', 'tail', 'refined tel', 'तेल'],
    ta: ['ennai', 'yennai', 'oil', 'எண்ணெய்']
  },
  salt: {
    en: ['salt', 'tata salt', 'table salt'],
    hi: ['namak', 'tata namak', 'नमक'],
    ta: ['uppu', 'tata uppu', 'உப்பு']
  },
  butter: {
    en: ['butter', 'amul butter'],
    hi: ['makkhan', 'makhan', 'maska', 'मक्खन'],
    ta: ['vennai', 'venna', 'வெண்ணெய்']
  },
  soap: {
    en: ['soap', 'bath soap', 'dettol'],
    hi: ['sabun', 'saabun', 'साबुन'],
    ta: ['soppu', 'soap', 'சோப்பு']
  },
  dal: {
    en: ['dal', 'toor dal', 'lentils', 'pulses'],
    hi: ['dal', 'daal', 'toor dal', 'दाल', 'तूर दाल'],
    ta: ['paruppu', 'thooram paruppu', 'பருப்பு', 'துவரம் பருப்பு']
  },
  tea: {
    en: ['tea', 'chai', 'tea powder'],
    hi: ['chai', 'chaay', 'patti', 'चाय'],
    ta: ['tea', 'theeneer', 'theela', 'தேநீர்']
  }
};

/**
 * Detect language of a message: 'hi', 'ta', or 'en'
 */
export function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'en';

  // 1. Devanagari script detection (Hindi)
  if (/[\u0900-\u097F]/.test(text)) {
    return 'hi';
  }

  // 2. Tamil script detection
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return 'ta';
  }

  const lower = text.toLowerCase();

  // 3. Hinglish keywords
  const hinglishMarkers = [
    /\bkitna\b/, /\bkitne\b/, /\bbanao\b/, /\bkaro\b/, /\bhai\b/, /\bhain\b/, /\bka\b/, /\bki\b/,
    /\bko\b/, /\bmein\b/, /\baaj\b/, /\bchahiye\b/, /\bdena\b/, /\bdaalo\b/, /\bkholo\b/,
    /\bdoodh\b/, /\bchini\b/, /\bchawal\b/, /\bmakkhan\b/, /\bnamak\b/, /\bpaise\b/, /\brupaye\b/,
    /\bbaaki\b/, /\bkhata\b/, /\bkaat\b/, /\bkhatam\b/
  ];
  if (hinglishMarkers.some(re => re.test(lower))) {
    return 'hi';
  }

  // 4. Tanglish keywords
  const tanglishMarkers = [
    /\bevvalo\b/, /\bevvalavu\b/, /\bpodu\b/, /\bpannu\b/, /\birukka\b/, /\bvenum\b/, /\bkaattu\b/,
    /\binru\b/, /\binnaiki\b/, /\bkodunga\b/, /\bparuppu\b/, /\barisi\b/, /\bpaal\b/, /\bsarkarai\b/,
    /\bvennai\b/, /\bpanam\b/, /\bvelai\b/, /\bmeethi\b/, /\bbaaki\b/
  ];
  if (tanglishMarkers.some(re => re.test(lower))) {
    return 'ta';
  }

  return 'en';
}

/**
 * Normalize Hindi or Tamil grocery terms to standard English catalog search terms.
 */
export function normalizeLanguageTerms(text) {
  let normalized = text;

  for (const [canonical, synMap] of Object.entries(PRODUCT_SYNONYMS)) {
    const allWords = [...(synMap.hi || []), ...(synMap.ta || [])];
    for (const w of allWords) {
      const regex = new RegExp(`\\b${w}\\b`, 'gi');
      normalized = normalized.replace(regex, canonical);
    }
  }

  // Normalize actions
  normalized = normalized
    // Hindi billing & queries
    .replace(/\bbill banao\b/gi, 'make a bill')
    .replace(/\bbill kaato\b/gi, 'make a bill')
    .replace(/\bkitna baaki\b/gi, 'balance')
    .replace(/\bka khata\b/gi, 'balance')
    .replace(/\bbhav\b|\brate kya hai\b/gi, 'price of')
    .replace(/\bkya stock mein hai\b/gi, 'is in stock')
    // Tamil billing & queries
    .replace(/\bbill podu\b/gi, 'make a bill')
    .replace(/\bevvallavu baaki\b/gi, 'balance')
    .replace(/\bbalance evvalo\b/gi, 'balance')
    .replace(/\bvelai enna\b/gi, 'price of')
    .replace(/\bstock irukka\b/gi, 'is in stock');

  return normalized;
}

/**
 * Localized system responses for key actions
 */
export const MESSAGES = {
  en: {
    welcome: '🏪 *Nebula Supermarket • Store Ops (Munimji)*\n_Daily Provisions • Honest Measures • Lasting Trust_',
    bill_finalized: (num, amt, mode) => `✅ *Bill #${num} Finalized with ${mode.toUpperCase()}!*\n• Total: *₹${amt}*`,
    stock_replenished: (qty, unit, name, newStock) => `✅ *Stock Replenishment Recorded!*\nReceived ${qty} ${unit} of *${name}*.\nNew Stock Level: *${newStock} ${unit}*`,
    khata_credit_added: (amt, name, bal) => `📒 *Store Credit Added to Khata!*\nAdded *₹${amt}* for *${name}*.\n• New Outstanding: *₹${bal}*`,
    khata_payment: (amt, name, bal) => `✅ *Khata Payment Recorded!*\nReceived *₹${amt}* from *${name}*.\n• Remaining Balance: *₹${bal}*`,
    reminder_title: (name) => `📢 *Payment Reminder for ${name}*`,
    reminder_text: (name, amt, store, upi) => `Dear ${name}, this is a gentle payment reminder from ${store}. Your pending Khata balance is ₹${amt}. Kindly pay via UPI to: ${upi}. Thank you for shopping with us!`,
    lang_switched: '🌐 *Language switched to English.* I will now respond in English.'
  },
  hi: {
    welcome: '🏪 *नेबुला सुपरमार्केट • स्टोर ऑप्स (मुनीम जी)*\n_पक्का सामान, पक्का हिसाब_',
    bill_finalized: (num, amt, mode) => `✅ *बिल #${num} सफलतापूर्वक फाइनल हो गया (${mode.toUpperCase()})!*\n• कुल राशि: *₹${amt}*`,
    stock_replenished: (qty, unit, name, newStock) => `✅ *स्टॉक आवक दर्ज कर ली गई!*\n*${name}* का ${qty} ${unit} प्राप्त हुआ।\nनया स्टॉक: *${newStock} ${unit}*`,
    khata_credit_added: (amt, name, bal) => `📒 *खाता में उधार दर्ज हुआ!*\n*${name}* के खाते में *₹${amt}* जोड़े गए।\n• कुल बकाया: *₹${bal}*`,
    khata_payment: (amt, name, bal) => `✅ *खाता भुगतान प्राप्त हुआ!*\n*${name}* से *₹${amt}* प्राप्त हुए।\n• शेष बकाया राशि: *₹${bal}*`,
    reminder_title: (name) => `📢 *${name} के लिए भुगतान अनुस्मारक*`,
    reminder_text: (name, amt, store, upi) => `नमस्ते ${name} जी, ${store} से यह एक विनम्र भुगतान अनुस्मारक है। आपका खाता बकाया ₹${amt} है। कृपया इस UPI पर भुगतान करें: ${upi}। आपके सहयोग के लिए धन्यवाद!`,
    lang_switched: '🌐 *भाषा हिन्दी में बदल दी गई है।* अब मैं आपसे हिन्दी में बात करूँगा।'
  },
  ta: {
    welcome: '🏪 *நெபுலா சூப்பர் மார்க்கெட் • ஸ்டோர் ஆப்ஸ் (முனீம்ஜி)*',
    bill_finalized: (num, amt, mode) => `✅ *பில் #${num} வெற்றிகரமாக உருவாக்கப்பட்டது (${mode.toUpperCase()})!*\n• மொத்த தொகை: *₹${amt}*`,
    stock_replenished: (qty, unit, name, newStock) => `✅ *சரக்கு இருப்பு சேர்க்கப்பட்டது!*\n*${name}* - ${qty} ${unit} வரவு வைக்கப்பட்டது.\nபுதிய இருப்பு: *${newStock} ${unit}*`,
    khata_credit_added: (amt, name, bal) => `📒 *கடன் கணக்கில் வரவு சேர்க்கப்பட்டது!*\n*${name}* கணக்கில் *₹${amt}* சேர்க்கப்பட்டது.\n• புதிய பாக்கி தொகை: *₹${bal}*`,
    khata_payment: (amt, name, bal) => `✅ *கடன் பாக்கி வசூலிக்கப்பட்டது!*\n*${name}* இடம் இருந்து *₹${amt}* பெறப்பட்டது.\n• மீதமுள்ள பாக்கி தொகை: *₹${bal}*`,
    reminder_title: (name) => `📢 *${name} - கட்டண நினைவூட்டல்*`,
    reminder_text: (name, amt, store, upi) => `வணக்கம் ${name}, ${store} சார்பாக இந்த கட்டண நினைவூட்டல். உங்கள் நிலுவை பாக்கி தொகை ₹${amt}. தயவுசெய்து இந்த UPI மூலம் செலுத்தவும்: ${upi}. நன்றி!`,
    lang_switched: '🌐 *மொழி தமிழுக்கு மாற்றப்பட்டது.* இனி உங்களுடன் தமிழில் உரையாடுவேன்.'
  }
};
