const discord = require('discord.js');
const { Collection } = discord;
const { join } = require('path');
const { get } = require("https");
const client = new discord.Client({ intents: 130809 });
const fs = require("fs");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, StreamType, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const play=require("play-dl");

module.exports = {
	data: {names:["load"]},
	async execute(args, msg, client, player, config){
		try{
			if (!msg.member.voice?.channel) return msg.reply('You have to be connected to a voice channel in order to play a song.')
			player.connection = joinVoiceChannel({
					channelId: msg.member.voice.channel.id,
					guildId: msg.guild.id,
					adapterCreator: msg.guild.voiceAdapterCreator
				})
			player.connection.on('stateChange', (old_state, new_state) => {
				if (old_state.status === VoiceConnectionStatus.Ready && new_state.status === VoiceConnectionStatus.Connecting) {
					player.connection.configureNetworking();
				}
			})
			/*player.connection.on("stateChange", (oldState, newState) => {
				console.log(new Date().toUTCString()+"> [CONNECTION CHANGE] ",oldState, " --> ", newState);
			})*/
			player.connection.on("error", (e) => {
				console.error(new Date().toUTCString()+"> [CONNECTION ERROR] ",e);
			})
			player.current=0
			let playlists=require("../playlists.json")[msg.guildId]
			if(!playlists.hasOwnProperty(args)){
				await msg.reply("No playlist with that name exists.")
				return;
			}
			player.queue=playlists[args]
			await msg.reply("Loaded "+player.queue.length+" songs from "+args)
			try{
				let stream=await play.stream(player.queue[player.current].url, {discordPlayerCompatibility :true})
				let resource = createAudioResource(stream.stream, {inputType: stream.type})
				await player.play(resource)
				await player.connection.subscribe(player)
				await msg.reply("Playing: "+player.queue[player.current].title)
				player.playing=true
				
			}catch(e){
				console.error(new Date().toUTCString()+"> ", e)
				await msg.reply("Found the song, but failed to play.")
			}
			
			
		}catch(e){
			console.error(new Date().toUTCString()+"> ", e)
			await msg.reply("Something went wrong with playing the song.")
		}
	}
}