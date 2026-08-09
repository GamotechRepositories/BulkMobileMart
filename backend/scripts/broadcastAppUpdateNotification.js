/**
 * Sends a Play Store update push to all users with an FCM token.
 * Use this so older installed apps (without the in-app update dialog) still
 * get a system notification to update.
 *
 * Usage:
 *   node backend/scripts/broadcastAppUpdateNotification.js
 */
import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/user.js";
import { sendToMultipleTokens } from "../services/notificationService.js";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.bulkmobilemart.app";

const TITLE = "Update BulkMobileMart";
const BODY =
  "A new version is available. Tap to update the app from Play Store.";

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGODB_URI / MONGO_URI is required");
  }

  await mongoose.connect(uri);

  const users = await User.find({
    fcmToken: { $exists: true, $nin: [null, ""] },
  })
    .select("_id fcmToken")
    .lean();

  const tokens = [
    ...new Set(
      users
        .map((user) => String(user.fcmToken || "").trim())
        .filter(Boolean)
    ),
  ];

  console.log(`Users with FCM token: ${users.length}`);
  console.log(`Unique tokens: ${tokens.length}`);

  if (!tokens.length) {
    console.log("No tokens to notify.");
    await mongoose.disconnect();
    return;
  }

  const result = await sendToMultipleTokens(tokens, {
    title: TITLE,
    body: BODY,
    data: {
      type: "app_update",
      url: PLAY_STORE_URL,
      linkTarget: "play_store",
    },
  });

  console.log("Broadcast result:", result);
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
