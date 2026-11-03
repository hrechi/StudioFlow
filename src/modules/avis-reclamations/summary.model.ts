import { Schema, model, models, type Model } from "mongoose";

export interface IAvisSummary {
  scope: string;
  summary: string;
  strengths: string[];
  improvements: string[];
  sourceCount: number;
  generatedAt: Date;
  model: string;
  sourceVersion: string;
}

const summarySchema = new Schema<IAvisSummary>(
  {
    scope: { type: String, required: true, unique: true },
    summary: { type: String, required: true, maxlength: 1200 },
    strengths: { type: [String], default: [] },
    improvements: { type: [String], default: [] },
    sourceCount: { type: Number, required: true },
    generatedAt: { type: Date, required: true },
    model: { type: String, required: true },
    sourceVersion: { type: String, required: true },
  },
  { collection: "avis_summaries" },
);

export const AvisSummary: Model<IAvisSummary> =
  (models.AvisSummary as Model<IAvisSummary> | undefined) ??
  model<IAvisSummary>("AvisSummary", summarySchema);
