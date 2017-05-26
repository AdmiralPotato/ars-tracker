"use strict";

let Instrument = function(argsObject){
	let args = argsObject || {};
	this.name = args.name || 'Instrument '+ instruments.length;
	this.type = args.type || 'voice';
	this.autoperiod = args.autoperiod || null;
	this.volume = new Sequence(args.volume || '| / 15');
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

let defaultInstrument = new Instrument({
	name: 'defaultInstrument',
	volume: '10 15 14 13 12 11 | / 10 9 8 8 7 7 6 6 5 5 5 4 4 4 4 3 3 3 3 3 2 2 2 2 2 2 2 1 1 1 1 1 1 1 1 1 1 1 1 0',
	arpeggio: '0',
	pitch: '0',
	waveform: '32'
});
let noiseInstrument = new Instrument({
	name: 'noiseInstrument',
	volume: '| / 9 6 3 0',
	arpeggio: '0',
	pitch: '0',
	waveform: '0'
});

let instruments = [
	defaultInstrument,
	noiseInstrument
];
