/**
 * rateLimiter.js
 *
 * Firestore-backed rate limiter for the generatePlan Cloud Function.
 *
 * Tracks the free daily plan regenerations directly on the user's document:
 *   dailyRegenCount {number} - count of free regenerations done today
 *   lastRegenDate   {string} - YYYY-MM-DD date when last free regeneration occurred
 *
 * Rules:
 *   - Limit: 5 free regenerations per calendar day (UTC-based server date).
 *   - If the limit of 5 is exceeded, the user must use a 'planRefresh' power-up.
 *   - We use a Firestore transaction to ensure atomic reads/writes and prevent concurrent bypass.
 */

'use strict';

const { HttpsError } = require('firebase-functions/v2/https');

/**
 * Checks the daily rate limit and/or consumes a Plan Refresh power-up.
 *
 * @param {FirebaseFirestore.Firestore} db          - Admin Firestore instance
 * @param {string}                      uid         - validated Firebase UID
 * @param {boolean}                     usePowerUp  - whether the user requests to consume a power-up
 * @returns {Promise<void>}
 * @throws {HttpsError}
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
