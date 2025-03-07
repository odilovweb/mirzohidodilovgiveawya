import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";

const bot = new Telegraf("8097329004:AAFbgj8DkCfvSS_i9zGXTcrldo7FfIYSUqU");

// Bot token va kanal username
const CHANNEL_USERNAME = "@OneDrop_uz";
const ADMIN_ID = 7507633393; // Admin Telegram ID

// Firebase konfiguratsiyasi
const firebaseConfig = {
  apiKey: "AIzaSyDWTS6XqZ4ArpD-qC50sAPjB2NsLrbU130",
  authDomain: "give-away-bbc8a.firebaseapp.com",
  projectId: "give-away-bbc8a",
  storageBucket: "give-away-bbc8a.firebasestorage.app",
  messagingSenderId: "961056408006",
  appId: "1:961056408006:web:b8f80d8acc26d87272b2c7",
  measurementId: "G-FDBVND53ZN",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkMembership(userId) {
  try {
    const chatMember = await bot.telegram.getChatMember(
      CHANNEL_USERNAME,
      userId
    );
    return ["member", "administrator", "creator"].includes(chatMember.status);
  } catch (error) {
    return false;
  }
}

let konkurslar = null;
async function getContests() {
  // try {
  //   const contestsSnapshot = await getDocs(collection(db, "contests"));
  //   if (contestsSnapshot.empty)
  //     return ctx.reply("📢 Hozirda aktiv konkurslar yo‘q.");

  //   let message = "📢 Hozirgi konkurslar:\n";
  //   contestsSnapshot.forEach((doc) => {
  //     message += `- ${doc.data().name} : ${doc.data().link}\n`;
  //   });
  //   konkurslar = message;
  // } catch (error) {
  //   console.log(error);
  // }

  try {
    const usersSnapshot = await getDocs(collection(db, "top3-1"));
    let users = [];
    usersSnapshot.forEach((doc) => {
      users.push({
        username: doc.data().username,
        referrals: doc.data().referrals,
        id: doc.data().userId,
      });
    });
    users.sort((a, b) => b.referrals - a.referrals);
    let message =
      "🏆 Ushbu konkursda eng ko'p eng ko'p referal yiqqan foydalanuvchilar 👇:\n";
    users.slice(0, 10).forEach((user, index) => {
      message += `${index + 1}. [${user.id}](tg://user?id=${user.id}) - ${
        user.referrals
      } ta referal\n`;
    });

    message += `
📢Barcha yangiliklar ushbu kanalda: @GiveawaysNFTs`;

    konkurslar = message;
  } catch (error) {
    console.log(error);
  }
}
bot.action(/^addReferal_([a-zA-Z0-9]+)$/, async (ctx) => {
  try {
    await ctx.editMessageReplyMarkup(); // Reply markupni olib tashlash
    await ctx.answerCbQuery();

    if (!ctx.match) {
      return ctx.answerCbQuery("Xatolik yuz berdi, qaytadan urining.");
    }

    const userId = ctx.match[1]; // id ni olish
    const isMember = await checkMembership(ctx.from.id);
    if (isMember) {
      if (userId) {
        try {
          bot.telegram.sendMessage(
            userId,
            `[${ctx.from.id}](tg://user?id=${ctx.from.id}) - Ushbu foydalanuvchi sizning referal linkingiz orqali botga start bosdi va to'liq shartlarni bajardi , referal hisobingizga qo'shildi✅🎊`,
            {
              parse_mode: "Markdown",
            }
          );
        } catch (error) {
          console.log(error);
        }
        const inviterRef = doc(db, "users", userId.toString());
        const inviterSnap = await getDoc(inviterRef);
        if (inviterSnap.exists()) {
          await updateDoc(inviterRef, {
            referrals: inviterSnap.data().referrals + 1,
          });
        }

        const contestRef = doc(db, "3day-1", userId.toString());
        const contestSnap = await getDoc(contestRef);
        if (contestSnap.exists()) {
          await updateDoc(contestRef, {
            referrals: contestSnap.data().referrals + 1,
          });
        }
      }
      try {
        try {
          await ctx.telegram.deleteMessage(
            ctx.from.id,
            ctx.callbackQuery.message.message_id
          );
        } catch (error) {
          console.log(error);
        }
        return ctx.reply(
          `🎉 Xush kelibsiz! Siz konkursda qatnashyapsiz.
        
Botdan to'liq foydalanishingiz mumkin`,
          {
            reply_markup: {
              keyboard: [
                [{ text: "Konkurslar 🎁" }, { text: "Reyting 🏆" }],
                [{ text: "Referal Link 🔗" }],
              ],
              resize_keyboard: true,
            },
          }
        );
      } catch (error) {
        console.log(error);
      }
    } else {
      try {
        await ctx.telegram.deleteMessage(
          ctx.from.id,
          ctx.callbackQuery.message.message_id
        );
      } catch (error) {
        console.log(error);
      }
      return ctx.reply(
        `❌ Siz kanalga a'zo emassiz! Konkursda qatnashish uchun quyidagi kanalga qo'shiling:\n[Kanalga qo'shilish](https://t.me/${CHANNEL_USERNAME.replace(
          "@",
          ""
        )})`,
        {
          parse_mode: "Markdown",
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Tekshirish 🔄",
                  callback_data: `addReferal_${userId}`,
                },
              ],
            ],
          },
        }
      );
    }

    await ctx.answerCbQuery(); // "Loading..." ko'rsatish uchun
  } catch (error) {
    console.log(error);
  }
});

