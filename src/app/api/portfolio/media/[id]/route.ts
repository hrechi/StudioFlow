import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { openFile } from "@/modules/photos-galeries/photo.storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return new NextResponse("Invalid ID", { status: 400 });
  }

  try {
    const file = await openFile(new Types.ObjectId(id));
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
    console.error("Error streaming media from GridFS:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

