---
name: rv-status
description: Check RV parking form completion status
disable-model-invocation: true
allowed-tools: Bash(npx tsx scripts/check-rv.ts)
---

Check who has filled out their RV parking form and who hasn't.

## Usage

```bash
npx tsx scripts/check-rv.ts
```

## What it shows
- Lists all registrants who were sent an RV form link
- Shows COMPLETED or PENDING status for each
- For completed forms: rig type, length, slide out, water, power, arrival day/time, comments, phone
- Summary count at the bottom

Run this anytime to see the current status of RV form submissions.
