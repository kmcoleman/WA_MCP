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

const s3 = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT!,
  region: process.env.DO_SPACES_REGION || "us-east-1",
  credentials: { accessKeyId: process.env.DO_SPACES_KEY!, secretAccessKey: process.env.DO_SPACES_SECRET! },
  forcePathStyle: false,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

async function main() {
  const result = await s3.send(new GetObjectCommand({ Bucket: "49ergallery", Key: "rv/index.json" }));
  const body = await result.Body?.transformToString("utf-8");
  console.log(body);
}
main().catch(e => { console.error(e); process.exit(1); });
