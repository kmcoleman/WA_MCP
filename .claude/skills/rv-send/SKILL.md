---
name: rv-send
description: Send RV parking form emails to new registrants
disable-model-invocation: true
allowed-tools: Bash(npx tsx scripts/send-rv-forms.ts *)
---

Send RV parking magic link emails to new registrants who haven't been emailed yet.

## Usage

**Dry run** (preview who will get emails, no emails sent):
```bash
npx tsx scripts/send-rv-forms.ts --dry-run
```

**Send for real**:
```bash
npx tsx scripts/send-rv-forms.ts
```

## How it works
- Queries the norcaladmin Postgres DB for 49er registrations with RV parking selected
- Checks `rv/index.json` on DO Spaces to skip anyone already emailed
- Generates a UUID token per new registrant, uploads initial form data to DO Spaces
- Sends each person an email via Resend with their personal magic link to `https://49er.bmwnorcal.org/rv/{token}`
- Updates `rv/index.json` with the new entries

Safe to re-run anytime — only new registrants get emailed.

If the user says `/rv-send` with no arguments, do a **dry run first** and show them who would get emails, then ask if they want to send for real.
