import { config } from 'dotenv';
import admin from 'firebase-admin';
import getenv from 'getenv';

config();

const app = admin.initializeApp({
  // credential: admin.credential.applicationDefault(),
  databaseURL: `http://${getenv('FIRESTORE_EMULATOR_HOST')}`,
  projectId: 'project-test',
});

export const db = app.firestore();

const deleteQueryBatch = async (query, batchSize) => {
  const snapshot = await query.get();

  // When there are no documents left, we are done
  if (snapshot.size === 0) {
    return null;
  }

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  return snapshot.size !== 0 ? deleteQueryBatch(query, batchSize) : null;
};

export const deleteCollection = (collectionPath, batchSize = 100) => {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return deleteQueryBatch(query, batchSize);
};
