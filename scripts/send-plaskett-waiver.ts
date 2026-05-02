/**
 * Find Joe Kid Flores and send waiver reminder
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
  const config = loadConfig();
  const client = createClient(config);

  const contactId = 32996416;
  const contact = { FirstName: 'Joe Kid' };

  const subject = 'Plaskett Creek Campout — Waiver Signing Request';

  const body = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 680px; margin: 0 auto; line-height: 1.6; color: #333; font-size: 15px;">

<p>Hi ${contact.FirstName},</p>

<p>Please check your email for a <strong>waiver signing request</strong> for the Plaskett Creek Campout from <strong>esignatures.com</strong>.</p>

<p>I'm sending this follow-up via our club system in case the original email ended up in your spam folder. Please check both your inbox and spam folder.</p>

<p>If you can't find it, you can sign directly here:</p>

<p style="text-align: center; margin: 24px 0;">
  <a href="https://norcaladmin.fpathdev.com/waiver-signed/cmlvd8gnq00e20rcgep5d4txw" style="display: inline-block; background: #0066B1; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">Sign Waiver</a>
</p>

<p>If you still don't see it and the link above doesn't work, please let me know and I'll research further.</p>

<p>Thanks,<br>Kev</p>

</div>`;

  console.log(`\nSending to ${contact.FirstName} ${contact.LastName} (ID: ${contactId})...`);

  const result = await client.rpc('email/SendEmail', {
    Subject: subject,
    Body: body,
    Recipients: [{ Id: contactId }],
  });

  console.log('Result:', JSON.stringify(result, null, 2));
  console.log('Email sent successfully!');
}

main().catch(e => { console.error(e); process.exit(1); });
