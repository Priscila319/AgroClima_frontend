/** Metadados visuais das cinco variedades já presentes no frontend e semeadas no backend. */
export const DEFAULT_VARIETY = 'Uva Itália';

export const VARIETIES = [
  { name: 'Uva Itália', short: 'Itália', type: 'Uva de mesa', color: 'green' },
  { name: 'Crimson Seedless', short: 'Crimson', type: 'Sem sementes', color: 'wine' },
  { name: 'Thompson Seedless', short: 'Thompson', type: 'Sem sementes', color: 'gold' },
  { name: 'Sweet Globe', short: 'Sweet Globe', type: 'Sem sementes', color: 'blue' },
  { name: 'Uva Vitória', short: 'Vitória', type: 'Sem sementes', color: 'purple' },
];

export const findVariety = (name) => VARIETIES.find((variety) => variety.name === name);
