import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const serviceAccountPath = path.resolve('serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('Service account key not found at:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function dumpUsers() {
  console.log('Fetching users from Firestore...');
  const snapshot = await db.collection('users').get();
  
  if (snapshot.empty) {
    console.log('No users found.');
    return;
  }

  snapshot.forEach(doc => {
    console.log(`\n================= USER: ${doc.id} =================`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

dumpUsers()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
