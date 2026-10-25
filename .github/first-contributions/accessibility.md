## Why

People should be able to choose a province without a mouse and understand the selection with assistive technology.

## Suggested scope

Test `app/src/app/setup/` with the keyboard and, if available, a screen reader. Check search, focus visibility, selection feedback and the back action. Start with one reproducible problem rather than redesigning the screen.

## Acceptance

- Describe the device/browser and steps to reproduce.
- Include a small fix with before/after behavior or document that the tested path already works.
- Keep Turkish province names searchable, including Şanlıurfa, Iğdır and İstanbul's two regions.
- `cd app && npm test && npm run build` passes.

No Firebase account is required. English or Turkish reports are welcome.
