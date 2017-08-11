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
		volume: 1,
		onKeys: [],
		activeInstrument: new Instrument(), // TODO: make this default to null
		activeChannels: [0, 1, 2],
		polyphony: [{}, {}, {}, {}, {}, {}, {}, {}],
		activeSongIndex: 0,
		activeOrderIndex: 0,
		activeRowIndex: 0,
		speakerSetup: 'stereo',
		playbackState: 'paused'
	},
	projectState: {
		instruments: [
			new Instrument() // TODO: handle zero instruments
		],
		songs: [{
			metadata: {title: 'Untitled'},
			orders: [[0,0,0,0,0,0,0,0]],
			speed: 6,
			tempo: 150,
			rows: 64,
			patterns: [[[{}]],[[{}]],[[{}]],[[{}]],[[{}]],[[{}]],[[{}]],[[{}]]]
		}]
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
					if(app.editorState.playbackState !== 'paused'){
						playback.processOneFrame();
					}
					audio.generate_one_frame(app.editorState.speakerSetup);
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
			app.vue.projectState = app.projectState = hydration.hydrate(request.response);
			app.editorState.activeInstrument = app.projectState.instruments[0];
		});
		request.open('get', projectAddress, true);
		request.send();
	},
	repeatCopy: function (source) {
		let copies = source.repeat || 1;
		let string = JSON.stringify(
			source,
			app.repeatFilter
		);
		let output = [];
		while(copies-- > 0){
			let instruction = JSON.parse(string);
			output.push(instruction);
		}
		return output;
	},
	repeatFilter: function (key, value) {
		return key === 'repeat' ? undefined : value;
	}
};

app.startAudio();
app.loadProject('https://gist.githubusercontent.com/SolraBizna/c64007be2249a43eda2af47c2736a5df/raw/HuntWork.json');

app.vue = new Vue({
	el: '#appTarget',
	data:function () {
		return {
			editorState: app.editorState,
			projectState: app.projectState,
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
			app.editorState.activeInstrument = app.projectState.instruments[instrumentIndex];
		},
		toggleChannel: function (channelIndex) {
			let activeChannels = app.editorState.activeChannels;
			let alreadyThere = activeChannels.indexOf(channelIndex) !== -1;
			if(alreadyThere){
				arrayRemove(activeChannels, channelIndex);
			} else {
				activeChannels.push(channelIndex);
			}
		},
		activateOrder: function (orderIndex) {
			console.log('activate order', orderIndex);
			app.editorState.activeOrderIndex = orderIndex;
			if(app.editorState.playbackState !== 'paused'){
				app.editorState.activeRowIndex = 0;
			}
		},
		activateRow: function (rowIndex) {
			console.log('activate row', rowIndex);
			app.editorState.activeRowIndex = rowIndex;
		},
		changePlaybackState: function (playbackState) {
			playback.playbackStateDidChange(app.editorState.playbackState, playbackState);
			this.changeValueByName('playbackState', playbackState);
		},
		changeSpeakerSetup: function (speakerSetup) {
			this.changeValueByName('speakerSetup', speakerSetup);
		},
		changeValueByName: function (name, value) {
			console.log('change ' + name, value);
			app.editorState[name] = value;
		}
	},
	template: `
		<div>
			<h1>ARS-Tracker</h1>
			<song
				:song="projectState.songs[editorState.activeSongIndex]"
				:editorState="editorState"
				:changePlaybackState="changePlaybackState"
				:changeSpeakerSetup="changeSpeakerSetup"
				/>
			<collapse :openByDefault="false" name="oscilloscope"><vue-oscilloscope :analyser="audio.analyser" /></collapse>
			<collapse :openByDefault="false" name="instrument list / editor"><instrument-list :activeInstrument="editorState.activeInstrument" :instruments="projectState.instruments" :change="changeInstrument" /></collapse>
			<collapse :openByDefault="false" name="instrument editor"><instrument-editor :activeInstrument="editorState.activeInstrument" :key="editorState.activeInstrument.name" /></collapse>
			<collapse :openByDefault="false" name="keyboard"><keyboard :octaves="5" :onHandler="on" :offHandler="off" :onKeys="editorState.onKeys" /></collapse>
			<collapse :openByDefault="true" name="order editor">
				<order-editor
					:channels="channels"
					:orders="projectState.songs[editorState.activeSongIndex].orders"
					:patterns="projectState.songs[editorState.activeSongIndex].patterns"
					:activeOrderIndex="editorState.activeOrderIndex"
					:activateOrder="activateOrder"
					/>
			</collapse>
			<collapse :openByDefault="true" name="pattern editor">
				<pattern-editor
					:channels="channels"
					:activeChannels="editorState.activeChannels"
					:toggleChannel="toggleChannel"
					:activeOrder="projectState.songs[editorState.activeSongIndex].orders[editorState.activeOrderIndex]"
					:activeRowIndex="editorState.activeRowIndex"
					:activateRow="activateRow"
					:patterns="projectState.songs[editorState.activeSongIndex].patterns"
					:rowCount="projectState.songs[editorState.activeSongIndex].rows"
					/>
			</collapse>
		</div>
	`
});
