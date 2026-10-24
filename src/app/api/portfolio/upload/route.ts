import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireArea } from "@/lib/guards";
import { allowPortfolioRequest } from "@/modules/portfolio/rate-limit";
import { saveFile } from "@/modules/photos-galeries/photo.storage";

const cloudinaryResponseSchema = z.object({
  secure_url: z.string().refine((value) => value.startsWith("https://")),
  public_id: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await requireArea("portfolio");
  if (!allowPortfolioRequest(`upload:${user.id}`, 50, 60 * 60_000)) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED", message: "Upload limit reached. Try again later." },
      { status: 429 }
    );
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_FORM", message: "Invalid upload form." },
      { status: 400 }
    );
  }

  const file = incoming.get("file");
  if (!(file instanceof File) || !acceptedTypes.has(file.type) || file.size < 1 || file.size > maxBytes) {
    return NextResponse.json(
      { ok: false, code: "INVALID_FILE", message: "Choose a JPG, PNG or WebP image up to 20 MB." },
      { status: 400 }
    );
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // 1. If Cloudinary is configured, use Cloudinary
  if (cloudName && apiKey && apiSecret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = "studioflow/portfolios";
    const signature = createHmac("sha1", apiSecret)
      .update(`folder=${folder}&timestamp=${timestamp}`)
      .digest("hex");
    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("api_key", apiKey);
    uploadData.append("timestamp", timestamp);
    uploadData.append("folder", folder);
    uploadData.append("signature", signature);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
        { method: "POST", body: uploadData, cache: "no-store" }
      );
      if (response.ok) {
        const parsed = cloudinaryResponseSchema.safeParse(await response.json());
        if (parsed.success) {
          const image = parsed.data;
          const urlMiniature = image.secure_url.replace(
            "/upload/",
            "/upload/c_fill,w_800,q_auto,f_auto/"
          );
          return NextResponse.json(
            {
              ok: true,
              data: {
                url: image.secure_url,
                urlMiniature,
                largeur: image.width,
                hauteur: image.height,
                publicId: image.public_id,
              },
            },
            { status: 201 }
          );
        }
      }
    } catch (err) {
      console.warn("Cloudinary upload failed, falling back to MongoDB GridFS", err);
    }
  }

  // 2. Fallback: Store directly in MongoDB GridFS
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileId = await saveFile(buffer, file.name, file.type);
    const mediaUrl = `/api/portfolio/media/${fileId.toString()}`;

    return NextResponse.json(
      {
        ok: true,
        data: {
          url: mediaUrl,
          urlMiniature: mediaUrl,
          largeur: 1600,
          hauteur: 1060,
          publicId: fileId.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("MongoDB GridFS upload error:", error);
    return NextResponse.json(
      { ok: false, code: "UPLOAD_FAILED", message: "Failed to store image in database." },
      { status: 500 }
    );
  }
}
