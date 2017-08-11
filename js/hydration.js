"use strict";

let hydration = {
	rleDecodePattern: function(inputPattern){
		let result = [];
		inputPattern.forEach(function(run){
			let expandedRun = app.repeatCopy(run);
			result.push.apply(result, expandedRun);
		});
		return result;
	},
	hydrate: function (state) {
		// turn instruments into objects
		state.instruments = state.instruments.map(function (instrumentData) {
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
							rleDecodedPattern.push({});
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
		var dehydrated = JSON.parse(JSON.stringify(state));
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
		});
		dehydrated.songs.forEach(function (song) {
			song.patterns.forEach(function (channel) {
				channel.forEach(function (pattern) {
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
			});
		});
		// Our caller can JSON.stringify if they want, or not if they don't.
		return dehydrated;
	},
}
