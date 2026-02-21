/**
 * Send a waiver signing reminder to a WA contact
 *
 * Usage:
 *   npx tsx scripts/send-waiver-reminder.ts <contactId> <waiverUrl> [eventName]
 *
 * Examples:
 *   npx tsx scripts/send-waiver-reminder.ts 95136814 https://norcaladmin.fpathdev.com/waiver-signed/abc123
 *   npx tsx scripts/send-waiver-reminder.ts 95136814 https://norcaladmin.fpathdev.com/waiver-signed/abc123 "Plaskett Creek Campout"
 */
import { readFileSync } from 'fs';

const envFile = readFileSync(new URL('../.env', import.meta.url), 'utf-8');
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

import { loadConfig } from '../src/config.js';
import { createClient } from '../src/client.js';

async function main() {
  const contactId = parseInt(process.argv[2], 10);
  const waiverUrl = process.argv[3];
  const eventName = process.argv[4] || 'the upcoming event';

  if (!contactId || !waiverUrl) {
    console.error('Usage: npx tsx scripts/send-waiver-reminder.ts <contactId> <waiverUrl> [eventName]');
    console.error('Example: npx tsx scripts/send-waiver-reminder.ts 95136814 https://norcaladmin.fpathdev.com/waiver-signed/abc123 "Plaskett Creek"');
    process.exit(1);
  }

  const config = loadConfig();
  const client = createClient(config);

  // Fetch contact name
  const contact = await client.get<{ FirstName: string; LastName: string }>(`/contacts/${contactId}`);

  const subject = `${eventName} — Waiver Signing Request`;

  const body = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 680px; margin: 0 auto; line-height: 1.6; color: #333; font-size: 15px;">

<p>Hi ${contact.FirstName},</p>

<p>Please check your email for a <strong>waiver signing request</strong> for ${eventName} from <strong>esignatures.com</strong>.</p>

<p>I'm sending this follow-up via our club system in case the original email ended up in your spam folder. Please check both your inbox and spam folder.</p>

<p>If you can't find it, you can sign directly here:</p>

<p style="text-align: center; margin: 24px 0;">
  <a href="${waiverUrl}" style="display: inline-block; background: #0066B1; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">Sign Waiver</a>
</p>

<p>If you still don't see it and the link above doesn't work, please let me know and I'll research further.</p>

<p>Thanks,<br>Kev</p>

</div>`;

  console.log(`Sending waiver reminder to ${contact.FirstName} ${contact.LastName} (ID: ${contactId})...`);
  console.log(`Event: ${eventName}`);
  console.log(`Waiver URL: ${waiverUrl}`);

  const result = await client.rpc('email/SendEmail', {
    Subject: subject,
    Body: body,
    Recipients: [{ Id: contactId }],
  });

  console.log('Result:', JSON.stringify(result, null, 2));
  console.log('Email sent successfully!');
}

main().catch(e => { console.error(e); process.exit(1); });
