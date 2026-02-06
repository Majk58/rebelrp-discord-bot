import { Client, GatewayIntentBits } from 'npm:discord.js@14.14.1';

/* =========================
   NAČTENÍ ENV PROMĚNNÝCH
   ========================= */
const BOT_TOKEN = Deno.env.get('OTQ5NzI3NDQxOTE0NTc2OTU2.GtHbyY.R4kqIieVy6ByvQ2gO8svBYTta2nzDTV90wbnto');
const BASE44_API_URL = Deno.env.get('https://app.base44.com/api/apps/696a1a554d800f56c19ce8f7/entities/Product');
const BASE44_SERVICE_KEY = Deno.env.get('a315e0756c954ab1b0133cf03a87d10e');
const GUILD_ID = '1007078594104807475';

/* =========================
   DIAGNOSTIKA ENV
   ========================= */
console.log('ALL ENV:', Deno.env.toObject());

if (!BOT_TOKEN) console.error('❌ BOT_TOKEN není nastaven, login přeskočen');
if (!BASE44_API_URL) console.error('❌ BASE44_API_URL není nastaven');
if (!BASE44_SERVICE_KEY) console.error('❌ BASE44_SERVICE_KEY není nastaven');

/* =========================
   VYTVOŘENÍ DISCORD CLIENTA
   ========================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
  ],
});

/* =========================
   FUNKCE PRO SYNC S BASE44
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
   EVENTY DISCORD BOTA
   ========================= */

// Ready
client.on('ready', () => {
  console.log(`✅ Bot připojen jako ${client.user.tag}`);
});

// Member banned
client.on('guildBanAdd', async (ban) => {
  if (ban.guild.id !== GUILD_ID) return;
  console.log(`🚫 Ban: ${ban.user.username}`);
  await syncPlayerStatus(ban.user.id, {
    is_blacklisted: true,
    blacklist_reason: ban.reason || 'Ban z Discord serveru',
    is_on_server: false,
  });
});

// Member unbanned
client.on('guildBanRemove', async (ban) => {
  if (ban.guild.id !== GUILD_ID) return;
  console.log(`✅ Unban: ${ban.user.username}`);
  await syncPlayerStatus(ban.user.id, {
    is_blacklisted: false,
    blacklist_reason: null,
  });
});

// Member left server
client.on('guildMemberRemove', async (member) => {
  if (member.guild.id !== GUILD_ID) return;
  console.log(`👋 Opustil server: ${member.user.username}`);
  await syncPlayerStatus(member.user.id, {
    is_on_server: false,
  });
});

// Member joined server
client.on('guildMemberAdd', async (member) => {
  if (member.guild.id !== GUILD_ID) return;
  console.log(`👋 Připojil se: ${member.user.username}`);
  await syncPlayerStatus(member.user.id, {
    is_on_server: true,
    discord_roles: member.roles.cache.map((r) => r.id),
  });
});

// Role updated
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
   LOGIN DO DISCORDU
   ========================= */
if (BOT_TOKEN) {
  try {
    await client.login(BOT_TOKEN);
    console.log('✅ Bot se přihlásil na Discord');
  } catch (err) {
    console.error('❌ Chyba při loginu:', err);
  }
} else {
  console.error('❌ BOT_TOKEN není nastaven, login přeskočen');
}

/* =========================
   KEEP ALIVE PRO DENO DEPLOY
   ========================= */
Deno.serve(() => new Response('Bot is running!'));
