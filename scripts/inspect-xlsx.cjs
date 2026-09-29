const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, '..', 'data_source.xlsx');
const wb = XLSX.readFile(filePath);

console.log('Sheet names:', wb.SheetNames);

for (const name of wb.SheetNames) {
  const sheet = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log('\n=== Sheet:', name, '===');
  console.log('Row count:', rows.length);
  console.log('Header row:', JSON.stringify(rows[0]));
  console.log('Sample row 1:', JSON.stringify(rows[1]));
  console.log('Sample row 2:', JSON.stringify(rows[2]));
  console.log('Sample row 3:', JSON.stringify(rows[3]));
}
