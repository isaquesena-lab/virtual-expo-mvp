# Product brief

## Problem

An in-person expo disruption prevents planned meetings between exhibitors and visitors. Both groups need a low-friction way to find one another and start conversations remotely.

## Goal

Provide a simple, independent virtual expo experience with company discovery and a one-click link to a live meeting hosted by the exhibitor.

## Audience

- Exhibitor: registers a company, publishes a short pitch, shares a meeting link, and stays available to answer questions.
- Visitor: discovers companies through search, categories, or a visual hall without signing in.
- Moderator: checks submissions, prevents impersonation, and approves booth placement.

## Success signal

A visitor can find an active exhibitor and open its meeting quickly from mobile. Initially measure aggregated booth visits and outbound join clicks only if analytics are explicitly enabled and covered in the privacy notice.

## Core experience

### Visitor

1. Land on a mobile-friendly page explaining that this is an independent, temporary directory.
2. Filter by name, sector or booth number.
3. Open a booth modal with name, tagline, short pitch, website, and meeting button.
4. Open the external meeting in a new tab; the exhibitor controls admission.
5. Copy the direct booth URL to share.

### Exhibitor

1. Submit company name, short pitch, sector, original booth code (optional), meeting URL, and contact email.
2. Complete bot check and receive a private edit URL once a secure delivery method is available; do not expose the secret in public responses or logs.
3. Await moderator review.
4. Share its published booth URL and host the meeting independently.

### Moderator

1. Review pending submissions, detect duplicates, verify claims to a company/booth code.
2. Approve or reject and select a position on an original hall drawing.
3. Remove fraudulent or unsafe listings quickly.

## Quality requirements

- Mobile-first; keyboard-accessible fallback to a searchable list even if the map fails.
- Search and booth pages remain usable under high read traffic.
- No visitor account required.
- Minimize personal information.
- Clear indication that meetings are hosted by third parties.

## Open product choices

- Which exhibitors can register and how can ownership be verified?
- Is there a trusted source for exhibitor booth numbers?
- Will an authorized official floorplan be supplied, or should the app use a generic hall?
- Who will approve submissions during the event?
- Is the app a single-day event, or should booths remain accessible after the expo?
