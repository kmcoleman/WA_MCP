/**
 * Send RV parking form magic links to registrants.
 *
 * Queries the norcaladmin Postgres DB for RV parking registrations,
 * generates a unique token per person, uploads initial data to DO Spaces,
 * and sends an email with the form link.
 *
 * Safe to re-run: checks rv/index.json and skips anyone already emailed.
 *
 * Usage:
 *   npx tsx scripts/send-rv-forms.ts [--dry-run]
 *
 * Env vars (loaded from norcaladmin/.env + 49er/.env.local):
 *   DATABASE_URL
 *   DO_SPACES_KEY, DO_SPACES_SECRET, DO_SPACES_ENDPOINT, DO_SPACES_REGION, DO_SPACES_BUCKET
 *   RESEND_API_KEY
 */

import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import pg from "pg";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

/* ------------------------------------------------------------------ */
/*  Load env                                                           */
/* ------------------------------------------------------------------ */

function loadEnvFile(path: string) {
  try {
    const content = readFileSync(path, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([^#=]+?)\s*=\s*(.+?)\s*$/);
      if (match && !process.env[match[1]]) {
        // Strip surrounding quotes
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // File doesn't exist, skip
  }
}

// Load DB creds from norcaladmin
loadEnvFile(new URL("../../norcaladmin-mcp/.env", import.meta.url).pathname);
// Load DO Spaces + Resend creds from 49er project
loadEnvFile(new URL("../../../49er/.env.local", import.meta.url).pathname);

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM = "49er Rally <noreply@futurepathdevelopment.com>";
const REPLY_TO = "twobeemers@aol.com";
const DOMAIN = "https://49er.bmwnorcal.org";
const BUCKET = process.env.DO_SPACES_BUCKET || "49ergallery";

// 49er Rally 2026 event internal ID
const EVENT_ID = "cmki6olnt00020rck66cv2pu9";

const DRY_RUN = process.argv.includes("--dry-run");

/* ------------------------------------------------------------------ */
/*  S3 client                                                          */
/* ------------------------------------------------------------------ */

function createS3() {
  return new S3Client({
    endpoint: process.env.DO_SPACES_ENDPOINT!,
    region: process.env.DO_SPACES_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.DO_SPACES_KEY!,
      secretAccessKey: process.env.DO_SPACES_SECRET!,
    },
    forcePathStyle: false,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

/* ------------------------------------------------------------------ */
/*  Database query                                                     */
/* ------------------------------------------------------------------ */

interface RvRegistrant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  waContactId: number;
  rvParking: string;
}

async function getRvRegistrations(): Promise<RvRegistrant[]> {
  // DO managed Postgres uses sslmode=require; override cert validation
  // since the DO CA cert isn't bundled here
  const connStr = process.env.DATABASE_URL!.replace(/sslmode=require/, "sslmode=no-verify");
  const client = new pg.Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const result = await client.query(`
      SELECT
        er.id,
        er."firstName",
        er."lastName",
        er.email,
        er."waContactId",
        jsonb_path_query_first(
          er."registrationFields"::jsonb,
          '$[*] ? (@.SystemCode == "custom-17642285").Value'
        )::text as rv_parking
      FROM "EventRegistration" er
      WHERE er."eventId" = $1
        AND er."onWaitlist" = false
        AND jsonb_path_exists(
          er."registrationFields"::jsonb,
          '$[*] ? (@.SystemCode == "custom-17642285").Value[0]'
        )
      ORDER BY er."lastName"
    `, [EVENT_ID]);

    return result.rows.map((r: any) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      waContactId: r.waContactId,
      rvParking: r.rv_parking,
    }));
  } finally {
    await client.end();
  }
}

/* ------------------------------------------------------------------ */
/*  DO Spaces helpers                                                  */
/* ------------------------------------------------------------------ */

async function getIndex(s3: S3Client): Promise<Record<string, { name: string; waContactId: number; token: string }>> {
  try {
    const result = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: "rv/index.json" })
    );
    const body = await result.Body?.transformToString("utf-8");
    return body ? JSON.parse(body) : {};
  } catch (err: any) {
    if (err.name === "NoSuchKey") return {};
    throw err;
  }
}

