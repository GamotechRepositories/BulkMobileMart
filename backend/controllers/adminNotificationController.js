import User from "../models/user.js";
import {
  sendCustomNotification,
  sendOffer,
  sendToMultipleTokens,
} from "../services/notificationService.js";

function normalizeUserIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((id) => String(id).trim()).filter(Boolean))];
}

export const sendAdminNotification = async (req, res) => {
  try {
    const {
      mode = "single",
      userId,
      userIds = [],
      title,
      body,
      type = "custom",
      data = {},
      broadcast = false,
    } = req.body;

    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({
        success: false,
        message: "title and body are required",
      });
    }

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const notificationType = type.trim() || "custom";

    if (broadcast === true || mode === "broadcast") {
      const users = await User.find({
        role: "user",
        fcmToken: { $exists: true, $ne: "" },
      }).select("_id fcmToken");

      const results = await Promise.all(
        users.map((user) =>
          notificationType === "offer"
            ? sendOffer(user._id, { title: trimmedTitle, body: trimmedBody, data })
            : sendCustomNotification(user._id, {
                title: trimmedTitle,
                body: trimmedBody,
                type: notificationType,
                data,
              })
        )
      );

      return res.status(200).json({
        success: true,
        message: "Broadcast notification processed",
        data: {
          targetedUsers: users.length,
          results,
        },
      });
    }

    if (mode === "multiple") {
      const ids = normalizeUserIds(userIds);
      if (!ids.length) {
        return res.status(400).json({
          success: false,
          message: "userIds are required for multiple mode",
        });
      }

      const results = await Promise.all(
        ids.map((id) =>
          notificationType === "offer"
            ? sendOffer(id, { title: trimmedTitle, body: trimmedBody, data })
            : sendCustomNotification(id, {
                title: trimmedTitle,
                body: trimmedBody,
                type: notificationType,
                data,
              })
        )
      );

      return res.status(200).json({
        success: true,
        message: "Notifications sent to selected users",
        data: { results },
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required for single mode",
      });
    }

    const result =
      notificationType === "offer"
        ? await sendOffer(userId, { title: trimmedTitle, body: trimmedBody, data })
        : await sendCustomNotification(userId, {
            title: trimmedTitle,
            body: trimmedBody,
            type: notificationType,
            data,
          });

    res.status(200).json({
      success: true,
      message: "Notification sent successfully",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send notification",
    });
  }
};

export const sendAdminMulticast = async (req, res) => {
  try {
    const { tokens = [], title, body, data = {} } = req.body;

    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({
        success: false,
        message: "title and body are required",
      });
    }

    const result = await sendToMultipleTokens(tokens, {
      title: title.trim(),
      body: body.trim(),
      data,
    });

    res.status(200).json({
      success: true,
      message: "Multicast notification processed",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send multicast notification",
    });
  }
};
