const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendVerificationEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Требуется авторизация');
  }
  
  try {
    const user = await admin.auth().getUser(context.auth.uid);
    const emailLink = await admin.auth().generateEmailVerificationLink(user.email);
    
    // Отправка письма (интеграция с почтовым сервисом)
    await sendCustomEmail(user.email, emailLink);
    
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

async function sendCustomEmail(email, link) {
  // Реализация отправки письма через SendGrid, Mailgun и т.д.
}
