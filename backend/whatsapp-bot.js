import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
 
// ── Puppeteer client (headless:false = visible window so you can scan QR) ──
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: false,          // visible window – change to true after first QR scan
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  }
});
 
// ── Active conversation store ──
// Key  : phone number in WhatsApp format  e.g. "96279XXXXXXX@c.us"
// Value: { destination, places, currentIndex, confirmed, skipped, state }
const conversations = {};
 
// ─────────────────────────────────────────
//  CLIENT EVENTS
// ─────────────────────────────────────────
 
client.on('qr', (qr) => {
  console.log('\n📱 Scan this QR code with your WhatsApp:');
  qrcode.generate(qr, { small: true });
});
 
client.on('ready', () => {
  console.log('✅ WhatsApp Bot is ready!');
});
 
client.on('auth_failure', (msg) => {
  console.error('❌ WhatsApp auth failed:', msg);
});
 
client.on('disconnected', (reason) => {
  console.warn('⚠️  WhatsApp disconnected:', reason);
});
 
// ─────────────────────────────────────────
//  SINGLE MESSAGE HANDLER  (only one!)
// ─────────────────────────────────────────
 
client.on('message_create', async (msg) => {
    // Ignore bot's own messages
    if (msg.fromMe) return;
  
    const phone = msg.from;
    const text  = msg.body.toLowerCase().trim();
    const conv  = conversations[phone];
  
    console.log("📨 Incoming message:", text);
  
    // Ignore users not in conversation
    if (!conv) {
      console.log("⚠️ No active conversation for:", phone);
      return;
    }
  
    console.log(`📩 [${phone}] state="${conv.state}" text="${text}"`);
  
    try {
  
      // ── asking state ──
      if (conv.state === 'asking') {
  
        if (isYes(text)) {
  
          const place = conv.places[conv.currentIndex];
          conv.state = 'waiting_time';
  
          await client.sendMessage(phone,
            `Great! 🎉 What time works for you at *${place.name}*?\n\n` +
            `📅 Suggested time: *${place.time}*\n\n` +
            `Reply with your preferred time or type *same*`
          );
  
        } else if (isNo(text)) {
  
          conv.skipped.push(conv.places[conv.currentIndex].name);
          conv.currentIndex++;
  
          await askNextReservation(phone);
  
        } else {
  
          await client.sendMessage(
            phone,
            '❓ Please reply *yes* or *no*.'
          );
        }
      }
  
      // ── waiting_time state ──
      else if (conv.state === 'waiting_time') {
  
        const place = conv.places[conv.currentIndex];
  
        const chosenTime =
          text === 'same'
            ? place.time
            : msg.body.trim();
  
        conv.confirmed.push({
          name: place.name,
          time: chosenTime,
          day: place.day
        });
  
        conv.currentIndex++;
        conv.state = 'asking';
  
        await client.sendMessage(
          phone,
          `✅ *${place.name}* reserved for *${chosenTime}*! 🎊`
        );
  
        await askNextReservation(phone);
      }
  
    } catch (err) {
      console.error('❌ Error handling message:', err);
    }
  });
 
// ─────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────
 
function isYes(text) {
  return ['yes', 'y', 'yeah', 'yep', 'sure', 'ok', 'okay', 'نعم', 'اه', 'ايه'].includes(text);
}
 
function isNo(text) {
  return ['no', 'n', 'nope', 'skip', 'pass', 'لا'].includes(text);
}
 
// Send the next reservation question, or the final summary
async function askNextReservation(phone) {
  const conv = conversations[phone];
  if (!conv) return;
 
  // ── All places handled → send summary ──
  if (conv.currentIndex >= conv.places.length) {
    let summary = `🎉 *Reservation Summary — ${conv.destination}*\n\n`;
 
    if (conv.confirmed.length > 0) {
      summary += `✅ *Confirmed Reservations:*\n`;
      conv.confirmed.forEach(r => {
        summary += `  📍 ${r.name}  🕐 ${r.time}\n`;
      });
    } else {
      summary += `_No reservations were made._\n`;
    }
 
    if (conv.skipped.length > 0) {
      summary += `\n❌ *Skipped:*\n`;
      conv.skipped.forEach(s => {
        summary += `  • ${s}\n`;
      });
    }
 
    summary += `\n✈️ Enjoy your trip to *${conv.destination}*! Have a wonderful time! 🌍`;
 
    await client.sendMessage(phone, summary);
    delete conversations[phone];
    console.log(`🏁 Conversation ended for ${phone}`);
    return;
  }
 
  // ── Ask about the next place ──
  const place = conv.places[conv.currentIndex];
  conv.state = 'asking';
 
  const remaining = conv.places.length - conv.currentIndex;
  const progress  = `(${conv.currentIndex + 1} of ${conv.places.length})`;
 
  await client.sendMessage(phone,
    `📍 *${place.name}*  ${progress}\n` +
    `📅 Day ${place.day}  🕐 ${place.time}\n` +
    `⭐ Rating: ${place.rating ?? 'N/A'}\n` +
    (place.type ? `🍽️ ${place.type}\n` : '') +
    `\nWould you like to make a reservation here?\n` +
    `Reply *yes* or *no*`
  );
}
 
// ─────────────────────────────────────────
//  PUBLIC  — called from server.js
// ─────────────────────────────────────────
 
export async function startReservationBot(phone, destination, places) {
  // Normalise phone: strip non-digits then append @c.us
  const formattedPhone = phone.replace(/\D/g, '') + '@c.us';
 
  // Init conversation state
  conversations[formattedPhone] = {
    destination,
    places,          // [{ name, time, rating, type, day }]
    currentIndex: 0,
    confirmed: [],
    skipped: [],
    state: 'asking'
  };
 
  console.log(`🤖 Starting bot for ${formattedPhone} — ${places.length} place(s) to check`);
 
  // Send greeting
  await client.sendMessage(formattedPhone,
    `🤖 *Trip Planner Concierge*\n\n` +
    `Hello! I'm your AI booking assistant for your trip to *${destination}*.\n\n` +
    `I found *${places.length} place(s)* that may need a reservation.\n` +
    `I'll go through them one by one — just reply *yes* or *no* to each.\n\n` +
    `Let's start! 👇`
  );
 
  // Small delay so the greeting arrives first
  await new Promise(r => setTimeout(r, 1500));
 
  // Kick off the first question
  await askNextReservation(formattedPhone);
}
 
// ─────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────
 
client.initialize();