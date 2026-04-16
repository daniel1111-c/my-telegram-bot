const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const token = "8210342975:AAElwI386CxD3OAbnyjEIVR0pK7OW8loR8U";
const bot = new TelegramBot(token, { polling: true });

// טעינת שמות מהקובץ
let names = JSON.parse(fs.readFileSync('./names.json', 'utf8'));

// נרמול טקסט (מוריד רווחים, מסדר ומסיר מקפים)
function normalize(str) {
  return str
    .trim()
    .replace(/\s+/g, ' ')  // הופך רווחים מרובים לרווח אחד
    .replace(/-/g, '')      // מסיר מקפים
    .replace(/'/g, '')      // מתעלם מהסימן '
    .toLowerCase();        // משנה לקטן
}

// הופך סדר מילים (אופציה ל"שם הפוך")
function reverseWords(str) {
  return str.split(' ').reverse().join(' ');
}

// פונקציה לבדוק אם לפחות שתי מילים מהשם קיימות בחיפוש
function isMatch(input, name) {
  const normalizedInput = normalize(input);
  const normalizedName = normalize(name);

  // אם השם ההפוך תואם
  if (normalizedInput === normalizedName || normalizedInput === reverseWords(normalizedName)) {
    return true;
  }

  // נוודא שיש לפחות 2 מילים תואמות
  const inputWords = normalizedInput.split(' ');
  const nameWords = normalizedName.split(' ');

  let matchingWords = 0;
  inputWords.forEach(inputWord => {
    if (nameWords.includes(inputWord)) {
      matchingWords++;
    }
  });

  return matchingWords >= 2; // לפחות 2 מילים תואמות
}

// הודעות
bot.on('message', (msg) => {
  const text = msg.text?.trim();
  if (!text) return;

  // הודעה ל-`CMD` בהצלחה
  console.log("התחבר בהצלחה לטלגרם");

  // 📌 הצגת כל הרשימה
  if (text === "הצג רשימה") {
    // חיתוך הרשימה לחלקים קטנים יותר
    const chunkSize = 4096; // המגבלה של טלגרם להודעה
    let chunk = '';
    let counter = 0;

    names.forEach((name, index) => {
      if (counter + name.length + 1 > chunkSize) {
        bot.sendMessage(msg.chat.id, chunk);
        chunk = name + '\n'; // התחלת חלק חדש
        counter = name.length + 1;
      } else {
        chunk += name + '\n';
        counter += name.length + 1;
      }

      if (index === names.length - 1 && chunk) {
        bot.sendMessage(msg.chat.id, chunk); // שליחת החלק האחרון
      }
    });
    return;
  }

  // 🚀 הוספת שם חדש
  if (text.startsWith("הוסף ")) {
    const nameToAdd = text.slice(5).trim();
    if (nameToAdd && !names.includes(nameToAdd)) {
      names.push(nameToAdd);
      fs.writeFileSync('./names.json', JSON.stringify(names, null, 2), 'utf8');
      return bot.sendMessage(msg.chat.id, `✔ שם נוסף בהצלחה: ${nameToAdd}`);
    } else {
      return bot.sendMessage(msg.chat.id, `✖ השם כבר קיים או לא תקין`);
    }
  }

  // ❌ הסרת שם
  if (text.startsWith("הסר ")) {
    const nameToRemove = text.slice(4).trim();
    if (nameToRemove && names.includes(nameToRemove)) {
      names = names.filter(name => name !== nameToRemove);
      fs.writeFileSync('./names.json', JSON.stringify(names, null, 2), 'utf8');
      return bot.sendMessage(msg.chat.id, `✔ שם הוסר בהצלחה: ${nameToRemove}`);
    } else {
      return bot.sendMessage(msg.chat.id, `✖ השם לא נמצא ברשימה`);
    }
  }

  // בדיקת שם
  const found = names.find(name => isMatch(text, name));

  if (found) {
    bot.sendMessage(msg.chat.id, `✔ נמצא: ${found}`);
  } else {
    bot.sendMessage(msg.chat.id, `✖ לא נמצא ברשימה`);
  }
});