"use strict";

let playback = {
	spill: 0,
	ticksLeft: 0,
	processOneFrame: function () {
		let song = app.projectState.songs[app.editorState.activeSongIndex];
		playback.spill += song.tempo;
		while(playback.spill >= 150){
			playback.spill -= 150;
			playback.processOneTick(song);
		}
	},
	processOneTick: function (song) {
		playback.ticksLeft -= 1;
		if(playback.ticksLeft <= 0){
			playback.processOneRow(song);
		}
	},
	processOneRow: function (song) {
		let order = song.orders[app.editorState.activeOrderIndex];
		let activeRowIndex = app.editorState.activeRowIndex;
		channels.forEach(function (channel, channelIndex) {
			let pattern = song.patterns[channelIndex][order[channelIndex]];
			let instruction = pattern[activeRowIndex];
			if(instruction.instrument){
				channel.setActiveInstrument(instruments[instruction.instrument]);
			}
			if(instruction.volume){
				channel.setVolume(instruction.volume);
			}
			if(instruction.note){
				channel.noteOn(instruction.note);
			}
			else if(instruction.note === false){
				channel.noteOff();
			}
			else if(instruction.note === null){
				channel.noteCut();
			}
		});
		app.editorState.activeRowIndex += 1;
		if(
			app.editorState.activeRowIndex >= song.rows &&
			app.editorState.playbackState === 'playSong'
		){
			app.editorState.activeOrderIndex += 1;
			app.editorState.activeOrderIndex %= song.orders.length;
		}
		app.editorState.activeRowIndex %= song.rows;
		playback.ticksLeft = song.speed;
	}
};
