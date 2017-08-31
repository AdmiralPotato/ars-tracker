"use strict";

let arrayRemove = function(array, item){
	let index;
	while((index = array.indexOf(item)) != -1) {
		array.splice(index, 1);
	}
	return array;
};
let getLastValueInArray = function (array) {
	return array[array.length - 1];
};

let app = {
	// any key which exists in persistentSettings will be automatically saved and restored, defaulting to the value initially found in editorState
	persistentSettings: [
		"volume",
		"speakerSetup",
		"autoAdvance",
		"autoAdvanceOrder",
		"autoInstrument",
		"enablePolyphony",
		"respectMIDIClocks",
		"respectMIDIChannels",
		"respectMIDIInstruments",
		"respectMIDIVelocities",
		"noteOffMode",
		"sppMode",
	],
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
		autoAdvanceOrder: false,
		autoInstrument: true,
		recordMIDI: false,
		enablePolyphony: false,
		respectMIDIClocks: false,
		respectMIDIChannels: false,
		respectMIDIInstruments: false,
		respectMIDIVelocities: false,
		midiClockPhase: 0,
		midiClockActive: false,
		noteOffMode: 'off',
		sppMode: 'ignored',
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
			patterns: [[[]],[[]],[[]],[[]],[[]],[[]],[[]],[[]]]
		}]
	},
	cookChannelIndex: function (rawChannel) {
		if(app.editorState.respectMIDIChannels) {
			if(rawChannel >= 8) rawChannel = app.editorState.activeChannelIndex;
			return rawChannel;
		}
		else if(!app.editorState.enablePolyphony) {
			return app.editorState.activeChannelIndex;
		}
		else {
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
	},
	////// MIDI handling
	//
	// Handle a Note On message.
	//
	// note: MIDI note number (0-127)
	// velocity: Key velocity (1-127)
	// channel: MIDI channel (0-15)
	//
	handleMIDINoteOn: function(note, velocity, channel){
		let channelIndex = app.cookChannelIndex(channel);
		if(channelIndex !== null){
			let polyphonyNote = app.editorState.polyphony[channelIndex];
			let instrument = app.editorState.activeInstrument;
			polyphonyNote.noteIndex = note;
			polyphonyNote.startTime = Date.now;
			app.editorState.onKeys.push(note);
			// the channel >= 8 check is intentionally checking the RAW channel
			if(channel >= 8 || !app.editorState.respectMIDIInstruments
			   || channels[channelIndex].instrument == null)
				channels[channelIndex].setActiveInstrument(instrument);
			if(app.editorState.respectMIDIVelocities) {
				channels[channelIndex].setVolume((velocity+7)>>3);
			}
			channels[channelIndex].noteOn(note);
			if(app.editorState.recordMIDI) {
				recordNoteOn(note, velocity, channelIndex);
			}
		}
	},
	//
	// Handle a Note Off message.
	//
	// note: MIDI note number (0-127)
	// velocity: Key velocity (0-127)
	// channel: MIDI channel (0-15)
	//
	handleMIDINoteOff: function(note, velocity, channel){
		if(app.editorState.noteOffMode == 'ignored') return;
		arrayRemove(app.editorState.onKeys, note);
		let polyphony = app.editorState.polyphony;
		if(app.editorState.respectMIDIChannels) {
			if(channel >= 8) channel = app.editorState.activeChannelIndex;
			if(app.editorState.noteOffMode == 'cut')
				channels[channel].noteCut();
			else
				channels[channel].noteOff();
			polyphony[channel].noteIndex = null;
			if(app.editorState.recordMIDI) {
				recordNoteOff(channel, channel);
			}
		}
		else {
			let found = false;
			for (let i = 0; i < polyphony.length; i++) {
				let polyphonyNote = polyphony[i];
				if(polyphonyNote.noteIndex === note){
					found = true;
					if(app.editorState.noteOffMode == 'cut')
						channels[i].noteCut();
					else
						channels[i].noteOff();
					polyphony[i].noteIndex = null;
					if(app.editorState.recordMIDI) {
						recordNoteOff(i, channel);
					}
				}
			}
		}
	},
	//
	// Handle a Poly Pressure message. This reflects a change in the pressure of a previous Note On.
	//
	// note: MIDI note number of previous note (0-127)
	// velocity: Updated key velocity (0-127)
	// channel: MIDI channel (0-15)
	//
	handleMIDIPolyPressure: function(note, velocity, channel) {},
	//
	// Handle a Channel Pressure message. This reflects a change in the pressure of the most recent note.
	//
	// velocity: Updated key velocity (0-127)
	// channel: MIDI channel (0-15)
	//
	handleMIDIChannelPressure: function(velocity, channel) {},
	//
	// Handle a Program Change message.
	//
	// program: The program number (instrument) to switch to.
	// channel: MIDI channel (0-15)
	//
	handleMIDIProgramChange: function(program, channel) {
		if(!app.editorState.respectMIDIInstruments) return;
		if(program < app.projectState.instruments.length) {
			let channelIndex = app.cookChannelIndex(channel);
			if(channelIndex != null) {
				channels[channelIndex].setActiveInstrument(app.projectState.instruments[program]);
				if(app.editorState.recordMIDI) {
					recordInstrument(program, channelIndex);
				}
			}
		}
	},
	//
	// Handle a Pitch Bend message.
	//
	// amount: The amount of pitch bend to apply. Range is -8192 to 8191.
	// channel: MIDI channel (0-15)
	//
	handleMIDIPitchBend: function(amount, channel) {},
	//
	// Handle an All Sound Off message. This message is not sent during normal playback and should not be recorded.
	//
	// channel: MIDI channel (0-15). This parameter isn't what you think; you should stop notes on all channels.
	//
	handleMIDIAllSoundOff: function(channel) {
		let polyphony = app.editorState.polyphony;
		app.editorState.onKeys.splice(0, app.editorState.onKeys.length);
		for(let i = 0; i < channels.length; ++i) {
			channels[i].noteCut();
			polyphony[i].noteIndex = null;
		}
	},
	//
	// Handle an All Notes Off message. This message is not sent during normal playback and should not be recorded.
	//
	// channel: MIDI channel (0-15). This parameter isn't what you think; you should stop notes on all channels.
	//
	handleMIDIAllNotesOff: function(channel) {
		let polyphony = app.editorState.polyphony;
		app.editorState.onKeys.splice(0, app.editorState.onKeys.length);
		for(let i = 0; i < channels.length; ++i) {
			channels[i].noteOff();
			polyphony[i].noteIndex = null;
		}
	},
	//
	// Handle a Song Position Pointer update message.
	//
	// position: New Song Position, in units of six Clock Beats. Range is 0-16383.
	//
	handleMIDISongPosition: function(position) {
		let activeSong = app.projectState.songs[app.editorState.activeSongIndex];
		let songSpeed = activeSong.speed;
		if(songSpeed != 6) {
			position = Math.floor(position * 6 / songSpeed);
			app.editorState.midiClockPhase = position * 6 % songSpeed;
		}
		else {
			app.editorState.midiClockPhase = 0;
		}
		switch(app.editorState.sppMode) {
		case 'song':
			app.editorState.activeOrderIndex = Math.floor(position / activeSong.rows) % activeSong.orders.length;
			/* fall through */
		case 'pattern':
			app.editorState.activeRowIndex = position % activeSong.rows;
			break;
		}
	},
	//
	// Handle a Song Select message.
	//
	// song: New song number. Range is 0-127.
	//
	handleMIDISongSelect: function(song) {},
	//
	// Handle a Timing Clock message. This denotes the passage of one MIDI tick. There are 6 MIDI ticks in a sixteenth note, and 24 in a quarter note.
	//
	// Normally, Timing Clocks ought to be ignored (except for phase locking purposes) except between Start/Continue and Stop.
	//
	handleMIDITimingClock: function() {
		if(!app.editorState.midiClockActive) return;
		let songSpeed = app.projectState.songs[app.editorState.activeSongIndex].speed;
		++app.editorState.midiClockPhase;
		while(app.editorState.midiClockPhase >= songSpeed) {
			app.editorState.midiClockPhase -= songSpeed;
			if(app.editorState.recordMIDI && app.editorState.respectMIDIClocks) {
				recordAdvance();
			}
		}
	},
	//
	// Handle a Start message. Playback/recording should begin at the beginning of the song or sequence. Ignore if playback/recording is already in progress.
	//
	handleMIDIStart: function() {
		if(!app.editorState.midiClockActive) {
			app.editorState.midiClockActive = true;
			app.editorState.midiClockPhase = 0;
		}
	},
	//
	// Handle a Continue message. Playback/recording should begin at the most recent position. Ignore if playback/recording is already in progress.
	//
	handleMIDIContinue: function() {
		app.editorState.midiClockActive = true;
		// don't alter phase
	},
    //
	// Handle a Stop message. Playback/recording should cease. Ignore if playback/recording is NOT currently in progress.
	//
	handleMIDIStop: function() {
		app.editorState.midiClockActive = false;
	},
	//
	// Reset EVERYTHING. Not sent lightly.
	//
	handleMIDIReset: function() {
		let polyphony = app.editorState.polyphony;
		app.editorState.onKeys.splice(0, app.editorState.onKeys.length);
		for(let i = 0; i < channels.length; ++i) {
			polyphony[i].noteIndex = null;
			channels[i].noteCut();
			channels[i].forgetFX();
		}
	}
};