bot.start(async (ctx) => {
  try {
    const userId = ctx.from.id;
    const username = ctx.from.username || "NoUsername";
    const referralId = ctx.startPayload ? parseInt(ctx.startPayload) : null;

    const isMember = await checkMembership(userId);
    console.log(isMember);

    const userRef = doc(db, "users", userId.toString());
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      try {
        if (referralId) {
          bot.telegram.sendMessage(
            referralId,
            `[${ctx.from.id}](tg://user?id=${ctx.from.id}) - Ushbu foydalanuvchi sizning referal linkingiz orqali botga start bosdi , to'liq shartlarni bajargandan so'ng referal hisobingizga qo'shiladi ⏳`,
            {
              parse_mode: "Markdown",
            }
          );
        }
      } catch (error) {
        console.log(error);
      }
      try {
        await setDoc(userRef, {
          username,
          invited_by: referralId,
          referrals: 0,
          userId: ctx.from.id,
        });
        const usersRef = doc(db, "statistic", "W9VSzQk3401EYFK9FGe0");
        const usersSnap = await getDoc(usersRef);
        if (usersSnap.exists()) {
          await updateDoc(usersRef, {
            users: usersSnap.data().users + 1,
          });
        }

        const contestRef = doc(db, "3day-1", userId.toString());
        const contestSnap = await getDoc(contestRef);
        if (contestSnap.exists()) {
          await updateDoc(contestRef, {
            referrals: contestSnap.data().referrals + 1,
          });
        } else {
          await setDoc(contestRef, {
            referrals: 0,
            userId: ctx.from.id,
          });
        }
      } catch (error) {
        console.log(error);
      }

      if (isMember) {
        try {
          ctx.reply(
            `🎉 Xush kelibsiz! Siz konkursda qatnashyapsiz.
          
  Botdan to'liq foydalanishingiz mumkin`,
            {
              reply_markup: {
                keyboard: [
                  [{ text: "Konkurslar 🎁" }, { text: "Reyting 🏆" }],
                  [{ text: "Referal Link 🔗" }],
                ],
                resize_keyboard: true,
              },
            }
          );
        } catch (error) {
          console.log(error);
        }

        if (referralId) {
          const inviterRef = doc(db, "users", referralId.toString());
          const inviterSnap = await getDoc(inviterRef);
          try {
            bot.telegram.sendMessage(
              referralId,
              `[${ctx.from.id}](tg://user?id=${ctx.from.id}) - Ushbu foydalanuvchi sizning referal linkingiz orqali botga start bosdi va to'liq shartlarni bajardi , referal hisobingizga qo'shildi✅🎊`,
              {
                parse_mode: "Markdown",
              }
            );
          } catch (error) {
            console.log(error);
          }
          if (inviterSnap.exists()) {
            await updateDoc(inviterRef, {
              referrals: inviterSnap.data().referrals + 1,
            });
          }
        }
      } else {
        return ctx.reply(
          `❌ Siz kanalga a'zo emassiz! Konkursda qatnashish uchun quyidagi kanalga qo'shiling:\n[Kanalga qo'shilish](https://t.me/${CHANNEL_USERNAME.replace(
            "@",
            ""
          )})`,
          {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Tekshirish 🔄",
                    callback_data: `addReferal_${referralId}`,
                  },
                ],
              ],
            },
          }
        );
      }
    } else {
      if (!isMember) {
        return ctx.reply(
          `❌ Siz kanalga a'zo emassiz! Konkursda qatnashish uchun quyidagi kanalga qo'shiling:\n[Kanalga qo'shilish](https://t.me/${CHANNEL_USERNAME.replace(
            "@",
            ""
          )})`,
          {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Tekshirish 🔄",
                    callback_data: `addReferal_null`,
                  },
                ],
              ],
            },
          }
        );
      } else {
        ctx.reply(
          `🎉 Xush kelibsiz! Siz konkursda qatnashyapsiz.
          
  Botdan to'liq foydalanishingiz mumkin`,
          {
            reply_markup: {
              keyboard: [
                [{ text: "Konkurslar 🎁" }, { text: "Reyting 🏆" }],
                [{ text: "Referal Link 🔗" }],
              ],
              resize_keyboard: true,
            },
          }
        );
      }
    }
  } catch (error) {
    console.log(error);
  }
});

