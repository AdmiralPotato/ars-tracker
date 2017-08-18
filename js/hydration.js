"use strict";

let hydration = {
	rleDecodePattern: function(inputPattern){
		let result = [];
		inputPattern.forEach(function(run){
			if(run.note === false) run.note = 'off';
			else if(run.note === null) run.note = 'cut';
			else if(run.note === undefined) run.note = null;
			if(run.instrument === undefined) run.instrument = null;
			if(run.volume === undefined) run.volume = null;
			if(run.fx === undefined) run.fx = null;
			let expandedRun = app.repeatCopy(run);
			result.push.apply(result, expandedRun);
		});
		return result;
	},
	newEmptyInstruction: function() {
		return {note:null,volume:null,instrument:null,fx:null};
	},
	hydrate: function (state) {
		// turn instruments into objects
		state.instruments = state.instruments.map(function (instrumentData) {
			Instrument.sequences.forEach(function(sequence) {
				if(instrumentData[sequence.name] == undefined) {
					instrumentData[sequence.name] = sequence.ifMissing;
				}
			});
			return new Instrument(instrumentData);
		});
		// de-RLE the patterns
		state.songs.forEach(function (song) {
			song.patterns = song.patterns.map(function (channel) {
				if(channel.length == 0) {
					return [[]];
				}
				else {
					return channel.map(function (rlePattern) {
						let rleDecodedPattern = hydration.rleDecodePattern(rlePattern);
						while(rleDecodedPattern.length < song.rows) {
							rleDecodedPattern.push(hydration.newEmptyInstruction());
						}
						return rleDecodedPattern;
					});
				}
			});
		});
		// A-OK
		return state;
	},
	dehydrate: function (state) {
		// Is this REALLY the fastest way to make an unobserved deep copy of an object? @_@
		let dehydrated = JSON.parse(JSON.stringify(state));
		dehydrated.instruments.forEach(function (instrument) {
			// type="voice" and autoperiod="null" can be assumed
			if(instrument.type === "voice") {
				delete instrument.type;
			}
			if(instrument.autoperiod === null) {
				delete instrument.autoperiod;
			}
			// turn sequences back into their stringy selves
			Instrument.sequences.forEach(function (seq) {
				instrument[seq.name] = instrument[seq.name].string;
			});
			// and delete the default ones
			Instrument.sequences.forEach(function(sequence) {
				if(instrumentData[sequence.name] == sequence.ifMissing) {
					delete instrumentData[sequence.name];
				}
			});
		});
		dehydrated.songs.forEach(function (song) {
			song.patterns.forEach(function (channel) {
				channel.forEach(function (pattern) {
					pattern.forEach(function (instruction) {
						if(instruction.note === null) delete instruction.note;
						else if(instruction.note == 'off') instruction.note = false;
						else if(instruction.note == 'cut') instruction.note = null;
						if(instruction.instrument === null) delete instruction.instrument;
						if(instruction.volume === null) delete instruction.volume;
						if(instruction.fx !== null) {
							while(instruction.fx.length > 0 && instruction.fx[instruction.fx.length] === null) {
								delete instruction.fx[instruction.fx.length];
							}
						}
						if(instruction.fx === null || instruction.fx.length == 0) delete instruction.fx;
					});
					let n = 0;
					let currentString = null;
					let nextString = JSON.stringify(pattern[n]);
					while(pattern[n] !== undefined) {
						currentString = nextString;
						while(pattern[n+1] !== undefined && nextString == currentString) {
							nextString = JSON.stringify(pattern[n+1]);
							if(nextString == currentString) {
								if(!pattern[n].repeat) pattern[n].repeat = 1;
								++pattern[n].repeat;
								pattern.splice(n+1, 1);
							}
						}
						n = n + 1;
					}
					if(currentString == '{}') {
						// trim off redundant last instruction
						pattern.splice(pattern.length-1, 1);
					}
				});
				// trim off trailing empty patterns
				while(channel.length > 0 && channel[channel.length-1].length == 0) {
					channel.splice(channel.length-1, 1);
				}
			});
		});
		// Our caller can JSON.stringify if they want, or not if they don't.
		return dehydrated;
	},
};
