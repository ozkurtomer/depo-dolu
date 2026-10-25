// Node.js 22.18+, no dependencies. See examples/README.md.
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

const URL = 'https://raw.githubusercontent.com/ozkurtomer/depo-dolu/main/data/latest.json';

try {
  const { values } = parseArgs({ options: {
    city: { type: 'string', default: 'bursa' },
    fuel: { type: 'string', default: 'motorin' },
    file: { type: 'string' },
    help: { type: 'boolean', default: false },
  } });
  if (values.help) {
    console.log('node examples/prices.mjs [--city bursa] [--fuel motorin] [--file data/latest.json]');
  } else {
    if (!['benzin', 'motorin', 'lpg'].includes(values.fuel)) throw new Error('Fuel must be benzin, motorin or lpg');
    let data;
    if (values.file) {
      data = JSON.parse(await readFile(values.file, 'utf8'));
    } else {
      const response = await fetch(URL, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = await response.json();
    }
    if (!data.prices || !Object.hasOwn(data.prices, values.city))
      throw new Error(`Unknown province: ${values.city}. Read valid slugs from latest.json.`);
    const city = data.prices[values.city];
    const price = city[values.fuel];
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0)
      throw new Error(`Price unavailable for ${values.city}/${values.fuel}`);
    console.log(`${city.name} / ${values.fuel}: ${price.toFixed(2)} TRY/L`);
    console.log(`Last stored update: ${data.updatedAt ?? 'unknown'}`);
    console.log('Source: Petrol Ofisi province list; individual pump prices may differ.');
  }
} catch (error) {
  console.error(`Could not read price data: ${error.message}`);
  process.exitCode = 1;
}
