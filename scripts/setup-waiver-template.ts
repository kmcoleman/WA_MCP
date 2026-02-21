/**
 * Create the waiver reminder email template in Resend
 *
 * Usage: npx tsx scripts/setup-waiver-template.ts
 *
 * After running, save the returned template ID for use with send-waiver-resend.ts
 */

const RESEND_API_KEY = 're_9ArdAZ8c_BVcAeJKS9SKsaVYAQk51R8qy';

const templateHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 680px; margin: 0 auto; line-height: 1.6; color: #333; font-size: 15px;">

<p>Hi {{{RECIPIENT_NAME}}},</p>

<p>Please check your email for a <strong>waiver signing request</strong> for {{{EVENT_NAME}}} from <strong>esignatures.com</strong>.</p>

<p>I'm sending this follow-up via our club system in case the original email ended up in your spam folder. Please check both your inbox and spam folder.</p>

<p>If you can't find it, you can sign directly here:</p>

<p style="text-align: center; margin: 24px 0;">
  <a href="{{{WAIVER_URL}}}" style="display: inline-block; background: #0066B1; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">Sign Waiver</a>
</p>

<p>If you still don't see it and the link above doesn't work, please let me know and I'll research further.</p>

<p>Thanks,<br>Kev</p>

</div>`;

async function main() {
  const response = await fetch('https://api.resend.com/templates', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'waiver-reminder',
      subject: '{{{EVENT_NAME}}} — Waiver Signing Request',
      from: 'BMW NorCal <noreply@futurepathdevelopment.com>',
      reply_to: 'bmwriderkmc@gmail.com',
      html: templateHtml,
      variables: [
        { key: 'RECIPIENT_NAME', type: 'string', fallback_value: 'there' },
        { key: 'EVENT_NAME', type: 'string', fallback_value: 'the upcoming event' },
        { key: 'WAIVER_URL', type: 'string' },
      ],
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    console.error(`Error ${response.status}:`, JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log('Template created successfully!');
  console.log('Template ID:', (result as any).id);
  console.log('\nUse this ID with send-waiver-resend.ts');
}

main().catch(e => { console.error(e); process.exit(1); });
