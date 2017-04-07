"use strict";

let ac = window.AudioContext || window.webkitAudioContext;
if(!ac){
	alert('Your browser cannot.');
}
let audio = {
	SAMPLES_PER_FRAME: 800,
	BASE_NOTE: 57,
	BASE_FREQ: 440,
	apu: new ET209(),
	frames: [],
	context: new ac(),
	minPlayTime: 0,
	generate_one_frame: function() {
		let a = audio;
		let buffer = a.context.createBuffer(1, a.SAMPLES_PER_FRAME, ET209.SAMPLE_RATE);
		let bufferSourceNode = a.context.createBufferSource();
		a.apu.generate_buffer(buffer);
		bufferSourceNode.buffer = buffer;
		bufferSourceNode.connect(a.context.destination);
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
			<keyboard :octaves="5" :onHandler="on" :offHandler="off"/>
		</div>
	`
});
