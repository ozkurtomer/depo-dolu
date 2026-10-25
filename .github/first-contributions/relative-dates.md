## Why

The app shows relative timestamps such as “az önce”, “dün” and a calendar date. Boundary cases should behave consistently on Windows and Linux.

## Suggested scope

- Inspect `app/src/app/format.ts` (`ago` and `shortDate`).
- Add cases for just before/after midnight, month/year transitions and timestamps with explicit offsets.
- Use a fixed `now` argument and deterministic inputs; avoid the current clock.
- Document whether each case uses the viewer's timezone or Turkey time.

## Acceptance

`cd app && npm test` passes and the cases explain the expected Turkish label. If a case reveals a behavior change, describe it before changing the formatter.

Small first contribution; no Firebase setup is needed. English or Turkish discussion is welcome.