bot.on("message", async (ctx) => {
  try {
    const isMember = await checkMembership(ctx.from.id);
    if (!isMember) {
      try {
        return ctx.reply(
          `❌ Siz kanalga a'zo emassiz! Konkursda qatnashish uchun quyidagi kanalga qo'shiling:\n[Kanalga qo'shilish](https://t.me/${CHANNEL_USERNAME.replace(
            "@",
            ""
          )})`,
          {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Tekshirish 🔄",
                    callback_data: `addReferal_null`,
                  },
                ],
              ],
            },
          }
        );
      } catch (error) {
        console.log(error);
      }
    } else if (ctx.message.text == "Reyting 🏆") {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        let users = [];
        usersSnapshot.forEach((doc) => {
          users.push({
            username: doc.data().username,
            referrals: doc.data().referrals,
            id: doc.data().userId,
          });
        });
        users.sort((a, b) => b.referrals - a.referrals);
        let message = "🏆 Eng ko‘p referal chaqirganlar:\n";
        users.slice(0, 10).forEach((user, index) => {
          message += `${index + 1}. [${user.id}](tg://user?id=${user.id}) - ${
            user.referrals
          } ta referal\n`;
        });

        ctx.reply(message, { parse_mode: "Markdown" });
      } catch (error) {
        console.log(error);
      }
    } else if (ctx.message.text == "Konkurslar 🎁") {
      if (!konkurslar) {
        await getContests();
        setTimeout(() => {
          konkurslar = null;
        }, 1000 * 60 * 10);
      }
      ctx.reply(konkurslar, { parse_mode: "Markdown" });
    } else if (ctx.message.text == "Referal Link 🔗") {
      try {
        const usersRef = doc(db, "users", ctx.from.id.toString());
        const usersSnap = await getDoc(usersRef);
        let count;
        if (usersSnap.exists()) {
          count = await usersSnap.data().referrals;
        }
        ctx.reply(
          `Sizning referal linkingiz : https://t.me/Giveaway_NFT_bot?start=${ctx.from.id}
Referallaringiz soni: ${count}`
        );
      } catch (error) {
        console.log(error);
      }
    }
  } catch (error) {
    console.log(error);
  }
});

bot.command("reyting", async (ctx) => {
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    let users = [];
    usersSnapshot.forEach((doc) => {
      users.push({
        username: doc.data().username,
        referrals: doc.data().referrals,
        id: doc.data().userId,
      });
    });
    users.sort((a, b) => b.referrals - a.referrals);
    let message = "🏆 Eng ko‘p referal chaqirganlar:\n";
    users.slice(0, 10).forEach((user, index) => {
      message += `${index + 1}. [${user.id}](tg://user?id=${user.id}) - ${
        user.referrals
      } ta referal\n`;
    });
    ctx.reply(message, { parse_mode: "Markdown" });
  } catch (error) {
    console.log(error);
  }
});

bot.command("konkurslar", async (ctx) => {
  try {
    const contestsSnapshot = await getDocs(collection(db, "contests"));
    if (contestsSnapshot.empty)
      return ctx.reply("📢 Hozirda aktiv konkurslar yo‘q.");

    let message = "📢 Hozirgi konkurslar:\n";
    contestsSnapshot.forEach((doc) => {
      message += `- ${doc.data().name} : ${doc.data().link}\n`;
    });

    ctx.reply(message, { parse_mode: "Markdown" });
  } catch (error) {
    console.log(error);
  }
});

bot.command("add_konkurs", async (ctx) => {
  const userId = ctx.from.id;
  try {
    if (userId !== ADMIN_ID) return ctx.reply("⛔ Siz admin emassiz!");

    const contestName = ctx.message.text.split("+").slice(1, 2).join(" ");
    const contestLink = ctx.message.text.split("+").slice(2).join(" ");
    // const contestId = ctx.message.text.split("+").slice(3).join(" ");

    console.log(contestLink);
    console.log(contestName);

    if (!contestName && !contestLink && !contestId)
      return ctx.reply("❌ Konkurs nomini va linkini to'g'ri kiriting!");
    const contestId = contestLink.split("-").slice(1).join(" ");

    await setDoc(doc(db, "contests", contestId), {
      name: contestName,
      link: contestLink,
      active: true,
    });
    ctx.reply(
      `✅ Konkurs qo‘shildi: ${contestName}
${contestLink}`
    );
  } catch (error) {
    console.log(error);
  }
});

bot.launch();
