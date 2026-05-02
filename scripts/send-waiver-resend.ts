/**
 * Send a waiver reminder using the Resend template
 *
 * Usage:
 *   npx tsx scripts/send-waiver-resend.ts <email> <waiverUrl> [recipientName] [eventName]
 *
 * Examples:
 *   npx tsx scripts/send-waiver-resend.ts joe@example.com https://norcaladmin.fpathdev.com/waiver-signed/abc123 "Joe Kid" "Plaskett Creek Campout"
 *   npx tsx scripts/send-waiver-resend.ts joe@example.com https://norcaladmin.fpathdev.com/waiver-signed/abc123
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY env var is required');
const TEMPLATE_ID = '87026948-2206-4d61-96d5-c782e70ba58f';

async function main() {
  const to = process.argv[2];
  const waiverUrl = process.argv[3];
  const recipientName = process.argv[4] || 'there';
  const eventName = process.argv[5] || 'the upcoming event';

  if (!to || !waiverUrl) {
    console.error('Usage: npx tsx scripts/send-waiver-resend.ts <email> <waiverUrl> [recipientName] [eventName]');
    console.error('Example: npx tsx scripts/send-waiver-resend.ts joe@example.com https://norcaladmin.fpathdev.com/waiver-signed/abc123 "Joe Kid" "Plaskett Creek"');
    process.exit(1);
  }

  console.log(`Sending waiver reminder to ${to}...`);
  console.log(`  Name: ${recipientName}`);
  console.log(`  Event: ${eventName}`);
  console.log(`  Waiver URL: ${waiverUrl}`);

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
      template: {
        id: TEMPLATE_ID,
        variables: {
          RECIPIENT_NAME: recipientName,
          EVENT_NAME: eventName,
          WAIVER_URL: waiverUrl,
        },
      },
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error(`Error ${response.status}:`, JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log('\nEmail sent successfully!');
  console.log('ID:', (result as any).id);
}

main().catch(e => { console.error(e); process.exit(1); });
