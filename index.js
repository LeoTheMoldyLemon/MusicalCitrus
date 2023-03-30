const discord = require('discord.js');
const { Collection } = discord;
const { join } = require('path');
const { get } = require("https");
const client = new discord.Client({ intents: 130809 });
const fs = require("fs");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, StreamType, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const play=require("play-dl");
console.log("Starting with config: "+process.argv[2]);
const config=require("./"+process.argv[2]);

client.commands = new Collection();
for (let file of fs.readdirSync("./commands").filter(file => file.endsWith('.js'))) {
	let cmnd = require("./commands/"+file);
	if ('data' in cmnd && 'execute' in cmnd) {
		cmnd.data.names.forEach((name)=>{
			client.commands.set(name, cmnd);
		})
	} else {
		console.log(`[WARNING] The command at ${file} is missing a required "data" or "execute" property.`);
	}
}

client.once("ready", async() => {
	client.user.setActivity(config.symbol+"halp");
	console.log(new Date().toUTCString()+"> "+client.user.username+' is ready!');
	let autosaved=require("./autosaves.json")
	for(let [guildId, autosave] of Object.entries(autosaved)){
		if(autosave[config.symbol]){
			players[guildId]=setupPlayer()
			players[guildId].queue=autosave[config.symbol].queue
			let guild=await client.guilds.fetch(guildId)
			await players[guildId].connectToVoice(autosave[config.symbol].vcId, guild)
			
			let msg={}
			await client.channels.fetch(autosave[config.symbol].channelId).then(async(channel)=>{
				msg=await channel.send("Oopsie, the bot had to restart. Either <@821854204904603658> is pushing some updates, or something went very wrong. Either way, your queue has been restored.")
			})
			await players[guildId].playCurrent(msg)
		}
	}
});

function setupPlayer(){
	let playerIdleHandler=async function(){
		if(this.playing){
			if ((this.current + 1) < this.queue.length) {
				this.current++
				let stream=await play.stream(this.queue[this.current].url, {discordPlayerCompatibility :true})
				let resource = createAudioResource(stream.stream, {inputType: stream.type})
				this.play(resource)
			}else if (this.loop) {
				this.current=0
				let stream=await play.stream(this.queue[this.current].url, {discordPlayerCompatibility :true})
				let resource = createAudioResource(stream.stream, {inputType: stream.type})
				this.play(resource)
			}else{
				this.current++
				this.playing=false
			}
		}
	}
	
	let player=createAudioPlayer()
	
	player.on('error', e => {
		console.error(new Date().toUTCString()+"> [PLAYER ERROR] ",e);
	});
	
	player.on(AudioPlayerStatus.Idle, playerIdleHandler.bind(player))
	
	
	player.playCurrent=async function(msg){
		let stream=await play.stream(this.queue[this.current].url, {quality : 2})
		let resource = createAudioResource(stream.stream, {inputType: stream.type})
		await this.play(resource)
		await msg.reply("Playing: "+this.queue[this.current].title)
		this.playing=true
	}
	
	player.autosaveQueue=async function(guildId, channelId){
		let saved=require("./autosaves.json")
		if(!saved[guildId]){
			saved[guildId]={}
		}
		if(this.queue.length==0){
			delete saved[guildId][config.symbol]
		}else{
			saved[guildId][config.symbol]={}
			saved[guildId][config.symbol].queue=this.queue
			saved[guildId][config.symbol].channelId=channelId
			saved[guildId][config.symbol].vcId=this.connection.joinConfig.channelId
		}
		await fs.writeFile("autosaves.json", JSON.stringify(saved), async (e)=>{
			if(e){
				console.error(new Date().toUTCString()+"> ", e)
			}
		})
	}
	
	player.clearQueue=function(guildId, channelId){
		this.playing=false
		this.queue=[]
		this.current=0
		this.loop=false
		this.stop()
		this.autosaveQueue(guildId, channelId)
	}
	
	
	player.connectToVoice=async function(channelId, guild){
		this.connection = joinVoiceChannel({
			channelId: channelId,
			guildId: guild.id,
			adapterCreator: guild.voiceAdapterCreator,
		})
		if(this.connection.listenerCount("stateChange")==0){
			await this.connection.subscribe(this)
			let player=this
			this.connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
				try {
					await Promise.race([
						entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
						entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
					]);
					// Seems to be reconnecting to a new channel - ignore disconnect
				} catch (error) {
					// Seems to be a real disconnect which SHOULDN'T be recovered from
					player.clearQueue(player.connection.joinConfig.guildId, player.connection.joinConfig.channelId)
					await player.connection.destroy();
					player.connection=null
				}
			});
			this.connection.on('stateChange', (oldState, newState) => {
				const oldNetworking = Reflect.get(oldState, 'networking');
				const newNetworking = Reflect.get(newState, 'networking');
				const networkStateChangeHandler = (oldNetworkState, newNetworkState) => {
					const newUdp = Reflect.get(newNetworkState, 'udp');
					clearInterval(newUdp?.keepAliveInterval);
				}
				oldNetworking?.off('stateChange', networkStateChangeHandler);
				newNetworking?.on('stateChange', networkStateChangeHandler);
			});
			
			this.connection.on("error", (e) => {
				console.error(new Date().toUTCString()+"> [CONNECTION ERROR] ",e);
			})
		}
		/*this.connection.on("stateChange", (oldState, newState) => {
			console.log(new Date().toUTCString()+"> [CONNECTION CHANGE] ",oldState, " --> ", newState);
		})*/
	}
	
	player.queue=[]
	player.connection=null
	player.current=0
	player.playing=false
	player.loop=false
	return player
}





/*
client.on("debug", (e) => {
	console.log(new Date().toUTCString()+"> [DEBUG] ",e);
});*/

client.on("warn", (e) => {
	console.log(new Date().toUTCString()+"> [WARN] ",e);
});

client.on("error", (e) => {
	console.error(new Date().toUTCString()+"> [ERROR] ",e);
});


var players={}


client.on("messageCreate", async (msg) => {
	if(msg.content[0]!=config.symbol)return;
	let commandname=msg.content.replace(config.symbol, "").split(" ")[0]
	let command=client.commands.get(commandname)
	let args=msg.content.replace(msg.content.split(" ")[0], "")
	if(!command){
		await msg.reply("Command not recognized, use `"+config.symbol+"halp` to see a list of commands.")
		return;
	}
	if(!players[msg.guildId]){
		players[msg.guildId]=setupPlayer()
	}
	console.log(new Date().toUTCString()+"> "+`[${msg.guild.name}] ${msg.member.user.username}: ${commandname}`)
	await command.execute(args.trim(), msg, client, players[msg.guildId], config)
})

client.login(config.token).catch(console.error);
