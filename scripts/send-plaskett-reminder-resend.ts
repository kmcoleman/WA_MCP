/**
 * Send Plaskett Creek reminder via Resend
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY env var is required');

const subject = 'REMINDER: Plaskett Creek Campout — New Route & Start Location';

const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 680px; margin: 0 auto; line-height: 1.6; color: #333; font-size: 15px;">

<p>Hi everyone,</p>

<p>This is a reminder about this weekend's <strong>Plaskett Creek Campout</strong> — and the new start location and route. Don't show up in Half Moon Bay!</p>

<p>As mentioned in my earlier email, we've changed the route to head south on Highway 25 and take Nacimiento-Fergusson Road over the hill to Plaskett Creek.</p>

<div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 14px 18px; margin: 20px 0;">
  <strong style="color: #155724;">Route Update:</strong> <span style="color: #155724;">Delf Hedde rode the route today and said it was great — despite a sign saying the road was closed. So we're good to go!</span>
</div>

<h3 style="color: #2c3e50; margin-top: 24px;">New Start Location</h3>

<p style="font-size: 16px;">
  <strong><a href="https://www.google.com/maps/place/Huckleberry's+Breakfast+%26+Lunch/@37.2628356,-121.937636,1867m/data=!3m2!1e3!4b1!4m6!3m5!1s0x808e350042c6a2d1:0x42b942271ebb8571!8m2!3d37.2628314!4d-121.9350611!16s%2Fg%2F11ld363d6g?entry=ttu&g_ep=EgoyMDI2MDIxNy4wIKXMDSoASAFQAw%3D%3D" style="color: #0066B1;">Huckleberry's Breakfast &amp; Lunch</a></strong><br>
  2071 Camden Ave, San Jose, CA 95124
</p>

<h3 style="color: #2c3e50; margin-top: 24px;">New Route</h3>

<table style="width: 100%; border-collapse: collapse; margin: 12px 0 20px 0; font-size: 14px;">
  <tr style="background: #f8f9fa;">
    <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold; width: 140px;">Breakfast</td>
    <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>8:00 AM</strong> at Huckleberry's, San Jose</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Ride Departs</td>
    <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>9:00 AM</strong></td>
  </tr>
  <tr style="background: #f8f9fa;">
    <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Route</td>
    <td style="padding: 10px; border: 1px solid #dee2e6;">South on <strong>Highway 25</strong> &rarr; <strong>Nacimiento-Fergusson Road</strong> over the hill to the coast</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Supply Stop</td>
    <td style="padding: 10px; border: 1px solid #dee2e6;">Safeway in King City</td>
  </tr>
  <tr style="background: #f8f9fa;">
    <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Destination</td>
    <td style="padding: 10px; border: 1px solid #dee2e6;">Plaskett Creek Campground — Group Sites 2 &amp; 3</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: bold;">Distance / Time</td>
    <td style="padding: 10px; border: 1px solid #dee2e6;">~195 miles, ~5 hours (not including stops)</td>
  </tr>
</table>

<div style="text-align: center; margin: 24px 0;">
  <img src="https://bmwnorcal.wildapricot.org/resources//_EVENTS/Ride%20Outs/2026/2026%2002%20-%20Plaskett%20Creek/fallback_ride_feb_2026_thumbnail.png" alt="Route map — San Jose to Plaskett Creek" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
</div>

<p>Download the route:</p>

<div style="text-align: center; margin: 20px 0;">
  <a href="https://go.rever.co/TIPrX62iR0b" style="text-decoration: none; margin: 0 8px;"><img src="https://bmwnorcal.wildapricot.org/resources//_EVENTS/Ride%20Outs/Rever_20Button.png" alt="Rever Route" style="height: 48px; vertical-align: middle;"></a>
  <a href="https://bmwnorcal.org/resources/_EVENTS/Ride%20Outs/2026/2026%2002%20-%20Plaskett%20Creek/Feb%202026%20HMB%20to%20Plaskett%20Creek.GPX" style="text-decoration: none; margin: 0 8px;"><img src="https://bmwnorcal.wildapricot.org/resources//_EVENTS/Ride%20Outs/GPX_Route_Button.png" alt="GPX Route" style="height: 48px; vertical-align: middle;"></a>
  <a href="https://bmwnorcal.wildapricot.org/resources//_EVENTS/Ride%20Outs/2026/2026%2002%20-%20Plaskett%20Creek/Huckleberry%27s%20Breakfast%20_%20Lunch%20to%20Plaskett%20Creek%20Campground%20-%20Google%20Maps.pdf" style="text-decoration: none; margin: 0 8px;"><img src="https://bmwnorcal.wildapricot.org/resources//_EVENTS/Ride%20Outs/Routesheet_button.png" alt="Route Sheet" style="height: 48px; vertical-align: middle;"></a>
</div>

<div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 14px 18px; margin: 24px 0;">
  <h3 style="color: #155724; margin-top: 0;">Your Ride Leaders</h3>
  <p style="margin-bottom: 0; color: #155724;">A big thank you to <strong>Ted Crum</strong> for volunteering to be Tour Captain for this ride, with <strong>Ravi Verma</strong> and <strong>Mike Murphy</strong> as further backups. I really appreciate you all helping out!</p>
</div>

<h3 style="color: #2c3e50; margin-top: 24px;">Need to Cancel?</h3>
<p>If your plans change, please <a href="https://bmwnorcal.org/resources/Documents/Self%20Service%20Event%20Cancellation%20for%20Members.pdf" style="color: #0066B1; font-weight: bold;">cancel your registration using this process</a>. Please do not email the board to cancel.</p>

<p>Have fun and stay safe out there!</p>

<p>Kev</p>

</div>`;

async function main() {
  const to = process.argv[2] || 'bmwriderkmc@gmail.com';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'BMW NorCal <noreply@futurepathdevelopment.com>',
      to: [to],
      reply_to: 'bmwriderkmc@gmail.com',
      subject,
      html,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    console.error(`Error ${response.status}:`, JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log('Email sent successfully!');
  console.log('To:', to);
  console.log('ID:', (result as any).id);
}

main().catch(e => { console.error(e); process.exit(1); });
