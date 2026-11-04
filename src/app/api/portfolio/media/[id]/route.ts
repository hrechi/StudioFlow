import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Photo } from "@/modules/photos-galeries/photo.model";
import { openFile } from "@/modules/photos-galeries/photo.storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return new NextResponse("Invalid ID", { status: 400 });
  }

  try {
    await connectDB();
    const objectId = new Types.ObjectId(id);
    const photo = await Photo.findOne({
      _id: objectId,
      statutCulling: { $ne: "REJETEE" },
    }).select("fichier miniature format").lean();

    const variant = new URL(request.url).searchParams.get("variant") === "miniature"
      ? "miniature"
      : "file";
    const gridFsId = photo
      ? variant === "miniature"
        ? photo.miniature || photo.fichier
        : photo.fichier || photo.miniature || objectId
      : objectId;
    const file = await openFile(gridFsId);
    if (!file) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return new Response(file.stream, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(file.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error streaming portfolio photo:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

