import { firestore } from "./firestore.server";

export async function cacheDashboardData(userId: string, data: any) {
  await firestore.collection("teacherDashCache").doc(userId).set({
    data,
    updatedAt: Date.now(),
  });
}

export async function getCachedDashboard(userId: string) {
  const doc = await firestore.collection("teacherDashCache").doc(userId).get();
  if (!doc.exists) return null;
  return doc.data().data;
}