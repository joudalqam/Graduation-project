import pkg from 'whatsapp-web.js'
const { Client, LocalAuth } = pkg
import qrcode from 'qrcode-terminal'

// 🔥 Debug errors
process.on('unhandledRejection', err => console.error('❌ Unhandled:', err))
process.on('uncaughtException', err => console.error('❌ Exception:', err))

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "trip-bot"
  }),
  puppeteer: {
    headless: false, // 👈 IMPORTANT for debugging
    args: ['--no-sandbox']
  }
})

let isReady = false
const conversations = {}

// QR
client.on('qr', (qr) => {
  console.log('\n📱 Scan QR:\n')
  qrcode.generate(qr, { small: true })
})

// READY
client.on('ready', () => {
  console.log('✅ WhatsApp Bot is ready!')
  isReady = true
})

// DEBUG EVENTS
client.on('loading_screen', (p, msg) => console.log('Loading:', p, msg))
client.on('auth_failure', msg => console.error('❌ AUTH FAIL:', msg))
client.on('disconnected', reason => console.log('⚠️ Disconnected:', reason))
client.on('error', err => console.error('❌ Client error:', err))


client.on('message', async (msg) => {
    const phone = msg.from;
    const text = msg.body.toLowerCase().trim();
    const conv = conversations[phone];

    if (!conv) return;

    // 1. Handling YES
    if (text === 'yes' || text === 'y' || text === 'نعم') {
        const currentPlace = conv.places[conv.currentIndex].name;
        
        await msg.reply(`The reservation for *${currentPlace}* is confirmed! ✅`);
        
        // Move to next place or finish
        conv.currentIndex++;
        if (conv.currentIndex < conv.places.length) {
            const nextPlace = conv.places[conv.currentIndex];
            setTimeout(async () => {
                await client.sendMessage(phone, `Next up: Would you like me to book *${nextPlace.name}* as well?`);
            }, 2000);
        } else {
            await client.sendMessage(phone, "All set! Your itinerary is looking great. ✈️");
            delete conversations[phone];
        }
    }

    // 2. Handling NO
    else if (text === 'no' || text === 'n' || text === 'لا') {
        await msg.reply("No problem! Is there any other place in your mind you want me to help you reserve in? 💭");
        
        // Change state to wait for their custom suggestion
        conv.state = 'waiting_custom_suggestion';
    }

    // 3. Handling their custom suggestion
    else if (conv.state === 'waiting_custom_suggestion') {
        await msg.reply(`Got it! I'll look into *${msg.body}* and let you know if a reservation is available. 🔍`);
        conv.state = 'asking'; // Reset state
    }
});

// SEND FUNCTION
async function startReservationBot(phone, destination, places) {
    try {
        if (!isReady) return console.log('❌ Bot not ready');

        const clean = phone.replace(/\D/g, '');
        let finalNumber = clean.startsWith('0') ? '962' + clean.slice(1) : clean;
        const formattedPhone = `${finalNumber}@c.us`;

        // Initialize conversation state first
        conversations[formattedPhone] = {
            destination,
            places,
            currentIndex: 0,
            confirmed: [],
            skipped: [],
            state: 'asking'
        };

        const firstPlace = places[0];

        // The New "Direct" Message
        const firstMessage = 
            `👋 Hi! I'm your Trip Concierge.\n\n` +
            `I see there is a reservation for *${firstPlace.name}* on your itinerary (Day ${firstPlace.day || 1}).\n\n` +
            `If you want to say *yes*, I will confirm the reservation for you right now! ✅`;

        await client.sendMessage(formattedPhone, firstMessage);
        console.log("✅ Proactive message sent!");

    } catch (err) {
        console.error("❌ START FAILED:", err);
    }
}

client.initialize()

export { startReservationBot }