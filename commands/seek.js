const discord = require('discord.js');
const { Collection } = discord;
const { join } = require('path');
const { get } = require("https");
const client = new discord.Client({ intents: 130809 });
const fs = require("fs");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, StreamType, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const play=require("play-dl");

module.exports = {
	data: {names:["seek"]},
	async execute(args, msg, client, player, config){
		try{
			try{
				let timestamp=args.split(":").reverse()
				if(timestamp.length>3){
					await msg.reply(args+" isn't a valid number or timestamp.")
					return;
				}
				let seek=0
				let toSeconds=[3600, 60, 1].reverse()
				for(let i=0; i<timestamp.length; i++){
					seek+=parseInt(timestamp[i])*toSeconds[i]
				}
				if(!seek || isNaN(seek)){
					await msg.reply(args+" isn't a valid number or timestamp.")
					return;
				}
				let stream=await play.stream(player.queue[player.current].url, {seek:seek})
				let resource = createAudioResource(stream.stream, {inputType: stream.type})
				await player.play(resource)
				await player.connection.subscribe(player)
				await msg.reply("Playing: "+player.queue[player.current].title+" from "+seek+" seconds.")
				player.playing=true
			}catch(e){
				player.playing=false
				console.error(new Date().toUTCString()+"> ", e)
				await msg.reply("Found the song, but failed to play.")
			}
			
			
		}catch(e){
			console.error(new Date().toUTCString()+"> ", e)
			await msg.reply("Something went wrong with playing the song.")
		}
	}
}