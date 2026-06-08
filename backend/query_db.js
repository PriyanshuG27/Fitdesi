const { adminDb, adminAuth } = require('./lib/firebaseAdmin');

async function inspectDb() {
  console.log('--- FIRESTORE DB INSPECTION ---');
  try {
    const usersSnap = await adminDb.collection('users').get();
    console.log(`Found ${usersSnap.size} user(s) in database.`);
    
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const uid = userDoc.id;
      console.log(`\nUser: ${userData.name} (${userData.email})`);
      console.log(`  UID: ${uid}`);
      console.log(`  XP: ${userData.xp}, Level: ${userData.level}, Streak: ${userData.streak}`);
      console.log(`  Weight: ${userData.weightKg || userData.weight} kg`);
      console.log(`  GymName: ${userData.gymName}, GymId: ${userData.gymId}`);
      console.log(`  Medical Flags: ${JSON.stringify(userData.medicalFlags || [])}`);
      console.log(`  Equipment List: ${JSON.stringify(userData.equipmentList || [])}`);

      // Query sessions subcollection
      const sessionsSnap = await adminDb.collection('users').doc(uid).collection('sessions').get();
      console.log(`  -> "sessions" subcollection has ${sessionsSnap.size} documents.`);
      sessionsSnap.docs.forEach((sDoc, i) => {
        const sData = sDoc.data();
        const sDate = sData.date?.toDate ? sData.date.toDate() : sData.date;
        console.log(`     [${i}] ID: ${sDoc.id}, Date: ${sDate}, Volume: ${sData.totalVolume}, Sets: ${sData.totalSets}`);
      });

      // Query executed_sessions subcollection
      const execSnap = await adminDb.collection('users').doc(uid).collection('executed_sessions').get();
      console.log(`  -> "executed_sessions" subcollection has ${execSnap.size} documents.`);
      execSnap.docs.forEach((eDoc, i) => {
        const eData = eDoc.data();
        const eDate = eData.date?.toDate ? eData.date.toDate() : eData.date;
        console.log(`     [${i}] ID: ${eDoc.id}, Date: ${eDate}, Volume: ${eData.totalVolume}, Sets: ${eData.totalSets}`);
      });

      // Query prs subcollection
      const prsSnap = await adminDb.collection('users').doc(uid).collection('prs').get();
      console.log(`  -> "prs" subcollection has ${prsSnap.size} documents.`);
      prsSnap.docs.forEach((pDoc, i) => {
        const pData = pDoc.data();
        console.log(`     [${i}] ID: ${pDoc.id}, Name: ${pData.name || pData.exerciseName}, Weight: ${pData.weight}, Reps: ${pData.reps}`);
      });
    }
  } catch (err) {
    console.error('Inspection failed:', err);
  }
}

inspectDb();
