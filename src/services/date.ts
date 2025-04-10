import { CsvRow } from "./csv";

export function getDateWithOffset(date: string, offset: number): string {
  const effectiveDate = new Date(new Date(date).getTime() + offset * 24 * 60 * 60 * 1000);

  if (effectiveDate.getDay() === 0) {
    effectiveDate.setDate(effectiveDate.getDate() - 2); // If Sunday, go back to Friday
  } else if (effectiveDate.getDay() === 6) {
    effectiveDate.setDate(effectiveDate.getDate() - 1); // If Saturday, go back to Friday
  }
  
  return effectiveDate.toISOString().split('T')[0]; // Format YYYY-MM-DD

}

export function getEffectiveDate(item: CsvRow, forceDayBefore: boolean): string {
  const date = item.Date;
  const beforeUSChange = new Date(date).getTime() < new Date('2024-05-28').getTime(); // US market change from T+1 to T+2 standard settlement
  let effectiveDateDiff = item['Market currency'] !== 'USD' || beforeUSChange ? 1 : 0; // T+2 or T+1, previous day before settlement
  if (forceDayBefore) {
    effectiveDateDiff = -1; // fee or crypto
  }

  return getDateWithOffset(date, effectiveDateDiff);
}