'use strict';

const path = require('path');

// Initialize environment if needed
process.env.VITE_FIREBASE_EMULATOR = 'false'; // Target live production database

const { adminDb } = require('../backend/lib/firebaseAdmin');
const { sendPushNotification } = require('../backend/lib/fcmSender');

async function main() {
  console.log('Fetching all users from the users collection...');
  
  try {
    const usersSnap = await adminDb.collection('users').get();
    const uids = [];
    
    usersSnap.forEach(doc => {
      const data = doc.data();
      if (doc.id) {
        uids.push(doc.id);
      }
    });

    console.log(`Found ${uids.length} users. Sending push notification...`);

    if (uids.length === 0) {
      console.log('No users found to notify.');
      return;
    }

    await sendPushNotification({
      recipientUids: uids,
      title: 'FitDesi Update: v1.1.1 is Live! 🚀',
      body: 'Dynamic leaderboard refresh timers, force sync, and database optimizations are now live. Tap to see What\'s New!',
      data: { url: '/profile' }
    });

    console.log('Broadcast complete!');
  } catch (err) {
    console.error('Failed to broadcast update notification:', err);
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
