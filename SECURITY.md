# Security

Do not put service account keys, Telegram bot tokens or private device data in an issue or pull request. Firebase and Telegram credentials belong in GitHub Actions secrets, never in the app bundle or public `data/` directory.

If GitHub's private vulnerability reporting is enabled, use **Security → Report a vulnerability** in this repository. Otherwise, report through GitHub's security reporting process; do not disclose exploit details in a public issue. This project does not promise a response time or offer a bug bounty.

The collector handles public price data. Notification topics identify a province and fuel, not a person. Firebase still processes device registration and delivery information under its own terms; this project does not claim that third-party services process no data.