/* Here is where the persistent settings magic goes. */
if(localStorage) {
	let savedSettings = {};
	try {
		let storedSettings = localStorage.getItem("ARSTrackerSettings");
		if(storedSettings) {
			savedSettings = JSON.parse(storedSettings);
		}
	}
	catch(e) {
		console.warn("Unable to restore saved settings, reverting to defaults", e);
	}
	let saveSettings = function() {
		localStorage.setItem("ARSTrackerSettings", JSON.stringify(savedSettings));
		console.log(localStorage.getItem("ARSTrackerSettings"));
	};
	// Why can't I just put these in the prototype?
	let getPP = function() {
		return this.hiddenValue;
	};
	let setPP = function(newValue) {
		if(newValue !== this.hiddenValue) {
			this.hiddenValue = newValue;
			savedSettings[this.settingName] = newValue;
			saveSettings();
		}
	};
	let PersistentProperty = function(settingName) {
		this.settingName = settingName;
		("assert" in console) && console.assert(settingName in app.editorState);
		let defaultValue = app.editorState[settingName];
		this.hiddenValue = (settingName in savedSettings) ? savedSettings[settingName] : defaultValue;
		this.get = getPP.bind(this);
		this.set = setPP.bind(this);
	};
	PersistentProperty.prototype = {
		configurable: true,
		enumerable: true,
	};
	app.persistentSettings.forEach(function(settingName) {
		Object.defineProperty(app.editorState, settingName, new PersistentProperty(settingName));
	});
}

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
			app.handleMIDINoteOn(index, 127, 16);
		},
		off: function(index){
			app.handleMIDINoteOff(index, 127, 16);
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
		changePlaybackState: function (newPlaybackState) {
			if(app.editorState.playbackState != 'paused' && newPlaybackState == 'paused') {
				app.editorState.playbackStateOnLastPause = app.editorState.playbackState;
			}
			playback.playbackStateDidChange(app.editorState.playbackState, newPlaybackState);
			this.changeValueByName('playbackState', newPlaybackState);
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
