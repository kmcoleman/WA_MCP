/**
 * Send email via Resend API
 */
import { readFileSync } from 'fs';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY env var is required');
const FROM = '49er Rally <noreply@futurepathdevelopment.com>';

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error('Usage: npx tsx scripts/send-email.ts <email>');
    process.exit(1);
  }

  const subject = '49er Training Event Pages — Please Review Before Launch';

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; line-height: 1.6; color: #333; font-size: 15px;">

<p>Hi Delf and Tresha,</p>

<p>I've updated the event pages for our three 49er training programs and they're ready for your review. Please take a look at each and provide any edits or corrections before we go live with the main marketing launch.</p>

<h3 style="color: #0066B1; margin-top: 25px;">1. Adventure Riding Clinic (ADV Moto Pros)</h3>
<p><a href="https://bmwnorcal.org/event-6569423" style="color: #0066B1;">View Event Page</a><br>
<strong>Dates:</strong> May 22–23, 2026 (Friday &amp; Saturday)<br>
<strong>Location:</strong> 49er Rally — Mariposa Fairgrounds<br>
<strong>Instructor:</strong> Rob Day, Founder &amp; Lead Instructor</p>
<table style="width: 100%; border-collapse: collapse; margin: 10px 0 20px 0; font-size: 14px;">
  <tr style="background: #0066B1; color: white;">
    <th style="padding: 8px; text-align: left;">Session</th>
    <th style="padding: 8px; text-align: left;">Time</th>
    <th style="padding: 8px; text-align: right;">Price</th>
    <th style="padding: 8px; text-align: right;">Max</th>
  </tr>
  <tr style="background: #f5f5f5;">
    <td style="padding: 8px;">Friday Intro Course</td>
    <td style="padding: 8px;">AM (3.5 hrs)</td>
    <td style="padding: 8px; text-align: right;">$200</td>
    <td style="padding: 8px; text-align: right;">16</td>
  </tr>
  <tr>
    <td style="padding: 8px;">Friday Advanced Course</td>
    <td style="padding: 8px;">PM (3.5 hrs)</td>
    <td style="padding: 8px; text-align: right;">$200</td>
    <td style="padding: 8px; text-align: right;">16</td>
  </tr>
  <tr style="background: #f5f5f5;">
    <td style="padding: 8px;">Saturday Intro Course</td>
    <td style="padding: 8px;">AM (3.5 hrs)</td>
    <td style="padding: 8px; text-align: right;">$200</td>
    <td style="padding: 8px; text-align: right;">16</td>
  </tr>
  <tr>
    <td style="padding: 8px;">Saturday Advanced Course</td>
    <td style="padding: 8px;">PM (3.5 hrs)</td>
    <td style="padding: 8px; text-align: right;">$200</td>
    <td style="padding: 8px; text-align: right;">16</td>
  </tr>
</table>

<h3 style="color: #0066B1; margin-top: 25px;">2. SlowRide Police Style Riding Courses</h3>
<p><a href="https://bmwnorcal.org/event-6569422" style="color: #0066B1;">View Event Page</a><br>
<strong>Dates:</strong> May 22–23, 2026 (Friday &amp; Saturday)<br>
<strong>Location:</strong> 49er Rally — Mariposa Fairgrounds</p>
<table style="width: 100%; border-collapse: collapse; margin: 10px 0 20px 0; font-size: 14px;">
  <tr style="background: #0066B1; color: white;">
    <th style="padding: 8px; text-align: left;">Session</th>
    <th style="padding: 8px; text-align: left;">Time</th>
    <th style="padding: 8px; text-align: right;">Price</th>
    <th style="padding: 8px; text-align: right;">Max</th>
  </tr>
  <tr style="background: #f5f5f5;">
    <td style="padding: 8px;">Friday Intro Course</td>
    <td style="padding: 8px;">8:30 AM – 11:30 AM</td>
    <td style="padding: 8px; text-align: right;">$200</td>
    <td style="padding: 8px; text-align: right;">10</td>
  </tr>
  <tr>
    <td style="padding: 8px;">Friday Advanced Course</td>
    <td style="padding: 8px;">12:30 PM – 3:30 PM</td>
    <td style="padding: 8px; text-align: right;">$200</td>
    <td style="padding: 8px; text-align: right;">10</td>
  </tr>
  <tr style="background: #f5f5f5;">
    <td style="padding: 8px;">Saturday Intro Course</td>
    <td style="padding: 8px;">8:30 AM – 11:30 AM</td>
    <td style="padding: 8px; text-align: right;">$200</td>
    <td style="padding: 8px; text-align: right;">10</td>
  </tr>
  <tr>
    <td style="padding: 8px;">Saturday Advanced Course</td>
    <td style="padding: 8px;">12:30 PM – 3:30 PM</td>
    <td style="padding: 8px; text-align: right;">$200</td>
    <td style="padding: 8px; text-align: right;">10</td>
  </tr>
