import * as fs from 'node:fs';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';

export type CsvRow = {
  "Date": string;
  "Asset title": string;
  "Asset symbol": string;
  "Type": 'Market order' | 'Deposit' | 'Dividend' | 'Withdrawal';
  "Side": 'Buy' | 'Sell' | '';
  "Quantity": string;
  "Market currency": 'EUR' | 'USD';
  "Price in market currency": string;
  "Amount in market currency": string;
  "User currency": string;
  "FX rate": string;
  "Amount in user currency": string;
  "Fee": string;
  "Withholding tax in market currency": string;
}

export type ExportRow = {
  "Order date": string;
  'Date for rate (a day before settlement)': string;
  "Asset title": string;
  "Asset symbol": string;
  "Type": 'Market order' | 'Deposit' | 'Dividend' | 'Withdrawal';
  "Side": 'Buy' | 'Sell' | '';
  "Quantity": string;
  "Price in market currency": string;
  "Market currency": 'EUR' | 'USD';
  "Fee currency": 'EUR';
  
  'Rate for settlement': string;
  'Rate for fee': string;
  'Value in PLN': string;
  'Fee in PLN': string;
  'Withholding tax in PLN': string;
}

export async function loadCsvToJson(filePath: string): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const data: CsvRow[] = [];
    const parser = fs.createReadStream(filePath).pipe(parse({ columns: true, delimiter: ';' }));

    parser.on('data', (row) => {
      data.push(row);
    });

    parser.on('end', () => {
      resolve(data);
    });

    parser.on('error', (error) => {
      reject(error);
    });
  });
}

export async function writeJsonToCsv(filePath: string, data: Partial<ExportRow>[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const writableStream = fs.createWriteStream(filePath);
    const stringifier = stringify({
      header: true,
      delimiter: ';',
      columns: Object.keys(data[0] || {}) // Dynamically get column headers from the first object
    });

    stringifier.on('error', (error) => reject(error));
    writableStream.on('error', (error) => reject(error));
    writableStream.on('finish', () => resolve());

    data.forEach((row) => stringifier.write(row));
    stringifier.end();
    stringifier.pipe(writableStream);
  });
}