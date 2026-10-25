"""A tiny price API client using only Python's standard library."""
import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

URL = 'https://raw.githubusercontent.com/ozkurtomer/depo-dolu/main/data/latest.json'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--city', default='bursa', help='Stable province slug, e.g. istanbul-avrupa')
    parser.add_argument('--fuel', choices=['benzin', 'motorin', 'lpg'], default='motorin')
    parser.add_argument('--file', type=Path, help='Read local JSON instead of requesting the API')
    args = parser.parse_args()
    try:
        if args.file:
            data = json.loads(args.file.read_text(encoding='utf-8'))
        else:
            request = urllib.request.Request(URL, headers={'User-Agent': 'DepoDolu-example/1.0'})
            with urllib.request.urlopen(request, timeout=15) as response:
                data = json.load(response)
        city = data.get('prices', {}).get(args.city)
        if city is None:
            raise ValueError(f'Unknown province: {args.city}. Read valid slugs from latest.json.')
        price = city.get(args.fuel)
        if type(price) not in (int, float) or price <= 0:
            raise ValueError(f'Price unavailable for {args.city}/{args.fuel}')
        print(f"{city['name']} / {args.fuel}: {price:.2f} TRY/L")
        print(f"Last stored update: {data.get('updatedAt', 'unknown')}")
        print('Source: Petrol Ofisi province list; individual pump prices may differ.')
        return 0
    except (OSError, urllib.error.URLError, ValueError, KeyError, TypeError) as error:
        print(f'Could not read price data: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
