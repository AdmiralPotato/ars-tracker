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
	editorState: {
		onKeys: [],
		activeInstrument: instruments[0],
		activeChannels: [0, 1, 2],
		polyphony: [{}, {}, {}, {}, {}, {}, {}, {}]
	},
	projectState: {
		instruments: instruments
	},
	handleKeyOn: function(keyIndex){
		let channelIndex = app.getNextAvailableChannelIndex();
		if(channelIndex !== null){
			let polyphonyNote = app.editorState.polyphony[channelIndex];
			let instrument = app.editorState.activeInstrument;
			polyphonyNote.noteIndex = keyIndex;
			polyphonyNote.startTime = Date.now;
			app.editorState.onKeys.push(keyIndex);
			channels[channelIndex].setActiveInstrument(instrument);
			channels[channelIndex].noteOn(keyIndex);
		}
	},
	getNextAvailableChannelIndex: function () {
		let oldestSilentChannel = null;
		let oldestSilentChannelTime = null;
		let oldestActiveChannel = null;
		let oldestActiveChannelTime = null;
		let activeChannels = app.editorState.activeChannels;
		let polyphony = app.editorState.polyphony;
		activeChannels.forEach(function (channelIndex) {
			let polyphonyNote = polyphony[channelIndex];
			if(!polyphonyNote.noteIndex){
				let isOnlyOrOldest = (
					oldestSilentChannelTime === null ||
					polyphonyNote.startTime < oldestSilentChannelTime
				);
				if(isOnlyOrOldest){
					oldestSilentChannel = channelIndex;
					oldestSilentChannelTime = polyphonyNote.startTime;
				}
			} else if(
				oldestActiveChannelTime === null ||
				polyphonyNote.startTime < oldestActiveChannelTime
			){
				oldestActiveChannel = channelIndex;
				oldestActiveChannelTime = polyphonyNote.startTime;
			}
		});
		let targetChannelIndex = oldestSilentChannelTime !== null ? oldestSilentChannel : oldestActiveChannel;
		return targetChannelIndex;
	},
	handleKeyOff: function(keyIndex){
		arrayRemove(app.editorState.onKeys, keyIndex);
		app.removePolyphonyNodeByKeyIndex(keyIndex);
	},
	removePolyphonyNodeByKeyIndex: function (keyIndex) {
		let found = false;
		let polyphony = app.editorState.polyphony;
		for (let i = 0; i < polyphony.length; i++) {
			let polyphonyNote = polyphony[i];
			if(polyphonyNote.noteIndex === keyIndex){
				found = true;
				channels[i].noteOff();
				polyphony[i].noteIndex = null;
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
	},
	loadProject: function (projectAddress) {
		let request = new XMLHttpRequest();
		request.responseType = 'json';
		request.addEventListener('load', function () {
			app.hydrate(request.response);
		});
		request.open('get', projectAddress, true);
		request.send();
	},
	hydrate: function (loadedState) {
		instruments.length = 0;
		loadedState.instruments.forEach(function (instrumentData) {
			let instrument = new Instrument(instrumentData);
			instruments.push(instrument);
		});
		app.editorState.activeInstrument = instruments[0];
	}
};

app.startAudio();
app.loadProject('https://gist.githubusercontent.com/SolraBizna/c64007be2249a43eda2af47c2736a5df/raw/e6d04f90970f66c432597ed622f0fb2ae7c526bb/HuntWork.json');

app.vue = new Vue({
	el: '#appTarget',
	data:function () {
		return {
			editorState: app.editorState,
			channels: channels
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
		changeInstrument: function (instrumentIndex) {
			app.editorState.activeInstrument = instruments[instrumentIndex];
		},
		toggleChannel: function (channelIndex) {
			let activeChannels = app.editorState.activeChannels;
			let alreadyThere = activeChannels.indexOf(channelIndex) !== -1;
			if(alreadyThere){
				arrayRemove(activeChannels, channelIndex);
			} else {
				activeChannels.push(channelIndex);
			}
		}
	},
	template: `
		<div>
			<h1>ARS-Tracker</h1>
			<collapse :openByDefault="false" name="oscilloscope"><vue-oscilloscope :analyser="audio.analyser" /></collapse>
			<collapse :openByDefault="false" name="instrument list / editor"><instrument-list :activeInstrument="editorState.activeInstrument" :change="changeInstrument" /></collapse>
			<collapse :openByDefault="false" name="instrument editor"><instrument-editor :activeInstrument="editorState.activeInstrument" :key="editorState.activeInstrument.name" /></collapse>
			<collapse :openByDefault="true" name="keyboard"><keyboard :octaves="5" :onHandler="on" :offHandler="off" :onKeys="editorState.onKeys" /></collapse>
			<collapse :openByDefault="true" name="channel list"><channel-list :channels="channels" :activeChannels="editorState.activeChannels" :toggleChannel="toggleChannel" /></collapse>
		</div>
	`
});
