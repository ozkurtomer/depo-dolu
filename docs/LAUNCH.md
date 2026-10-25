# Sharing and launch checklist

## Repository presentation

Suggested GitHub About description:

> Turkey fuel prices for 81 provinces: open JSON API, price history, tank calculator and alerts. Built with .NET, Angular and Ionic.

Website: `https://ozkurtomer.github.io/depo-dolu/`

Suggested topics: `turkey`, `fuel-prices`, `open-data`, `dotnet`, `angular`, `ionic`, `telegram-bot`, `github-actions`.

Upload `docs/social-preview.png` as the repository social preview. The app uses a matching card at its public web URL. About fields, topics and the social preview are GitHub settings; files in this repository do not update them automatically.

For exact steps, prepared issue bodies and an optional GitHub CLI setup tool, see [GITHUB_SETUP.md](GITHUB_SETUP.md). Reviewable announcement drafts are in [LAUNCH_COPY.md](LAUNCH_COPY.md).

## Before announcing

- Run the checks from CONTRIBUTING.md and confirm the deployed demo works on a phone.
- Verify one scheduled collector run. Test notifications only through the explicitly labelled test workflow; it sends real messages.
- Prepare a short screen recording of selecting a province, changing fuel, calculating a tank and sharing its link.
- Create a release only after deciding the version and testing it. Include the known limits: one distributor, scheduled checks, Android packaging still pending.
- Enable private vulnerability reporting if the repository supports it.

## Invite useful participation

- Start with Turkish developer communities and open-data users; explain what can be built with the API.
- Share examples and a working demo with each announcement. Avoid posting the same promotional text repeatedly.
- Turn the small tasks in ROADMAP.md into issues and label the suitable ones `good first issue`.
- Invite users to report a specific price or usability problem, and invite developers to share projects built with the data.
- Keep a “Built with Depo Dolu” list once real examples exist. Do not invent users, endorsements or usage numbers.

## After launch

Watch actual feedback, reproducible bugs and returning users alongside GitHub stars. Ship the mobile app and Chrome extension after validating which workflow people use most. No distribution plan can guarantee stars or adoption.
