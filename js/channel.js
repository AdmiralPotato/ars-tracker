"use strict";

let Channel = function(voiceIndex){
	let channel = this;
	channel.voiceIndex = voiceIndex;
	channel.instrument = defaultInstrument;
	channel.volume = 15;
	channel.isMuted = false;
	channel.noteIndex = null;
	channel.noteHeld = false;
	channel.needWaveformReset = false;
	channel.phaseMap = {
		volume: null,
		arpeggio: null,
		pitch: null,
		waveform: null
	};
	channel.valueMap = {
		volume: 0,
		arpeggio: 0,
		pitch: 0,
		waveform: 0
	};
};

Channel.prototype = {
	instrumentSequences: [
		'volume',
		'arpeggio',
		'pitch',
		'waveform'
	],
	BASE_NOTE: 57,
	BASE_FREQ: 440,
	keyIndexToFreq: function(index){
		return Math.floor(this.BASE_FREQ * Math.pow(2,(index - this.BASE_NOTE)/12) * 65536 / ET209.SAMPLE_RATE + 0.5) - 1;
	},
	noteOn: function(noteIndex){
		this.noteIndex = noteIndex;
		this.noteHeld = true;
		this.needWaveformReset = true;
		this.resetSequences();
	},
	noteOff: function() {
		this.noteHeld = false;
	},
	noteCut: function() {
		// set all the sequence indices to null
	},
	setActiveInstrument: function(instrument) {
		this.instrument = instrument;
	},
	setVolume: function(volume) {
		// volume is in range 0-15
		this.volume = volume;
	},
	processEffect: function(effect, parameter) {
		// (we will leave this blank right now)
	},
	setIsMuted: function(isMuted) {
		this.isMuted = isMuted;
	},
	advanceSequences: function () {
		let channel = this;
		this.instrumentSequences.forEach(function (sequenceName) {
			let sequence = channel.instrument[sequenceName];
			let lastSequenceIndex = channel.phaseMap[sequenceName];
			let sequenceIndex = sequence.advance(lastSequenceIndex, channel.noteHeld);
			channel.phaseMap[sequenceName] = sequenceIndex;
			if(sequenceIndex !== null){
				channel.valueMap[sequenceName] = sequence.valueAt(sequenceIndex);
			}
		});
		if(!channel.noteHeld && channel.phaseMap.volume === null) {
			channel.valueMap.volume = 0;
		}
	},
	resetSequences: function () {
		let channel = this;
		this.instrumentSequences.forEach(function (sequenceName) {
			let sequence = channel.instrument[sequenceName];
			channel.phaseMap[sequenceName] = 0;
			channel.valueMap[sequenceName] = sequence.valueAt(0);
		});
	},
	go: function() {
		let note = this.noteIndex + this.valueMap.arpeggio;
		let freq = this.keyIndexToFreq(note) + this.valueMap.pitch;
		let volume = this.isMuted ? 0 : (this.volume * this.valueMap.volume) >> 2;
		if(this.needWaveformReset) {
			volume |= ET209.VOLUME_RESET_FLAG;
			this.needWaveformReset = false;
		}
		audio.apu.write_voice_rate(this.voiceIndex, freq);
		audio.apu.write_voice_waveform(this.voiceIndex, this.valueMap.waveform);
		audio.apu.write_voice_volume(this.voiceIndex, volume);
		this.advanceSequences();
	}
};

let channels = [0,1,2,3,4,5,6].map(function (index) {
	return new Channel(index);
});

channels[0].setActiveInstrument(new Instrument("10 15 14 13 12 11 | / 10 9 8 8 7 7 6 6 5 5 5 4 4 4 4 3 3 3 3 3 2 2 2 2 2 2 2 1 1 1 1 1 1 1 1 1 1 1 1 0", '', '', "32"));
