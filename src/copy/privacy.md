# Privacy Policy

**Last updated: September 7, 2026**

LayerPorter is designed to collect as little data as practical. This policy describes the website, its browser extensions, installation and uninstall pages, limited first-party operational telemetry, and optional analytics used to understand whether a landing-page visit leads to an extension installation.

## Your files and downloaded content

File conversion tools on LayerPorter process files locally in your browser unless a feature clearly states otherwise. For the Pinterest Downloader extension, the content you choose to download is handled for the download feature and is not sent to LayerPorter analytics. Our website telemetry and installation attribution do not collect the pages you browse outside LayerPorter, the Pins you view, or the files you download.

## Accounts

LayerPorter does not require an account for the website converters or Pinterest Downloader. We do not require your name or email address to measure website usage or attribute an installation.

## Controller and legal bases

LayerPorter is the controller for the first-party website and extension telemetry described in this policy. Privacy enquiries can be sent to [hello@layerporter.com](mailto:hello@layerporter.com).

Where applicable privacy law requires a legal basis:
- optional landing attribution and optional third-party analytics are based on your consent;
- limited first-party operational telemetry is used to operate, secure, debug, and measure the reliability and basic usage of the product, based on our legitimate interests where that basis is available;
- feedback is processed because you choose to submit it and so we can respond to or act on your request.

If applicable law requires consent for a particular processing activity, consent takes priority over legitimate interests.

## Cookies and privacy choices {#cookies}

The core first-party website telemetry described below does **not** create an analytics cookie and does not write an analytics identifier to `localStorage` or `sessionStorage`. A random page-scoped identifier exists only in memory while the current page is open and is replaced after navigation.

LayerPorter uses a small number of first-party cookies for privacy preferences and, only if you allow optional analytics, installation attribution.

- **`lp_privacy`** remembers whether you allowed or declined optional analytics. It is a first-party preference cookie and may remain for up to 180 days so we do not repeatedly ask the same question.
- **`lp_pd_attr`** is optional. It is created only after you allow analytics on a Pinterest Downloader landing page. It may remain for up to 14 days and is deleted after a successful attributed installation when possible.
- The attribution cookie contains only a normalized source category (for example Google organic, Yandex organic, paid, referral or direct), the landing-page language, the install button position, and the time of the landing visit. It does **not** contain a browsing-history list, full referrer URL, Pinterest content, downloaded-file data, an email address, or an advertising identifier.
- If your browser exposes Global Privacy Control or a Do Not Track signal that we support, optional landing attribution is not created.
- Declining optional analytics does not affect access to the landing page, Chrome Web Store link, extension, or downloads.

You can reset your LayerPorter privacy choice on this Privacy Policy page. Clearing site cookies in your browser also removes the preference and attribution cookies.

## First-party website telemetry

LayerPorter may record a limited first-party event when you open or use a LayerPorter page so we can understand whether pages and tools work and which product flows are actually used.

A website event may include:

- a normalized LayerPorter route such as `/convert/pdf-to-jpg/` rather than the full URL or query string;
- an event type such as page viewed, tool opened, conversion completed, download clicked, or extension-store link clicked;
- interface language;
- a randomly generated identifier that exists only for the lifetime of the current page and is not written to browser storage;
- limited technical event fields such as the selected conversion target or UI placement where needed to understand the funnel.

This telemetry does **not** include file contents, file names, page text, form contents, email addresses, full referrer URLs, URL query strings, Pinterest content, or a persistent cross-page analytics identifier. Unknown or arbitrary URL paths are reduced to a generic `/other/` bucket instead of being stored verbatim.

First-party website events are sent to a same-origin LayerPorter endpoint and may be retained in Cloudflare KV for up to 180 days for aggregate product and reliability statistics. LayerPorter may also use Cloudflare infrastructure-level analytics where available to operate and secure the service.

## Installation and onboarding telemetry

When a LayerPorter extension opens its installation or welcome flow, we may record a limited first-party operational event so we can count installs, diagnose onboarding problems, and understand whether the user reached key onboarding steps.

For Pinterest Downloader, an installation record may include:

