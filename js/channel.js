"use strict";

let Channel = function(voiceIndex, isNoise){
	let channel = this;
	channel.voiceIndex = voiceIndex;
	channel.isNoise = isNoise;
	channel.instrument = defaultInstrument;
	channel.volume = 15;
	channel.displayVolume = 0;
	channel.isMuted = false;
	channel.noteIndex = null;
	channel.noteHeld = false;
	channel.needWaveformReset = false;
	channel.needWaveformUpdate = false;
	channel.isActive = false;
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
	BASE_NOTE: 57,
	BASE_FREQ: 440,
	keyIndexToFreq: function(index){
		return Math.floor(this.BASE_FREQ * Math.pow(2,(index - this.BASE_NOTE)/12) * 65536 / ET209.SAMPLE_RATE + 0.5) - 1;
	},
	noteOn: function(noteIndex){
		this.noteIndex = noteIndex;
		this.noteHeld = true;
		this.needWaveformReset = true;
		this.needWaveformUpdate = true;
		this.isActive = true;
		this.resetSequences();
	},
	noteOff: function() {
		this.noteHeld = false;
	},
	noteCut: function() {
		this.isActive = false;
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
		Instrument.sequences.forEach(function (sequenceDescription) {
			let sequenceName = sequenceDescription.name;
			let sequence = channel.instrument[sequenceName];
			let lastSequenceIndex = channel.phaseMap[sequenceName];
			let sequenceIndex = sequence.advance(lastSequenceIndex, channel.noteHeld);
			channel.phaseMap[sequenceName] = sequenceIndex;
			if(sequenceIndex !== null){
				if(sequenceName === 'waveform'){
					channel.needWaveformUpdate = true;
				}
				channel.valueMap[sequenceName] = sequence.valueAt(sequenceIndex);
			}
		});
		if(!channel.noteHeld && channel.phaseMap.volume === null) {
			channel.valueMap.volume = 0;
		}
	},
	resetSequences: function () {
		let channel = this;
		Instrument.sequences.forEach(function (sequenceDescription) {
			let sequenceName = sequenceDescription.name;
			let sequence = channel.instrument[sequenceName];
			channel.phaseMap[sequenceName] = 0;
			channel.valueMap[sequenceName] = sequence.valueAt(0);
		});
	},
	go: function() {
		if(this.isActive){
			if(this.isNoise){
				this.goNoise();
			} else {
				this.goVoice();
			}
		} else {
			if(this.isNoise){
				audio.apu.write_noise_volume(0);
			} else {
				audio.apu.write_voice_volume(this.voiceIndex, 0);
			}
		}
	},
	goVoice: function() {
		let channel = this;
		let note = channel.noteIndex + channel.valueMap.arpeggio;
		let freq = channel.keyIndexToFreq(note) + channel.valueMap.pitch;
		let maskedVolume = channel.valueMap.volume & 15;
		let overrideReset = channel.valueMap.volume & ET209.VOLUME_RESET_FLAG;
		let volume = channel.isMuted ? 0 : (channel.volume * maskedVolume) >> 2;
		if(channel.needWaveformReset) {
			volume |= ET209.VOLUME_RESET_FLAG;
			channel.needWaveformReset = false;
		}
		if(overrideReset){
			volume ^= ET209.VOLUME_RESET_FLAG;
		}
		audio.apu.write_voice_rate(channel.voiceIndex, freq);
		if(channel.needWaveformUpdate){
			audio.apu.write_voice_waveform(channel.voiceIndex, channel.valueMap.waveform);
			channel.needWaveformUpdate = false;
		}
		audio.apu.write_voice_volume(channel.voiceIndex, volume);
		channel.displayVolume = volume;
		channel.advanceSequences();
	},
	goNoise: function() {
		let channel = this;
		let maskedVolume = channel.valueMap.volume & 15;
		let overrideReset = channel.valueMap.volume & ET209.VOLUME_RESET_FLAG;
		let volume = channel.isMuted ? 0 : (channel.volume * maskedVolume) >> 2;
		if(channel.needWaveformReset) {
			volume |= ET209.VOLUME_RESET_FLAG;
			channel.needWaveformReset = false;
		}
		if(overrideReset){
			volume ^= ET209.VOLUME_RESET_FLAG;
		}
		audio.apu.write_noise_period(channel.noteIndex);
		if(channel.needWaveformUpdate){
			audio.apu.write_noise_waveform(channel.valueMap.waveform);
			channel.needWaveformUpdate = false;
		}
		audio.apu.write_noise_volume(volume);
		channel.advanceSequences();
	}
};

let channels = [0,1,2,3,4,5,6,7].map(function (index) {
	let channelIndex = index;
	let isNoise = channelIndex === 7;
	return new Channel(channelIndex, isNoise);
});
