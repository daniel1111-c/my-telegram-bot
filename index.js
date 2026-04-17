const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const Tesseract = require('tesseract.js');

const token = "8210342975:AAElwI386CxD3OAbnyjEIVR0pK7OW8loR8U";
const bot = new TelegramBot(token, { polling: true });

// 📅 תאריך של היום
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// 📂 טעינת נתונים
let data;
try {
  data = JSON.parse(fs.readFileSync('./names.json', 'utf8'));
} catch {
  data = { date: getTodayDate(), names: [] };
}

// 🔄 איפוס יומי
if (data.date !== getTodayDate()) {
  data = { date: getTodayDate(), names: [] };
  fs.writeFileSync('./names.json', JSON.stringify(data, null, 2), 'utf8');
}

// 🧠 נרמול טקסט
function normalize(str) {
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/-/g, '')
    .replace(/'/g, '')
    .toLowerCase();
}

// 🔁 היפוך מילים
function reverseWords(str) {
  return str.split(' ').reverse().join(' ');
}

// 🔍 בדיקת התאמה
function isMatch(input, name) {
  const normalizedInput = normalize(input);
  const normalizedName = normalize(name);

  if (
    normalizedInput === normalizedName ||
    normalizedInput === reverseWords(normalizedName)
  ) {
    return true;
  }

  const inputWords = normalizedInput.split(' ');
  const nameWords = normalizedName.split(' ');

  let matchingWords = 0;
  inputWords.forEach(word => {
    if (nameWords.includes(word)) matchingWords++;
  });

  return matchingWords >= 2;
}

// 💾 שמירה
function saveData() {
  fs.writeFileSync('./names.json', JSON.stringify(data, null, 2), 'utf8');
}

// 📩 הודעות טקסט
bot.on('message', (msg) => {
  const text = msg.text?.trim();
  if (!text) return;

  console.log("התחבר בהצלחה לטלגרם");

  // 📌 הצגת רשימה
  if (text === "הצג רשימה") {
    const list = data.names.join('\n') || "אין נתונים היום";
    return bot.sendMessage(msg.chat.id, list);
  }

  const normalizedText = normalize(text);

  // ❌ כפילות יומית
  if (data.names.includes(normalizedText)) {
    return bot.sendMessage(msg.chat.id, "⚠ השם כבר נבדק היום");
  }

  // 💾 שמירה
  data.names.push(normalizedText);
  saveData();

  // 🔍 חיפוש
  const found = data.names.find(name => isMatch(text, name));

  if (found) {
    bot.sendMessage(msg.chat.id, `✔ נמצא: ${found}`);
  } else {
    bot.sendMessage(msg.chat.id, `✖ לא נמצא ברשימה`);
  }
});

// 🖼️ קבלת תמונה (OCR)
bot.on('photo', async (msg) => {
  try {
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    const result = await Tesseract.recognize(fileUrl, 'heb+eng');
    const rawText = result.data.text.trim();

    if (!rawText) {
      return bot.sendMessage(msg.chat.id, "❌ לא זוהה טקסט בתמונה");
    }

    // ✂️ לוקח רק שורה ראשונה
    const extractedText = rawText.split('\n')[0].trim();

    // 📢 מציג מה נמצא בתמונה
    await bot.sendMessage(msg.chat.id, `📸 נמצא בתמונה: ${extractedText}`);

    const normalizedText = normalize(extractedText);

    // ❌ כפילות יומית
    if (data.names.includes(normalizedText)) {
      return bot.sendMessage(msg.chat.id, "⚠ השם כבר נבדק היום");
    }

    // 💾 שמירה
    data.names.push(normalizedText);
    saveData();

    // 🔍 חיפוש
    const found = data.names.find(name => isMatch(extractedText, name));

    if (found) {
      bot.sendMessage(msg.chat.id, `✔ נמצא ברשימה: ${found}`);
    } else {
      bot.sendMessage(msg.chat.id, `✖ לא נמצא ברשימה`);
    }

  } catch (err) {
    console.error(err);
    bot.sendMessage(msg.chat.id, "❌ שגיאה בקריאת התמונה");
  }
});