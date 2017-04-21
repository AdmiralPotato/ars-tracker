"use strict";

let arrayRemove = function(array, item){
	let index = array.indexOf(item);
	if(index !== -1){
		array.splice(index, 1);
	}
	return array;
};
let getLastValueInArray = function (array) {
	return array[array.length -1];
};

let app = {
	onKeys: [],
	polyphony: [{},{},{},{},{},{},{}],
	activeInstrument: new Instrument("10 15 14 13 12 11 | / 10 9 8 8 7 7 6 6 5 5 5 4 4 4 4 3 3 3 3 3 2 2 2 2 2 2 2 1 1 1 1 1 1 1 1 1 1 1 1 0", '', '', "32"),
	handleKeyOn: function(keyIndex){
		let channelIndex = app.getNextAvailableChannelIndex();
		let polyphonyNote = app.polyphony[channelIndex];
		polyphonyNote.noteIndex = keyIndex;
		polyphonyNote.startTime = Date.now;
		app.onKeys.push(keyIndex);
		channels[channelIndex].setActiveInstrument(app.activeInstrument);
		channels[channelIndex].noteOn(keyIndex);
	},
	getNextAvailableChannelIndex: function () {
		let oldestSilentChannel = null;
		let oldestSilentChannelTime = null;
		let oldestActiveChannel = null;
		let oldestActiveChannelTime = null;
		app.polyphony.forEach(function (polyphonyNote, index) {
			if(!polyphonyNote.noteIndex){
				let isOnlyOrOldest = (
					oldestSilentChannelTime === null ||
					polyphonyNote.startTime < oldestSilentChannelTime
				);
				if(isOnlyOrOldest){
					oldestSilentChannel = index;
					oldestSilentChannelTime = polyphonyNote.startTime;
				}
			} else if(
				oldestActiveChannelTime === null ||
				polyphonyNote.startTime < oldestActiveChannelTime
			){
				oldestActiveChannel = index;
				oldestActiveChannelTime = polyphonyNote.startTime;
			}
		});
		let targetChannelIndex = oldestSilentChannelTime !== null ? oldestSilentChannel : oldestActiveChannel;
		return targetChannelIndex;
	},
	handleKeyOff: function(keyIndex){
		arrayRemove(app.onKeys, keyIndex);
		app.removePolyphonyNodeByKeyIndex(keyIndex);
	},
	removePolyphonyNodeByKeyIndex: function (keyIndex) {
		let found = false;
		for (let i = 0; i < app.polyphony.length; i++) {
			let polyphonyNote = app.polyphony[i];
			if(polyphonyNote.noteIndex === keyIndex){
				found = true;
				channels[i].noteOff();
				app.polyphony[i].noteIndex = null;
			}
		}
	},
	audioInterval: null,
	startAudio: function(){
		this.audioInterval = setInterval(
			function(){
				while(audio.context.currentTime > audio.minPlayTime - 0.1){
					channels.forEach(function(channel) {
						channel.go();
					});
					audio.generate_one_frame();
				}
			},
			1000/60
		);
	},
	stopAudio: function () {
		clearInterval(this.audioInterval);
		this.audioInterval = null;
	}
};

app.startAudio();

app.vue = new Vue({
	el: '#appTarget',
	data:function () {
		return {
			onKeys: app.onKeys
		}
	},
	created: function(){
		this.audio = audio;
	},
	methods: {
		on: function(index){
			app.handleKeyOn(index);
		},
		off: function(index){
			app.handleKeyOff(index);
		},
	},
	template: `
		<div>
			<h1>ARS-Tracker</h1>
			<vue-oscilloscope :analyser="audio.analyser" />
			<keyboard :octaves="5" :onHandler="on" :offHandler="off" :onKeys="onKeys" />
		</div>
	`
});
