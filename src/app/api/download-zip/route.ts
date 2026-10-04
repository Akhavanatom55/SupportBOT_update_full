import { NextResponse } from "next/server";
import JSZip from "jszip";
import fs from "fs";
import path from "path";

function addFolderToZip(zip: JSZip, folderPath: string, zipFolder: JSZip) {
  const items = fs.readdirSync(folderPath);

  for (const item of items) {
    if (
      item === "node_modules" ||
      item === ".next" ||
      item === ".git" ||
      item === "tmp" ||
      item.endsWith(".log") ||
      item === ".env.local"
    ) {
      continue;
    }

    const fullPath = path.join(folderPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const subZipFolder = zipFolder.folder(item);
      if (subZipFolder) {
        addFolderToZip(zip, fullPath, subZipFolder);
      }
    } else {
      const fileData = fs.readFileSync(fullPath);
      zipFolder.file(item, fileData);
    }
  }
}

export async function GET() {
  try {
    const zip = new JSZip();
    const projectRoot = process.cwd();

    addFolderToZip(zip, projectRoot, zip);

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const uint8 = new Uint8Array(zipBuffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="SupportBOT_Bale_FullProject.zip"',
        "Content-Length": String(uint8.length),
      },
    });
  } catch (error: any) {
    console.error("Error creating zip file:", error);
    return NextResponse.json({ error: "Failed to create zip package" }, { status: 500 });
  }
}
