import { isDevMode } from '@angular/core';

const GITHUB_DATA_URL = 'https://raw.githubusercontent.com/ozkurtomer/depo-dolu/main/data';

export const DATA_BASE_URL = isDevMode() ? '/data' : GITHUB_DATA_URL;
