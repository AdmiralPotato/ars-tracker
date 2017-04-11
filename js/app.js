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
	BASE_NOTE: 57,
	BASE_FREQ: 440,
	apu: new ET209(),
	frames: [],
	context: audioContext,
	analyser: audioAnalyser,
	gain: audioGain,
	minPlayTime: 0,
	lastBuffer: null,
	generate_one_frame: function() {
		let a = audio;
		let buffer = a.context.createBuffer(
			1,
			a.SAMPLES_PER_FRAME + a.SAMPLES_FOR_OVERLAP,
			ET209.SAMPLE_RATE
		);
		let data = buffer.getChannelData(0);
		a.apu.generate_array(data, a.SAMPLES_PER_FRAME);
		if(a.lastBuffer !== null){
			let dataLast = a.lastBuffer.getChannelData(0);
			for (let i = 0; i < a.SAMPLES_FOR_OVERLAP; i++) {
				let sample = data[i] * (1 - (i / a.SAMPLES_FOR_OVERLAP));
				data[i] *= i / a.SAMPLES_FOR_OVERLAP;
				dataLast[a.SAMPLES_PER_FRAME + i] = sample;
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
	},
	keyIndexToFreq: function(index){
		return Math.floor(audio.BASE_FREQ * Math.pow(2,(index-audio.BASE_NOTE)/12) * 65536 / ET209.SAMPLE_RATE + 0.5) - 1;
	},
	handleKeyOn: function(index){
		let a = audio;
		let freq = a.keyIndexToFreq(index);
		a.apu.write_voice_rate(0, freq);
		a.apu.write_voice_waveform(0, ET209.WAVEFORM_TOGGLE_INVERT_ON_CARRY_FLAG);
		a.apu.write_voice_volume(0, ET209.VOLUME_RESET_FLAG | 64);
	},
	handleKeyOff: function(){
		let a = audio;
		a.apu.write_voice_volume(0, ET209.VOLUME_RESET_FLAG);
	}
};

setInterval(
	function(){
		while(audio.context.currentTime > audio.minPlayTime - 0.1){
			audio.generate_one_frame();
		}
	},
	1000/60
);


let app = new Vue({
	el: '#appTarget',
	created: function(){
		this.audio = audio;
	},
	methods: {
		on: function(index){
			audio.handleKeyOn(index);
		},
		off: function(index){
			audio.handleKeyOff(index);
		},
	},
	template: `
		<div>
			<h1>ARS-Tracker</h1>
			<vue-oscilloscope :analyser="audio.analyser" />
			<keyboard :octaves="5" :onHandler="on" :offHandler="off"/>
		</div>
	`
});
