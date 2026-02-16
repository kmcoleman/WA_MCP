import { readFileSync } from "fs";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

function loadEnvFile(path: string) {
  try {
    const content = readFileSync(path, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([^#=]+?)\s*=\s*(.+?)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {}
}

loadEnvFile("/Users/kev/dev/49er/.env.local");

const BUCKET = process.env.DO_SPACES_BUCKET || "49ergallery";
const s3 = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT!,
  region: process.env.DO_SPACES_REGION || "us-east-1",
  credentials: { accessKeyId: process.env.DO_SPACES_KEY!, secretAccessKey: process.env.DO_SPACES_SECRET! },
  forcePathStyle: false,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

async function main() {
  // Load index
  const result = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: "rv/index.json" }));
  const body = await result.Body?.transformToString("utf-8");
  const index = body ? JSON.parse(body) : {};

  let filled = 0;
  let pending = 0;

  for (const [token, entry] of Object.entries(index) as any) {
    try {
      const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: `rv/${token}.json` }));
      const data = JSON.parse((await res.Body?.transformToString("utf-8")) || "{}");

      const hasData = data.rigType || data.rigLength || data.arrivalDay;
      const status = hasData ? "COMPLETED" : "PENDING";
      if (hasData) filled++; else pending++;

      console.log(`${status.padEnd(10)} ${entry.name}`);
      if (hasData) {
        console.log(`           Rig: ${data.rigType || "—"}, ${data.rigLength || "—"}`);
        console.log(`           Slide Out: ${data.slideOut || "—"} | Water: ${data.waterRequired || "—"} | Power: ${data.powerRequired || "—"}`);
        console.log(`           Arrival: ${data.arrivalDay || "—"} ${data.arrivalHour || ""}${data.arrivalAmPm ? " " + data.arrivalAmPm : ""}`);
        if (data.comments) console.log(`           Comments: ${data.comments}`);
        if (data.phone) console.log(`           Phone: ${data.phone}`);
      }
      console.log();
    } catch (err: any) {
      console.log(`ERROR      ${entry.name} — could not read rv/${token}.json`);
      console.log();
    }
  }

  console.log(`---`);
  console.log(`${filled} completed, ${pending} pending (${filled + pending} total)`);
}

main().catch(e => { console.error(e); process.exit(1); });
