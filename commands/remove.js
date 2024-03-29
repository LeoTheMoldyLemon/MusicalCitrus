const discord = require('discord.js');
const { Collection } = discord;
const { join } = require('path');
const { get } = require("https");
const client = new discord.Client({ intents: 130809 });
const fs = require("fs");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, StreamType, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const play=require("play-dl");

module.exports = {
	data: {names:["remove", "delete"]},
	async execute(args, msg, client, player, config){
		try{
			let num=parseInt(args)-1
			if(isNaN(num) || num<0 || num>=player.queue.length){
				await msg.reply(args+" isn't an acceptable number.")
			}
			player.queue.splice(num, 1)
			await player.autosaveQueue(msg)
			if(num==player.current){
				await player.stop()
				if(player.playing && player.queue.length>player.current){
					try{
						player.playCurrent(msg)
					}catch(e){
						player.playing=false
						console.error(new Date().toUTCString()+"> ", e)
						await msg.reply("Found the song, but failed to play.")
					}
				}else{
					player.playing=false
				}
			}else if(num<player.current){
				player.current--
			}
		}catch(e){
			console.error(new Date().toUTCString()+"> ", e)
			await msg.reply("Something went wrong removing the song.")
		}
	}
}