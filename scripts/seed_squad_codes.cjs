const { adminDb } = require('../backend/lib/firebaseAdmin');

async function seedSquadCodes() {
  console.log('--- SEEDING SQUAD CODES ---');
  try {
    const usersSnap = await adminDb.collection('users').get();
    console.log(`Found ${usersSnap.size} user(s).`);

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const uid = userDoc.id;
      let code = userData.squadCode;

      if (!code) {
        // Generate code
        const namePart = (userData.name || 'Zenkai').replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
        const padName = namePart.padEnd(4, 'X');
        const randomDigits = Math.floor(100 + Math.random() * 900);
        code = `ZK-${padName}${randomDigits}`;
        
        console.log(`Generating code ${code} for ${userData.name} (${userData.email})`);
        
        // Update user document
        await adminDb.collection('users').doc(uid).update({ squadCode: code });
      } else {
        console.log(`User ${userData.name} already has code ${code}`);
      }

      // Sync/set in squad_codes
      await adminDb.collection('squad_codes').doc(code).set({
        uid,
        name: userData.name || 'Anonymous Bro',
        xp: userData.xp || 0,
        level: userData.level || 1,
        streak: userData.streak || 0,
        volume: userData.latestVolume || 0,
        squadCode: code,
        updatedAt: new Date()
      }, { merge: true });
    }
    console.log('--- SEEDING COMPLETE ---');
  } catch (err) {
    console.error('Seeding failed:', err);
  }
}

seedSquadCodes();
