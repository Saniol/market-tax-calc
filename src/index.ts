import * as path from 'node:path';
import { ExportRow, loadCsvToJson, writeJsonToCsv } from './services/csv';
import { fetchRates, getRate } from './services/nbp';
import { getEffectiveDate } from './services/date';

const TypeScore = {
  'Market order': 1,
  'Dividend': 2,
  'Deposit': 3,
  'Withdrawal': 4
};

const SideScore = {
  'Buy': -1,
  'Sell': 1,
  '': 0
};

// Sort function for stock transactions
function sortStockTransactions(transactionA: ExportRow, transactionB: ExportRow) {
  return transactionA['Asset symbol'].localeCompare(transactionB['Asset symbol']) ||
         TypeScore[transactionA.Type] - TypeScore[transactionB.Type] ||
         SideScore[transactionA.Side] - SideScore[transactionB.Side] ||
         new Date(transactionA['Order date']).getTime() - new Date(transactionB['Order date']).getTime();
};

// Sort function for crypto transactions
function sortCryptoTransactions(transactionA: ExportRow, transactionB: ExportRow) {
  return TypeScore[transactionA.Type] - TypeScore[transactionB.Type] ||
         SideScore[transactionA.Side] - SideScore[transactionB.Side] ||
         new Date(transactionA['Order date']).getTime() - new Date(transactionB['Order date']).getTime();
};

function groupByAsset(transactions: ExportRow[]) {
  const finalTransactions: (ExportRow | {})[] = [];
  for (let i = 0; i < transactions.length; i++) {
    finalTransactions.push(transactions[i]);
    if (
      i < transactions.length - 1 &&
      transactions[i]['Asset symbol'] !== transactions[i + 1]['Asset symbol']
    ) {
      finalTransactions.push({}); // Insert empty object between different 'Asset symbol' groups
    }
  }

  return finalTransactions;
}

function roundAmount(amount: string | number): number {
  const parsedAmount = Number(amount);
  return Math.round(parsedAmount * 100) / 100;
}

function formatAmount(amount: number): string {
  return String(amount).replace('.', ',');
}

// Main function to execute the script
const main = async () => {
  const args = process.argv.slice(2);
  const type = args[0]; // 'stock' or 'crypto'
  const filePath = args[1]; // Path to the CSV file

  if (!type || !filePath) {
    console.error('Usage: node index.js <type> <filePath>');
    process.exit(1);
  }

  const csvFilePath = path.resolve(filePath);
  const [jsonData] = await Promise.all([
    loadCsvToJson(csvFilePath),
    fetchRates('EUR', 2023),
    fetchRates('EUR', 2024),
    fetchRates('USD', 2023),
    fetchRates('USD', 2024)
  ]);

  const transactions: ExportRow[] = jsonData.map((item) => {
    const effectiveDate = getEffectiveDate(item, type === 'crypto');
    const feeEffectiveDate = getEffectiveDate(item, true);
    const rate = getRate(item['Market currency'], effectiveDate);
    const feeRate =  getRate('EUR', feeEffectiveDate);
    const quantityMultipler = item['Side'] === 'Sell' ? -1 : 1;
    const valueMultipler = item['Side'] === 'Buy' ? -1 : 1;

    return {
      'Order date': item['Date'],
      'Date for rate (a day before settlement)': effectiveDate,
      'Asset title': item['Asset title'],
      'Asset symbol': item['Asset symbol'],
      'Type': item['Type'],
      'Side': item['Side'],
      'Quantity': formatAmount(Number(item['Quantity'] || 0) * quantityMultipler),
      "Price in market currency": item['Price in market currency'],
      'Market currency': item['Market currency'],
      'Fee currency': 'EUR',
      
      'Rate for settlement': formatAmount(rate),
      'Rate for fee': formatAmount(feeRate),
      'Value in PLN': formatAmount(roundAmount(Number(item['Amount in market currency']) * rate) * valueMultipler),
      'Fee in PLN': formatAmount(roundAmount(Number(item['Fee']) * feeRate)),
      'Withholding tax in PLN': formatAmount(roundAmount(Number(item['Withholding tax in market currency']) * rate) * -1),
    };
  });

  const marketTransactions = transactions.filter(
    (item) => item.Type === 'Market order' || item.Type === 'Dividend'
  );

  const sortFn = type === 'stock' ? sortStockTransactions : sortCryptoTransactions;
  const sortedMarketTransactions = marketTransactions.sort(sortFn);

  const finalTransactions = type === 'stock'
    ? groupByAsset(sortedMarketTransactions)
    : sortedMarketTransactions;
  const outputFilePath = path.join(path.dirname(csvFilePath), `${type}s_sorted.csv`);

  await writeJsonToCsv(outputFilePath, finalTransactions);
};

main();