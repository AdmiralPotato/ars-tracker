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
	onKeys: [],
	handleKeyOn: function(keyIndex, resume){
		let channel = channels[0];
		if(!resume){
			app.onKeys.push(keyIndex);
		}
		channel.noteOn(keyIndex);
	},
	handleKeyOff: function(keyIndex){
		let channel = channels[0];
		let lastPlayedKey = getLastValueInArray(app.onKeys);
		arrayRemove(app.onKeys, keyIndex);
		if(app.onKeys.length < 1){
			channel.noteOff();
		} else if(keyIndex === lastPlayedKey){
			app.handleKeyOn(getLastValueInArray(app.onKeys), true);
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
	}
};

app.startAudio();

app.vue = new Vue({
	el: '#appTarget',
	data:function () {
		return {
			onKeys: app.onKeys
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
	},
	template: `
		<div>
			<h1>ARS-Tracker</h1>
			<vue-oscilloscope :analyser="audio.analyser" />
			<keyboard :octaves="5" :onHandler="on" :offHandler="off" :onKeys="onKeys" />
		</div>
	`
});
