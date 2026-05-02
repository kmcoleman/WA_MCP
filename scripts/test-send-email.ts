/**
 * Test the send_email tool by calling the WA SendEmail RPC directly
 * Usage: npx tsx scripts/test-send-email.ts
 */
import { readFileSync } from 'fs';

// Load .env manually
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

  const contactId = 95376717;
  const subject = 'REMINDER: 49er Rally — RV Parking Form';

  const body = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 680px; margin: 0 auto; line-height: 1.6; color: #333; font-size: 15px;">

<p>Hi Amy,</p>

<p>Just a friendly reminder — we still need your RV parking information for the <strong>49er Rally</strong>. Please take a moment to fill out the form so we can plan your spot.</p>

<p style="text-align: center; margin: 24px 0;">
  <a href="https://49er.bmwnorcal.org/rv/58cd25cb-422f-44a6-ab80-270b180f028c" style="display: inline-block; background: #0066B1; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">Provide RV Details</a>
</p>

<p style="font-size: 13px; color: #666;">If the button doesn't work, copy and paste this link into your browser:<br>
<a href="https://49er.bmwnorcal.org/rv/58cd25cb-422f-44a6-ab80-270b180f028c" style="color: #0066B1;">https://49er.bmwnorcal.org/rv/58cd25cb-422f-44a6-ab80-270b180f028c</a></p>

<p>Thank you,<br>Russ Drake, RV Parking Coordinator</p>

</div>`;

  console.log(`Sending test email to contact ${contactId}...`);

  const result = await client.rpc('email/SendEmail', {
    Subject: subject,
    Body: body,
    Recipients: [{ Id: contactId }],
  });

  console.log('Result:', JSON.stringify(result, null, 2));
  console.log('Email sent successfully!');
}

main().catch(e => { console.error(e); process.exit(1); });