- a randomly generated installation-session identifier;
- product code and extension version;
- interface locale;
- country-level location supplied by Cloudflare from the request;
- onboarding state such as welcome opened, extension pinned, panel opened, or onboarding abandoned;
- if you previously allowed landing attribution: source category, landing language, CTA position, and approximate number of days between the landing visit and installation.

This telemetry does not include browsing history, page contents, Pinterest URLs, downloaded images/videos/GIFs, file names, or the contents of downloads.

Installation session records are stored in Cloudflare KV for up to 90 days. Count-level event records may be retained for up to 180 days for aggregate operational statistics. A private Telegram channel may receive a compact operational notification about an install or uninstall so the operator can monitor product health. These notifications use the same limited fields described above and do not include browsing content.

## Optional website analytics

Some LayerPorter pages may offer additional analytics or installation attribution only after the required privacy choice has been made. Where Yandex Metrica is enabled, it is not loaded before analytics consent and is not used for advertising or cross-site profiling by LayerPorter. We limit its use to understanding the performance of our own pages and onboarding.

Optional analytics is separate from the minimal first-party operational telemetry described above. Declining optional analytics prevents the optional attribution and third-party analytics described in this section.

Cloudflare necessarily processes network request information to deliver and secure the site. LayerPorter does not use that infrastructure data to build advertising profiles.

## Browser extensions {#extensions}

LayerPorter extensions use only the permissions needed for their disclosed user-facing features. Different extensions have different functions, so the exact permissions are shown by Chrome before installation and in the Chrome Web Store listing.

For Pinterest Downloader, operational analytics and landing attribution are not used to collect general web browsing activity. The extension does not need a Chrome `cookies` permission for the landing attribution described above: the first-party LayerPorter welcome page reads the LayerPorter cookie on the LayerPorter domain after an installation.

LayerPorter does not sell extension user data, does not use it for personalized advertising, and does not transfer browsing activity to data brokers.

**Chrome Web Store Limited Use.** The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Feedback you send us

Feedback forms and uninstall pages collect information only when you choose to submit it, such as selected reasons, a comment, and an email address if a form explicitly offers an optional reply address.

- **Purpose.** We use submissions to fix bugs, evaluate feature requests, and improve the product.
- **Storage and delivery.** A submission may be stored in Cloudflare KV for up to 90 days and delivered to a private Telegram channel used by the operator.
- **Deletion.** Email [hello@layerporter.com](mailto:hello@layerporter.com) to request deletion of a feedback submission before its scheduled expiry where we can reasonably identify it.

## Service providers

LayerPorter currently relies on:

- **Cloudflare** for website delivery, security, serverless functions, KV storage, and first-party operational telemetry infrastructure;
- **Telegram** for private operational notifications and submitted feedback;
- **Yandex Metrica** only where optional analytics is enabled after the relevant privacy choice.

Their own privacy and security terms apply to their processing. We do not sell personal data to these providers.

## Your choices

You may decline optional analytics and still use the service. You may withdraw a previous optional-analytics choice by using the privacy reset control on this page or by clearing LayerPorter site data in your browser.

Where applicable law gives you a right to object to processing based on legitimate interests, you may contact [hello@layerporter.com](mailto:hello@layerporter.com) regarding the limited first-party operational telemetry described above.

Because we intentionally avoid accounts and direct identifiers for website telemetry and installation attribution, we may not be able to locate a specific anonymous telemetry record from a name or email address alone.

## Your privacy rights

Depending on where you live, you may have rights to request access, correction, deletion, restriction, portability, or objection to processing, and to withdraw consent at any time. You may also have the right to complain to your local data-protection authority.

Because website telemetry and installation attribution are intentionally pseudonymous and do not use an account, name, or email address, we may not be able to identify a particular anonymous record from your identity alone. We will not collect additional identifying data solely to identify an otherwise anonymous record.

## Security

LayerPorter uses HTTPS for website and API traffic. We minimize telemetry fields and avoid sending file contents, browsing content, full URLs, page text, or other unnecessary data to analytics endpoints.

## Changes to this policy

We may update this policy when product behavior or legal requirements change. The current version and last-updated date will be posted here.

## Contact

Privacy questions or requests: [hello@layerporter.com](mailto:hello@layerporter.com)
