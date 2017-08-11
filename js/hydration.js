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
}
