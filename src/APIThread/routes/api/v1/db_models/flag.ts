import mongoose from "mongoose";

export const flagsSchema = new mongoose.Schema({
    name: { type: String, required: true },
    groupName: { type: String, required: true },
    type: { type: String, required: true },
    isEnabled: { type: Boolean, required: true },
    dateCreated: { type: Date, required: true, default: Date.now },
}, { versionKey: false });

export const flags = mongoose.model("flag", flagsSchema);
