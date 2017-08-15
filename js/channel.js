"use strict";

let Channel = function(voiceIndex, isNoise){
	let channel = this;
	channel.voiceIndex = voiceIndex;
	channel.isNoise = isNoise;
	channel.instrument = null;
	channel.volume = 15;
	channel.panBits = 0;
	channel.curBentPitch = 0;
	channel.hwslideBits = 0;
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
		this.curBentPitch = 0;
		this.resetSequences();
	},
	noteOff: function() {
		this.noteHeld = false;
	},
	noteCut: function() {
		this.isActive = false;
	},
	forgetFX: function() {
		this.panBits = 0;
		this.hwslideBits = 0;
		this.volume = 15;
	},
	setActiveInstrument: function(instrument) {
		this.instrument = instrument;
	},
	setVolume: function(volume) {
		// volume is in range 0-15
		this.volume = volume;
	},
	processEffect: function(effect, parameter) {
		if(effect in this._effectHandlers){
			this._effectHandlers[effect].call(this, parameter);
		}
	},
	// Effects that affect the CHANNEL (pan, etc.) go here. Effects that
	// affect PLAYBACK go into channel.js.
	_effectHandlers: {
		pan: function(param) {
			let panBits = 0;
			if(param & 0x0F) panBits |= 0x40;
			if(param & 0xF0) panBits |= 0x80;
			this.panBits = panBits;
		},
		hwslide: function(param) {
			this.hwslideBits = (param<<14)&0xC000;
		},
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
		/*
		  This bit of logic emulates the curious wraparound behavior
		  of the real playback engine.

		  If you hold the pitchbend in one direction long enough,
		  it will eventually wrap around and break the world.
		*/
		channel.curBentPitch = (channel.curBentPitch + channel.valueMap.pitch) & 65535;
		let freq = (channel.keyIndexToFreq(note) + channel.curBentPitch) & 65535;
		if(freq >= 16384) {
			/*
			  pitchbending knocked us out of range, which value we
			  peg to depends on which direction curBentPitch is
			  pointing in
			  */
			if(channel.curBentPitch & 32768)
				freq = 0; // pitch was bent DOWN
			else
				freq = 16383; // pitch was bent UP
		}
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
		audio.apu.write_voice_rate(channel.voiceIndex, freq | this.hwslideBits);
		if(channel.needWaveformUpdate){
			audio.apu.write_voice_waveform(channel.voiceIndex, channel.valueMap.waveform | channel.panBits);
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
