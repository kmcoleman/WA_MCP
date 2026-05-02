/**
 * Send updated training course review emails to Delf
 * with screenshots and links to the edit forms.
 *
 * Usage: npx tsx scripts/send-training-review.ts [recipient-email]
 * Default: sends to bmwriderkmc@gmail.com (for testing)
 */
import { readFileSync } from 'fs';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY env var is required');
const FROM = '49er Rally <noreply@futurepathdevelopment.com>';
const REPLY_TO = 'bmwriderkmc@gmail.com';

const to = process.argv[2] || 'bmwriderkmc@gmail.com';
const cc = process.argv[3] || '';

const DOMAIN = 'https://49er.bmwnorcal.org';

const events = [
  {
    name: 'Adventure Riding Clinic (ADV Moto Pros)',
    provider: 'ADV Moto Pros',
    screenshot: new URL('../.playwright-mcp/advmotopros-screenshot.png', import.meta.url),
    filename: 'advmotopros-event-page.png',
    formUrl: `${DOMAIN}/training/courses/a3f8b2c1-4e5d-4f6a-8b9c-1d2e3f4a5b6c`,
  },
  {
    name: 'SlowRide Police Style Riding Courses',
    provider: 'Slow Ride',
    screenshot: new URL('../.playwright-mcp/slowride-screenshot.png', import.meta.url),
    filename: 'slowride-event-page.png',
    formUrl: `${DOMAIN}/training/courses/b4c9d3e2-5f6a-4b7c-9d0e-2f3a4b5c6d7e`,
  },
  {
    name: "Women's Adventure Riding Clinic",
    provider: "Louise and Shawn (Women's Clinic)",
    screenshot: new URL('../.playwright-mcp/womens-screenshot.png', import.meta.url),
    filename: 'womens-clinic-event-page.png',
    formUrl: `${DOMAIN}/training/courses/c5d0e4f3-6a7b-4c8d-0e1f-3a4b5c6d7e8f`,
  },
];

async function main() {
  for (const ev of events) {
    const imgData = readFileSync(ev.screenshot);
    const base64 = imgData.toString('base64');

    const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; line-height: 1.6; color: #333; font-size: 15px;">
  <p>Delf,</p>

  <p>Please forward this to the <strong>${ev.provider}</strong> folks so they can review and update their course information for the 49er.</p>

  <p>We've pre-populated our training sign-up website with information based on the prior year. Please use the link below to review and edit the information:</p>

  <p style="margin: 20px 0;">
    <a href="${ev.formUrl}" style="display: inline-block; background-color: #0066B1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 15px;">Review &amp; Edit ${ev.name}</a>
  </p>

  <p>If it's easier, they can also email any text changes, photos, or logos directly to <a href="mailto:bmwriderkmc@gmail.com" style="color: #0066B1; font-weight: 600;">bmwriderkmc@gmail.com</a> and we'll update it for them.</p>

  <p>A screenshot of the current event page is attached for reference.</p>

  <p>Thanks,<br>Kev</p>
</div>
`;

    const subject = ev.name + ' — Review & Update Your Course Info for the 49er';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: to.split(','),
        ...(cc && { cc: cc.split(',') }),
        reply_to: REPLY_TO,
        subject,
        html,
        attachments: [
          {
            filename: ev.filename,
            content: base64,
          },
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
