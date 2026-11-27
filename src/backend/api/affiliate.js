// api/affiliate.js — outbound deep-link click tracking + journey deep-link stamp.
const express = require("express");
const env = require("../config/env");
const prisma = require("../config/database");
const { buildAffiliateUrl, recordClick } = require("../services/affiliateService");
const { recordEvent, EVENT_TYPES } = require("../utils/eventTracker");

const router = express.Router();

router.post("/click", async (req, res, next) => {
  try {
    const { programme, destinationUrl, bookingType, leg, journeyId } = req.body || {};
    if (!destinationUrl || !leg) {
      const err = new Error("destinationUrl and leg are required");
      err.status = 400;
      throw err;
    }

    const click = await recordClick({
      userId: req.userId,
      programme,
      destinationUrl,
      bookingType,
      leg,
    });

    if (journeyId) {
      await prisma.userJourney
        .updateMany({
          where: { id: journeyId, userId: req.userId },
          data: { deepLinkClicked: true, deepLinkClickedAt: new Date(), deepLinkLeg: leg },
        })
        .then((r) => {
          if (r.count) recordEvent(req.userId, EVENT_TYPES.DEEP_LINK_CLICKED, { journeyId, leg, programme });
        })
        .catch(() => {});
    }

    res.status(201).json({
      affiliateUrl: buildAffiliateUrl(programme, destinationUrl, leg),
      clickId: click.id,
      mock: !env.hasAffiliate,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