async function uploadJson(s3: S3Client, key: string, data: unknown) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: JSON.stringify(data, null, 2),
      ContentType: "application/json",
      ACL: "public-read",
    })
  );
}

/* ------------------------------------------------------------------ */
/*  Email                                                              */
/* ------------------------------------------------------------------ */

async function sendEmail(to: string, name: string, formUrl: string) {
  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333; font-size: 15px;">
  <p>Hi ${name.split(" ")[0]},</p>

  <p>Thanks for registering for the 2026 49er! We noticed you are bringing your RV. We need a few details about the rig you are bringing and when you plan to arrive to help manage getting all the RVs into place without too much trouble.</p>

  <p>Please click the button below to provide your RV information. This is your personal link, and if you need to update it you can always return to the page. If you share this email, others can read or update your info.</p>

  <p style="margin: 24px 0;">
    <a href="${formUrl}" style="display: inline-block; background-color: #0066B1; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 15px;">Provide RV Details</a>
  </p>

  <p style="font-size: 13px; color: #666;">If the button doesn't work, copy and paste this link into your browser:<br>
  <a href="${formUrl}" style="color: #0066B1;">${formUrl}</a></p>

  <p>If you have any questions about our RV parking process, please reply to this email and our Parking Coordinator, Russ Drake, will help you out.</p>

  <p>Thanks,<br>49er Rally Team</p>
</div>
`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      reply_to: REPLY_TO,
      subject: "49er Rally — RV Parking Details Needed",
      html,
    }),
  });

  const result = (await response.json()) as any;
  if (!response.ok) {
    throw new Error(`Email to ${to} failed: ${JSON.stringify(result)}`);
  }
  return result.id;
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  if (DRY_RUN) {
    console.log("=== DRY RUN — no emails will be sent ===\n");
  }

  // Query DB for RV registrations
  console.log("Querying RV parking registrations...");
  const registrants = await getRvRegistrations();
  console.log(`Found ${registrants.length} RV parking registration(s)\n`);

  if (registrants.length === 0) {
    console.log("No RV registrations found.");
    return;
  }

  // Init S3 and load existing index
  const s3 = createS3();
  const index = await getIndex(s3);
  const existingContactIds = new Set(
    Object.values(index).map((entry) => entry.waContactId)
  );

  // List all registrants
  console.log("RV Registrants:");
  console.log("-".repeat(70));
  for (const reg of registrants) {
    const name = `${reg.firstName} ${reg.lastName}`;
    const alreadySent = existingContactIds.has(reg.waContactId);
    const status = alreadySent ? "  [already sent]" : "  [NEW]";
    console.log(`  ${name.padEnd(30)} ${reg.email.padEnd(30)} ${status}`);
    if (reg.rvParking) {
      console.log(`    RV option: ${reg.rvParking}`);
    }
  }
  console.log("-".repeat(70));

  // Process new registrations
  const newRegs = registrants.filter((r) => !existingContactIds.has(r.waContactId));
  const skipCount = registrants.length - newRegs.length;

  console.log(`\n${newRegs.length} new, ${skipCount} already sent\n`);

  if (newRegs.length === 0) {
    console.log("Nothing to send.");
    return;
  }

  for (const reg of newRegs) {
    const name = `${reg.firstName} ${reg.lastName}`;
    const token = randomUUID();
    const formUrl = `${DOMAIN}/rv/${token}`;

    const initialData = {
      name,
      email: reg.email,
      phone: "",
      rigLength: "",
      rigType: "",
      slideOut: "",
      waterRequired: "",
      powerRequired: "",
      arrivalTime: "",
    };

    if (DRY_RUN) {
      console.log(`  Would send: ${name} <${reg.email}>`);
    } else {
      await uploadJson(s3, `rv/${token}.json`, initialData);
      // Resend rate limit: 2 req/sec
      await new Promise((r) => setTimeout(r, 600));
      const emailId = await sendEmail(reg.email, name, formUrl);
      console.log(`  Sent: ${name} <${reg.email}> (${emailId})`);
    }

    index[token] = { name, waContactId: reg.waContactId, token };
    existingContactIds.add(reg.waContactId);
  }

  // Save updated index
  if (!DRY_RUN && newRegs.length > 0) {
    await uploadJson(s3, "rv/index.json", index);
  }

  console.log(`\nDone.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
