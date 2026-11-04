import "server-only";

import { Types } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { Materiel as MaterielModel, type IMateriel } from "./materiel.model";
import {
  deleteMaterielPhoto,
  openMaterielPhoto,
  processMaterielPhoto,
  saveMaterielPhoto,
} from "./materiel-photo.storage";

type MaterielPhotoLean = Pick<IMateriel, "archive" | "photoFileId" | "photo"> & {
  _id: Types.ObjectId;
};

function validId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw new ServiceError("Equipment not found.");
  return new Types.ObjectId(id);
}

export async function replaceMaterielPhoto(equipmentId: string, data: Buffer): Promise<void> {
  await connectDB();
  const id = validId(equipmentId);
  const current = await MaterielModel.findById(id)
    .select("archive photoFileId")
    .lean<MaterielPhotoLean>();
  if (!current) throw new ServiceError("Equipment not found.");
  if (current.archive) throw new ServiceError("Archived equipment cannot be edited.");

  const processed = await processMaterielPhoto(data);
  const newFileId = await saveMaterielPhoto(processed, equipmentId);
  try {
    await MaterielModel.updateOne(
      { _id: id, archive: false },
      { $set: { photoFileId: newFileId }, $unset: { photo: "" } },
    );
  } catch (error) {
    await deleteMaterielPhoto(newFileId);
    throw error;
  }
  await deleteMaterielPhoto(current.photoFileId);
}

export async function removeMaterielPhoto(equipmentId: string): Promise<void> {
  await connectDB();
  const id = validId(equipmentId);
  const current = await MaterielModel.findById(id)
    .select("archive photoFileId")
    .lean<MaterielPhotoLean>();
  if (!current) throw new ServiceError("Equipment not found.");
  if (current.archive) throw new ServiceError("Archived equipment cannot be edited.");
  await MaterielModel.updateOne(
    { _id: id, archive: false },
    { $unset: { photoFileId: "", photo: "" } },
  );
  await deleteMaterielPhoto(current.photoFileId);
}

export async function getMaterielPhoto(fileId: string) {
  if (!Types.ObjectId.isValid(fileId)) return null;
  await connectDB();
  const id = new Types.ObjectId(fileId);
  const equipment = await MaterielModel.exists({ photoFileId: id });
  if (!equipment) return null;
  return { id, file: await openMaterielPhoto(id) };
}
