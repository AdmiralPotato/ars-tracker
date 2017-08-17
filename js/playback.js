"use strict";

let playback = {
	tempo: 0,
	speed: 0,
	spill: 0,
	ticksLeft: 0,
	playbackStateDidChange: function (from, to){
		if(to === 'paused'){
			channels.forEach(function(channel) {
				channel.noteCut();
				channel.forgetFX();
			});
		}
		else if(from === 'paused'){
			let song = app.projectState.songs[app.editorState.activeSongIndex];
			playback.tempo = song.tempo;
			playback.speed = song.speed;
		}
	},
	processOneFrame: function () {
		let song = app.projectState.songs[app.editorState.activeSongIndex];
		playback.spill += playback.tempo;
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
			if(instruction === undefined) return;
			if(instruction.instrument !== null){
				channel.setActiveInstrument(app.projectState.instruments[instruction.instrument]);
			}
			if(instruction.volume !== null){
				channel.setVolume(instruction.volume);
			}
			if(instruction.note === 'off'){
				channel.noteOff();
			}
			else if(instruction.note === 'cut'){
				channel.noteCut();
			}
			else if(instruction.note !== null){
				channel.noteOn(instruction.note);
			}
			if(instruction.fx !== null) {
				instruction.fx.forEach(function(pair) {
					if(pair !== null) {
						if(pair.type in playback._effectHandlers){
							playback._effectHandlers[pair.type](pair.value);
						}
						channel.processEffect(pair.type,
								      pair.value);
					}
				});
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
		playback.ticksLeft = playback.speed;
	},
	// Effects that affect PLAYBACK (tempo, etc.) go here. Effects that
	// affect the CHANNEL go into channel.js.
	_effectHandlers: {
		branch: function(param) {
			let song = app.projectState.songs[app.editorState.activeSongIndex];
			if(param >= song.orders.length) {
				param = song.orders.length - 1;
			}
			app.editorState.activeOrderIndex = param;
			// after we have finished processing the OLD current
			// row, the activeRowIndex will be incremented, so we
			// set it to -1 here and it ends up as 0.
			app.editorState.activeRowIndex = -1;
		},
		next: function(param) {
			let song = app.projectState.songs[app.editorState.activeSongIndex];
			// we will act as though we were in the last row of the pattern
			app.editorState.activeRowIndex = song.rows-1;
		},
		halt: function(param) {
			// TODO: this is a bit of a layering violation
			app.vue.changePlaybackState('paused');
		},
		fastness: function(param) {
			if(param >= 64) {
				playback.tempo = param;
			}
			else {
				playback.speed = param;
			}
		},
		speed: function(param) {
			playback.speed = param;
		},
		tempo: function(param) {
			playback.tempo = param;
		},
	},
	keyHandlerMap: {
		"F5":function() {
			app.vue.changePlaybackState('playSong');
		},
		"F6":function() {
			app.vue.changePlaybackState('loopOrder');
		},
		"F7":function() {
			app.editorState.activeRowIndex = 0;
			app.vue.changePlaybackState('playSong');
		},
		"F8":function() {
			app.editorState.activeRowIndex = 0;
			app.vue.changePlaybackState('loopOrder');
		},
	},
	keydown: function(event) {
		if(event.key in playback.keyHandlerMap) {
			playback.keyHandlerMap[event.key](event);
			event.preventDefault();
		}
	},
};

document.body.addEventListener('keydown', playback.keydown);
