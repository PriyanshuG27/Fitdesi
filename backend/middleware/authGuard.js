const { adminAuth } = require('../lib/firebaseAdmin');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token segment.' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = { uid: decodedToken.uid };
    next();
  } catch (error) {
    console.error('[authGuard] Token verification failed:', error);
    return res.status(403).json({ error: 'Unauthorized: Access credentials rejected. ' + error.message });
  }
};
