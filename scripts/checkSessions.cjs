const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkChallenges() {
  console.log('--- Checking Global Challenges ---');
  const snap = await db.collection('challenges').get();
  console.log(`Total challenges found: ${snap.size}`);
  snap.docs.forEach(doc => {
    console.log(`Challenge: ${doc.id}`, doc.data());
  });
}

checkChallenges().catch(console.error);
