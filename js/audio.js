"use strict";

let ac = window.AudioContext || window.webkitAudioContext;
if(!ac){
	alert('Your browser cannot.');
}
let audioContext = new ac();
let audioAnalyser = audioContext.createAnalyser();
let audioGain = audioContext.createGain();
audioGain.connect(audioContext.destination);
audioGain.connect(audioAnalyser);

let audio = {
	SAMPLES_PER_FRAME: 800,
	SAMPLES_FOR_OVERLAP: 80,
	apu: new ET209(),
	frames: [],
	context: audioContext,
	analyser: audioAnalyser,
	gain: audioGain,
	minPlayTime: 0,
	lastBuffer: null,
	generate_one_frame: function(speakerSetup) {
		let a = audio;
		let channelCount = speakerSetup === 'mono' ? 1 : 2;
		let buffer = a.context.createBuffer(
			channelCount,
			a.SAMPLES_PER_FRAME + a.SAMPLES_FOR_OVERLAP,
			ET209.SAMPLE_RATE
		);
		if(speakerSetup === 'mono'){
			a.apu.generate_array(buffer.getChannelData(0), a.SAMPLES_PER_FRAME);
		}
		else if(speakerSetup === 'headphones'){
			a.apu.generate_headphone_arrays(buffer.getChannelData(0), buffer.getChannelData(1), a.SAMPLES_PER_FRAME);
		}
		else{
			a.apu.generate_stereo_arrays(buffer.getChannelData(0), buffer.getChannelData(1), a.SAMPLES_PER_FRAME);
		}
		if(a.lastBuffer !== null){
			for (let i = 0; i < Math.min(channelCount, a.lastBuffer.numberOfChannels); i++) {
				let data = buffer.getChannelData(i);
				let dataLast = a.lastBuffer.getChannelData(i);
				for (let j = 0; j < a.SAMPLES_FOR_OVERLAP; j++) {
					let sample = data[j] * (1 - (j / a.SAMPLES_FOR_OVERLAP));
					data[j] *= j / a.SAMPLES_FOR_OVERLAP;
					dataLast[a.SAMPLES_PER_FRAME + j] = sample;
				}
			}
			a.playBuffer(a.lastBuffer);
		}
		a.lastBuffer = buffer;
	},
	playBuffer: function(buffer){
		let a = audio;
		let bufferSourceNode = a.context.createBufferSource();
		bufferSourceNode.buffer = buffer;
		bufferSourceNode.connect(a.gain);
		let time = a.context.currentTime;
		let whenToPlay = a.minPlayTime < time ? time : a.minPlayTime;
		bufferSourceNode.start(whenToPlay);
		a.minPlayTime = whenToPlay + (1/60);
	}
};
