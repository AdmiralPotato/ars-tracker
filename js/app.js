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
		projectFileName: 'super_hella_sweet_project.json',
		volume: 1,
		onKeys: [],
		activeInstrument: new Instrument(), // TODO: make this default to null
		polyphonyChannels: [0, 1, 2, 3, 4, 5, 6], // TODO: expose this array
		polyphony: [{}, {}, {}, {}, {}, {}, {}, {}],
		activeSongIndex: 0,
		activeOrderIndex: 0,
		activeRowIndex: 0,
		activeChannelIndex: 0,
		activeProperty: 'note',
		speakerSetup: 'stereo',
		playbackState: 'paused',
		playbackStateOnLastPause: 'playSong',
		autoAdvance: true,
		autoInstrument: true,
		recordMIDI: false,
		enablePolyphony: false,
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
			if(app.editorState.recordMIDI) {
				recordNoteOn(keyIndex, channelIndex);
			}
		}
	},
	getNextAvailableChannelIndex: function () {
		if(!app.editorState.enablePolyphony) return app.editorState.activeChannelIndex;
		let oldestSilentChannel = null;
		let oldestSilentChannelTime = null;
		let oldestActiveChannel = null;
		let oldestActiveChannelTime = null;
		let polyphonyChannels = app.editorState.polyphonyChannels;
		let polyphony = app.editorState.polyphony;
		polyphonyChannels.forEach(function (channelIndex) {
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
				if(app.editorState.recordMIDI) {
					recordNoteOff(i);
				}
			}
		}
	},
	_audioInterval: null,
	_audioAnimationFrame: function() {
		if(app._audioInterval == null) return;
		app._makeMoreAudio();
		requestAnimationFrame(app._audioAnimationFrame);
	},
	_makeMoreAudio: function(){
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
	startAudio: function(){
		if(app._audioInterval != null) return;
		app._audioInterval = setInterval(
			app._makeMoreAudio,
			1000/60
		);
		app._audioAnimationFrame();
	},
	stopAudio: function () {
		clearInterval(app._audioInterval);
		app._audioInterval = null;
	},
	loadProject: function (projectAddress) {
		let request = new XMLHttpRequest();
		request.responseType = 'json';
		request.addEventListener('load', function () {
			app.editorState.projectFileName = projectAddress.split('/').pop();
			app.setProjectState(request.response);
		});
		request.open('get', projectAddress, true);
		request.send();
	},
	setProjectState: function(projectState){
		app.vue.changePlaybackState('paused');
		app.vue.projectState = app.projectState = hydration.hydrate(projectState);
		app.editorState.activeInstrument = app.projectState.instruments[0];
		app.editorState.activeSongIndex = 0;
		app.editorState.activeOrderIndex = 0;
		app.editorState.activeRowIndex = 0;
		app.editorState.activeChannelIndex = 0;
		app.editorState.activeProperty = 'note';
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
		activateOrder: function (orderIndex) {
			console.log('activate order', orderIndex);
			app.editorState.activeOrderIndex = orderIndex;
			if(app.editorState.playbackState !== 'paused'){
				app.editorState.activeRowIndex = 0;
			}
		},
		changePlaybackState: function (playbackState) {
			if(app.editorState.playbackState != 'paused' && playbackState == 'paused') {
				app.editorState.playbackStateOnLastPause = app.editorState.playbackState;
			}
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
			<io
				:editorState="editorState"
				:projectState="projectState"
				/>
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
					:editorState="editorState"
					:activeOrder="projectState.songs[editorState.activeSongIndex].orders[editorState.activeOrderIndex]"
					:patterns="projectState.songs[editorState.activeSongIndex].patterns"
					:rowCount="projectState.songs[editorState.activeSongIndex].rows"
					/>
			</collapse>
		</div>
	`
});
