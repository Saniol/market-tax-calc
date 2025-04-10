import fetch from 'node-fetch';
import { getDateWithOffset } from './date';

const eurRates = new Map<string, number>();
const usdRates = new Map<string, number>();


type NbpRate =  { effectiveDate: string; mid: number };
type NbpRatesResponse = {
  rates: NbpRate[];
};
/**
 * Fetches PLN to EUR exchange rates for all dates in the year 2024 using a single API call.
 * @returns An object where keys are dates and values are exchange rates.
 * @throws Error if the API request fails or the rates are not available.
 */
async function getRatesForYear(currency: 'USD' | 'EUR', year: number): Promise<Map<string, number>> {
  const apiUrl = `https://api.nbp.pl/api/exchangerates/rates/A/${currency}/${year}-01-01/${year}-12-31/?format=json`;
  const rates = currency === 'USD' ? usdRates : eurRates;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
    }

    console.log(`Fetching exchange rates for ${currency}...`);
    const data = await response.json() as NbpRatesResponse;

    // Map the rates array to a date-to-rate object
    data.rates.forEach((rate) => {
      rates.set(rate.effectiveDate, rate.mid);
    });

    return rates;
  } catch (error) {
    throw new Error(`Error fetching PLN to EUR rates for 2024: ${(error as Error).message}`);
  }
};

export async function fetchRates(currency: 'USD' | 'EUR', year: number): Promise<Map<string, number>> {
  return getRatesForYear(currency, year)
}

export function getRate(currency: 'USD' | 'EUR', date: string): number {
  const rates = currency === 'USD' ? usdRates : eurRates;
  if (rates.size === 0) {
    throw new Error('Exchange rates not loaded. Please call fetchRates() first.');
  }

  // possible if a holiday, get one day before
  return rates.get(date) ?? rates.get(getDateWithOffset(date, -1)) as number;
}
