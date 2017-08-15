"use strict";

let Instrument = function(argsObject){
	let args = argsObject || {};
	this.name = args.name || 'New Instrument';
	this.type = args.type || 'voice';
	this.autoperiod = args.autoperiod || null;
	this.volume = new Sequence(args.volume || '| 15 / 0');
	this.arpeggio = new Sequence(args.arpeggio || '0');
	this.pitch = new Sequence(args.pitch || '0');
	this.waveform = new Sequence(args.waveform || '48');
};

Instrument.sequences = [
	{name: 'volume',   min: 0,    max:15},
	{name: 'arpeggio', min: -120, max:120},
	{name: 'pitch',    min: -128, max:127},
	{name: 'waveform', min: 0,    max:255}
];

let Sequence = function(sequenceString){
	this.parse(sequenceString);
};

Sequence.prototype = {
	parse: function (sequenceString) {
		let sequence = this;
		let instructions = sequenceString.split(' ');
		let output = [];
		this.string = sequenceString;
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
	},
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
		else if(noteHeld && this.hasLoop && previousIndex + 1 === this.loopStopIndex) {
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
