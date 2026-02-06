import { Client, GatewayIntentBits } from 'npm:discord.js@14.14.1';

/* =========================
   DIAGNOSTIKA ENV
   ========================= */
console.log('ALL ENV:', Deno.env.toObject());

/* =========================
   ENV PROMĚNNÉ
   ========================= */
const BOT_TOKEN = Deno.env.get('OTQ5NzI3NDQxOTE0NTc2OTU2.GkTA5R.fwGrsi8guHH4tZlGYM_hrp4QVcTcpwlyBx6Haw');
const GUILD_ID = '1007078594104807475';
const BASE44_API_URL = Deno.env.get('https://app.base44.com/api/apps/696a1a554d800f56c19ce8f7/entities/Product');
const BASE44_SERVICE_KEY = Deno.env.get('a315e0756c954ab1b0133cf03a87d10e');

/* =========================
   KONTROLA ENV (bez crashu)
   ========================= */
if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN chybí – bot se nepřihlásí');
}
if (!BASE44_API_URL) {
  console.error('❌ BASE44_API_URL chybí');
}
if (!BASE44_SERVICE_KEY) {
  console.error('❌ BASE44_SERVICE_KEY chybí');
}

/* =========================
   DISCORD CLIENT
   ========================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
  ],
});

/* =========================
   SYNC FUNKCE
   ========================= */
async function syncPlayerStatus(discordId, data) {
  if (!BASE44_API_URL || !BASE44_SERVICE_KEY) return;

  try {
    const response = await fetch(
      `${BASE44_API_URL}/api/functions/syncPlayerStatus`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${BASE44_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          discord_id: discordId,
          ...data,
        }),
      }
    );

    const result = await response.json();
    console.log('✅ Synced player status:', result);
  } catch (error) {
    console.error('❌ Failed to sync:', error);
  }
}

/* =========================
   READY
   ========================= */
client.on('ready', () => {
  console.log(`✅ Bot připojen jako ${client.user.tag}`);
});

/* =========================
   BAN
   ========================= */
client.on('guildBanAdd', async (ban) => {
  if (ban.guild.id !== GUILD_ID) return;

  console.log(`🚫 Ban: ${ban.user.username}`);
  await syncPlayerStatus(ban.user.id, {
    is_blacklisted: true,
    blacklist_reason: ban.reason || 'Ban z Discord serveru',
    is_on_server: false,
  });
});

/* =========================
   UNBAN
   ========================= */
client.on('guildBanRemove', async (ban) => {
  if (ban.guild.id !== GUILD_ID) return;

  console.log(`✅ Unban: ${ban.user.username}`);
  await syncPlayerStatus(ban.user.id, {
    is_blacklisted: false,
    blacklist_reason: null,
  });
});

/* =========================
   MEMBER LEAVE
   ========================= */
client.on('guildMemberRemove', async (member) => {
  if (member.guild.id !== GUILD_ID) return;

  console.log(`👋 Opustil server: ${member.user.username}`);
  await syncPlayerStatus(member.user.id, {
    is_on_server: false,
  });
});

/* =========================
   MEMBER JOIN
   ========================= */
client.on('guildMemberAdd', async (member) => {
  if (member.guild.id !== GUILD_ID) return;

  console.log(`👋 Připojil se: ${member.user.username}`);
  await syncPlayerStatus(member.user.id, {
    is_on_server: true,
    discord_roles: member.roles.cache.map((r) => r.id),
  });
});

/* =========================
   ROLE UPDATE
   ========================= */
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  if (newMember.guild.id !== GUILD_ID) return;

  const oldRoles = oldMember.roles.cache.map((r) => r.id);
  const newRoles = newMember.roles.cache.map((r) => r.id);

  if (JSON.stringify(oldRoles) !== JSON.stringify(newRoles)) {
    console.log(`🎭 Role změněny: ${newMember.user.username}`);
    await syncPlayerStatus(newMember.user.id, {
      discord_roles: newRoles,
    });
  }
});

/* =========================
   LOGIN (jen pokud BOT_TOKEN existuje)
   ========================= */
if (BOT_TOKEN) {
  await client.login(BOT_TOKEN);
} else {
  console.error('❌ BOT_TOKEN není nastaven, login přeskočen');
}

/* =========================
   KEEP ALIVE (Deno Deploy)
   ========================= */
Deno.serve(() => new Response('Bot is running'));


