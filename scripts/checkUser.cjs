const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function checkUser() {
  console.log('--- Checking Users ---');
  const snap = await db.collection('users').limit(5).get();
  console.log(`Users found: ${snap.size}`);
  snap.docs.forEach(doc => {
    console.log(`User ID (doc.id): ${doc.id}`);
    console.log(`User Data:`, doc.data());
    console.log('------------------------');
  });
}

checkUser().catch(console.error);
