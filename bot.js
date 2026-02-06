import { Client, GatewayIntentBits } from 'npm:discord.js@14.14.1';

const BOT_TOKEN = Deno.env.get('OTQ5NzI3NDQxOTE0NTc2OTU2.GlYihv.Mgdh3vL0pLhl3FIMGRhjtMEmsjrPPsJWyq0-Ug');
const GUILD_ID = '1007078594104807475';
const BASE44_API_URL = Deno.env.get('https://app.base44.com/api/apps/696a1a554d800f56c19ce8f7/entities/Product'); // URL tvé Base44 app
const BASE44_SERVICE_KEY = Deno.env.get('a315e0756c954ab1b0133cf03a87d10e');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
    ]
});

// Sync player status to Base44
async function syncPlayerStatus(discordId, data) {
    try {
        const response = await fetch(`${BASE44_API_URL}/api/functions/syncPlayerStatus`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BASE44_SERVICE_KEY}`
            },
            body: JSON.stringify({
                discord_id: discordId,
                ...data
            })
        });
        
        const result = await response.json();
        console.log('Synced player status:', result);
    } catch (error) {
        console.error('Failed to sync:', error);
    }
}

// Bot ready
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
        is_on_server: false
    });
});

// Member unbanned
client.on('guildBanRemove', async (ban) => {
    if (ban.guild.id !== GUILD_ID) return;
    
    console.log(`✅ Unban: ${ban.user.username}`);
    await syncPlayerStatus(ban.user.id, {
        is_blacklisted: false,
        blacklist_reason: null
    });
});

// Member left server
client.on('guildMemberRemove', async (member) => {
    if (member.guild.id !== GUILD_ID) return;
    
    console.log(`👋 Opustil server: ${member.user.username}`);
    await syncPlayerStatus(member.user.id, {
        is_on_server: false
    });
});

// Member joined server
client.on('guildMemberAdd', async (member) => {
    if (member.guild.id !== GUILD_ID) return;
    
    console.log(`👋 Připojil se: ${member.user.username}`);
    await syncPlayerStatus(member.user.id, {
        is_on_server: true,
        discord_roles: member.roles.cache.map(r => r.id)
    });
});

// Role updated
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (newMember.guild.id !== GUILD_ID) return;
    
    const oldRoles = oldMember.roles.cache.map(r => r.id);
    const newRoles = newMember.roles.cache.map(r => r.id);
    
    if (JSON.stringify(oldRoles) !== JSON.stringify(newRoles)) {
        console.log(`🎭 Role změněny: ${newMember.user.username}`);
        await syncPlayerStatus(newMember.user.id, {
            discord_roles: newRoles
        });
    }
});

// Login
client.login(BOT_TOKEN);

// Keep alive for Deno Deploy
Deno.serve(() => new Response('Bot is running!'));
