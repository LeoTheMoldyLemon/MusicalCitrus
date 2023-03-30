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
			
			let playlists=require("../playlists.json")[msg.guildId]
			if(!playlists.hasOwnProperty(args)){
				await msg.reply("No playlist with that name exists.")
				return;
			}
			player.queue=player.queue.concat(playlists[args])
			
			await msg.reply("Loaded "+playlists[args].length+" songs from "+args)
			try{
				if(!player.playing){
					player.connectToVoice(msg.member.voice.channel.id, msg.guild)
					player.playCurrent(msg)
				}
			}catch(e){
				player.playing=false
				await msg.reply("Loaded playlist, but failed to play the current song.")
				console.error(new Date().toUTCString()+"> ", e)
			}
			await player.autosaveQueue(msg.guildId, msg.clientId)
			
		}catch(e){
			console.error(new Date().toUTCString()+"> ", e)
			await msg.reply("Something went wrong with loading the playlist.")
		}
	}
}