</table>

<h3 style="color: #0066B1; margin-top: 25px;">3. Women's Adventure Riding Clinic</h3>
<p><a href="https://bmwnorcal.org/event-6569492" style="color: #0066B1;">View Event Page</a><br>
<strong>Date:</strong> Friday, May 22, 2026<br>
<strong>Location:</strong> 49er Rally — Mariposa Fairgrounds<br>
<strong>Instructors:</strong> Louise Powers &amp; Shawn Thomas</p>
<table style="width: 100%; border-collapse: collapse; margin: 10px 0 20px 0; font-size: 14px;">
  <tr style="background: #0066B1; color: white;">
    <th style="padding: 8px; text-align: left;">Session</th>
    <th style="padding: 8px; text-align: left;">Time</th>
    <th style="padding: 8px; text-align: right;">Price</th>
    <th style="padding: 8px; text-align: right;">Max</th>
  </tr>
  <tr style="background: #f5f5f5;">
    <td style="padding: 8px;">Friday Course</td>
    <td style="padding: 8px;">8:00 AM – 12:00 PM + Guided Trail Ride</td>
    <td style="padding: 8px; text-align: right;">$200</td>
    <td style="padding: 8px; text-align: right;">12</td>
  </tr>
</table>

<p><em>Note: These are currently set to Admin Only, so you'll need to be logged in to view them.</em></p>

<h3 style="color: #0066B1; margin-top: 25px;">What I Need From You</h3>

<ol>
  <li style="margin-bottom: 12px;"><strong>Confirm the descriptions</strong> for each training program. They are largely based on last year's content — please flag anything that needs updating for this year.</li>

  <li style="margin-bottom: 12px;"><strong>Confirm pricing</strong> — all classes are currently set at $200 per class. Let me know if that needs to change.</li>

  <li style="margin-bottom: 12px;"><strong>GS Training guided ride</strong> — I removed the mention of a guided ride from the ADV Moto Pros clinic since we didn't do that last year. If we're planning to include one this year, let me know and I'll add it back.</li>

  <li style="margin-bottom: 12px;"><strong>GS Training instructors</strong> — If there's an additional instructor beyond Rob Day, please send me their bio and a photo and I'll add them to the page.</li>

  <li style="margin-bottom: 12px;"><strong>Women's Clinic — please review carefully.</strong> The description is based on last year, but it sounded like the program may be different this year. Let me know what needs to change.</li>

  <li style="margin-bottom: 12px;"><strong>Women's Clinic hero image</strong> — If we have a better photo of Louise for the background, or one of her riding a motorcycle, that would work much better for the event description. Please send one over if available.</li>
</ol>

<p>Once we have your sign-off, I think the training pages are good to go with the main marketing launch.</p>

<p>Thanks,<br>Kev</p>

</div>
`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: to.split(','),
      cc: process.argv.slice(3),
      reply_to: 'bmwriderkmc@gmail.com',
      subject,
      html,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    console.error(`Error ${response.status}:`, JSON.stringify(result));
    process.exit(1);
  }

  console.log('Email sent successfully!');
  console.log('ID:', (result as any).id);
  console.log('To:', to);
}

main().catch(e => { console.error(e); process.exit(1); });
