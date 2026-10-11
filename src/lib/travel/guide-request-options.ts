// Form choices are traveler preferences, not claims about guide availability or prices.
export const guideCities = ['Beijing', 'Shanghai', 'Xi’an', 'Chengdu', 'Chongqing', 'Guilin', 'Hangzhou', 'Suzhou', 'Zhangjiajie', 'Guangzhou', 'Shenzhen'] as const;
export const guideLanguages = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Japanese', 'Korean', 'Arabic', 'Mandarin Chinese', 'Other (please specify in notes)'] as const;
export const guideBudgets = ['Under USD 1,000', 'USD 1,000–3,000', 'USD 3,000–5,000', 'USD 5,000–10,000', 'USD 10,000+'] as const;

export function formatGuideDestinations(cities: readonly string[], additionalPlaces: string) {
  return [...cities, additionalPlaces.trim()].filter(Boolean).join(', ');
}
