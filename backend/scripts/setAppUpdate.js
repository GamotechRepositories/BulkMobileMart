/**
 * Sets store appUpdate so clients below latestVersion are prompted to update.
 *
 * Usage:
 *   node backend/scripts/setAppUpdate.js
 *   node backend/scripts/setAppUpdate.js 1.0.6 1.0.6
 */
import "dotenv/config";
import mongoose from "mongoose";
import StoreSettings from "../models/StoreSettings.js";
import {
  clearStoreSettingsCache,
  normalizeAppUpdate,
  serializeStoreSettings,
} from "../utils/storeSettingsHelpers.js";

const latestVersion = process.argv[2] || "1.0.6";
const minVersion = process.argv[3] || latestVersion;

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGODB_URI / MONGO_URI is required");
  }

  await mongoose.connect(uri);

  const appUpdate = normalizeAppUpdate({
    latestVersion,
    minVersion,
    forceUpdate: true,
    message:
      "A new version of BulkMobileMart is available. Please update the app to continue.",
    androidStoreUrl:
      "https://play.google.com/store/apps/details?id=com.bulkmobilemart.app",
  });

  let doc = await StoreSettings.findOne({ key: "store" });
  if (!doc) {
    doc = await StoreSettings.create({ key: "store", appUpdate });
  } else {
    doc.set("appUpdate", appUpdate);
    doc.markModified("appUpdate");
    await doc.save();
  }

  clearStoreSettingsCache();
  const settings = serializeStoreSettings(doc, { admin: true });
  console.log("App update settings saved:");
  console.log(JSON.stringify(settings.appUpdate, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
