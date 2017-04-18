"use strict";

let Instrument = function(volume, arpeggio, pitch, waveform){
	this.volume = new Sequence(volume || '| / 15');
	this.arpeggio = new Sequence(arpeggio || '0');
	this.pitch = new Sequence(pitch || '0');
	this.waveform = new Sequence(waveform || '0');
};

let Sequence = function(sequenceString){
	let sequence = this;
	let instructions = sequenceString.split(' ');
	let output = [];
	this.hasLoop = false;
	this.loopStartIndex = 0;
	instructions.forEach(function(instruction){
		let numberValue = parseInt(instruction, 10);
		let instructionFunc = sequence.specialInstruction[instruction];
		if(isNaN(numberValue) && instructionFunc){
			instructionFunc(output.length, sequence);
		} else {
			output.push(numberValue);
		}
	});
	this.values = output;
};

Sequence.prototype = {
	specialInstruction: {
		'|': function(index, sequence){
			sequence.loopStartIndex = index;
		},
		'/': function(index, sequence){
			sequence.hasLoop = true;
			sequence.loopStopIndex = index;
		}
	},
	advance: function(previousIndex, noteHeld){
		let result = null;
		if(previousIndex === null) {
			// sequence already not happening
		}
		else if(!noteHeld && !this.hasLoop) {
			// no loop means instant note-off
		}
		else if(noteHeld && this.hasLoop && previousIndex === this.loopStopIndex) {
			// return to start of loop
			result = this.loopStartIndex;
		}
		else if(previousIndex + 1 >= this.values.length) {
			// end of sequence
		}
		else {
			// continue in sequence
			result = previousIndex + 1;
		}
		return result;
	},
	valueAt: function (index) {
		return this.values[index];
	}
};

let defaultInstrument = new Instrument();

let instruments = [];
