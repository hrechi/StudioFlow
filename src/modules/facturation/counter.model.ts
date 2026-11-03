import { Schema, model, models, type Model } from "mongoose";

type ICounter = { key: string; value: number };
const counterSchema = new Schema<ICounter>({ key: { type: String, unique: true }, value: { type: Number, required: true } }, { collection: "facturation_counters" });
export const Counter: Model<ICounter> = (models.FacturationCounter as Model<ICounter> | undefined) ?? model<ICounter>("FacturationCounter", counterSchema);
