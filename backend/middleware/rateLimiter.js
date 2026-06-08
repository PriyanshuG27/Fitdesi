/**
 * rateLimiter.js
 *
 * Firestore-backed rate limiter for the generatePlan operation.
 * Tracks free daily plan regenerations directly on the user's document.
 */

'use strict';

const { HttpsError } = require('../lib/validators');

/**
 * Checks the daily rate limit and/or consumes a Plan Refresh power-up.
 */
async function checkRateLimit(db, uid, usePowerUp = false) {
  const userRef = db.doc(`users/${uid}`);

  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) {
      throw new HttpsError('not-found', 'User profile not found');
    }

    const userData = userSnap.data();
    const powerUps = userData.powerUps || {};
    const planRefreshCount = powerUps.planRefresh || 0;

    const todayStr = new Date().toISOString().split('T')[0];
    let dailyRegenCount = userData.dailyRegenCount || 0;
    let lastRegenDate = userData.lastRegenDate || '';

    // Reset daily count if the date has changed
    if (lastRegenDate !== todayStr) {
      dailyRegenCount = 0;
      lastRegenDate = todayStr;
    }

    if (usePowerUp) {
      if (planRefreshCount <= 0) {
        throw new HttpsError('resource-exhausted', 'No Plan Refresh power-up available.');
      }
      
      // Consume a Plan Refresh power-up
      tx.update(userRef, {
        'powerUps.planRefresh': planRefreshCount - 1
      });
    } else {
      if (dailyRegenCount >= 5) {
        throw new HttpsError('resource-exhausted', 'Daily free limit of 5 reached. Must use a Plan Refresh power-up.');
      }
      
      // Consume a free daily regeneration
      tx.update(userRef, {
        dailyRegenCount: dailyRegenCount + 1,
        lastRegenDate: todayStr
      });
    }
  });
}

module.exports = { checkRateLimit };
