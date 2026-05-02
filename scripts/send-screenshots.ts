/**
 * Send event page screenshots to reviewer
 */
import { readFileSync } from 'fs';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY env var is required');
const FROM = '49er Rally <noreply@futurepathdevelopment.com>';
const REPLY_TO = 'bmwriderkmc@gmail.com';

const to = process.argv[2] || 'bmwriderkmc@gmail.com';

const events = [
  { name: 'Adventure Riding Clinic (ADV Moto Pros)', provider: 'ADV Moto Pros', screenshot: new URL('../.playwright-mcp/advmotopros-screenshot.png', import.meta.url), filename: 'advmotopros-event-page.png' },
  { name: 'SlowRide Police Style Riding Courses', provider: 'Slow Ride', screenshot: new URL('../.playwright-mcp/slowride-screenshot.png', import.meta.url), filename: 'slowride-event-page.png' },
  { name: "Women's Adventure Riding Clinic", provider: "Louise and Shawn (Women's Clinic)", screenshot: new URL('../.playwright-mcp/womens-screenshot.png', import.meta.url), filename: 'womens-clinic-event-page.png' },
];

async function main() {
  for (const ev of events) {
    const imgData = readFileSync(ev.screenshot);
    const base64 = imgData.toString('base64');

    const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; line-height: 1.6; color: #333; font-size: 15px;">
  <p>Delf,</p>
  <p>It will help if you forward this to the ${ev.provider} folks so they can review the event description we put together for their course at the 49er.</p>
  <p>A screenshot of the event page is attached.</p>
  <p>Thanks,<br>Kev</p>
</div>
`;

    const subject = ev.name + ' — Event Description for Review';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: to.split(','),
        reply_to: REPLY_TO,
        subject,
        html,
        attachments: [
          {
            filename: ev.filename,
            content: base64,
          }
        ],
      }),
    });

    const result = await response.json() as any;
    if (!response.ok) {
      console.error(`Error sending ${ev.name}:`, JSON.stringify(result));
    } else {
      console.log(`Sent: ${subject}`);
      console.log(`  ID: ${result.id}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
