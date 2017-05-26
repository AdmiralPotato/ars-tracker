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
		polyphony: [{}, {}, {}, {}, {}, {}, {}, {}],
		activeSongIndex: 0,
		activeOrderIndex: 0
	},
	projectState: {
		instruments: instruments,
		songs: [{
			orders: [[0,0,0,0,0,0,0,0]],
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
		//instruments
		instruments.length = 0;
		loadedState.instruments.forEach(function (instrumentData) {
			let instrument = new Instrument(instrumentData);
			instruments.push(instrument);
		});
		app.editorState.activeInstrument = instruments[0];

		//de-rle the patterns
		app.projectState.songs.length = 0;
		loadedState.songs.forEach(function (song) {
			song.patterns = song.patterns.map(function (channel) {
				if(!channel.length){
					channel.push([{repeat: song.rows}]);
				}
				return channel.map(function (rlePattern) {
					return app.rleDecodePattern(rlePattern);
				});
			});
			app.projectState.songs.push(song);
		});
	},
	rleDecodePattern: function(inputPattern){
		let result = [];
		inputPattern.forEach(function(run){
			let expandedRun = app.repeatCopy(run);
			result.push.apply(result, expandedRun);
		});
		return result;
	},
	repeatCopy: function (source) {
		let copies = source.repeat || 1;
		let string = JSON.stringify(
			source,
			app.repeatFilter
		);
		let output = [];
		while(copies-- > 0){
			let row = JSON.parse(string);
			row.note = row.note || null;
			row.volume = row.volume || null;
			row.instrument = row.instrument || null;
			output.push(row);
		}
		return output;
	},
	repeatFilter: function (key, value) {
		return key === 'repeat' ? undefined : value;
	}
};

app.startAudio();
app.loadProject('https://gist.githubusercontent.com/AdmiralPotato/c4393a44370d9139a43dc81a3a268a03/raw/d166e6268fbc923b62916a28b9b81b89b5892dd2/HuntWork.json');

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
		},
		activateOrder: function (orderIndex) {
			console.log('updated order', orderIndex);
			app.editorState.activeOrderIndex = orderIndex;
		}
	},
	template: `
		<div>
			<h1>ARS-Tracker</h1>
			<collapse :openByDefault="false" name="oscilloscope"><vue-oscilloscope :analyser="audio.analyser" /></collapse>
			<collapse :openByDefault="false" name="instrument list / editor"><instrument-list :activeInstrument="editorState.activeInstrument" :change="changeInstrument" /></collapse>
			<collapse :openByDefault="false" name="instrument editor"><instrument-editor :activeInstrument="editorState.activeInstrument" :key="editorState.activeInstrument.name" /></collapse>
			<collapse :openByDefault="true" name="keyboard"><keyboard :octaves="5" :onHandler="on" :offHandler="off" :onKeys="editorState.onKeys" /></collapse>
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
					:patterns="projectState.songs[editorState.activeSongIndex].patterns"
					/>
			</collapse>
		</div>
	`
});
