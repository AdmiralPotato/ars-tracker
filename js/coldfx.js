/*

  The purpose of this function is to determine which effects should be... well, in effect, when playback begins at a given row. It doesn't seem to belong in any other
  file.

  Later on, we can modify this to cache somewhat aggressively.

*/
"use strict";

// TODO: call this when a new order / row is selected during playback
// TODO: memoize coldFX at least up to the nearest order (this will let us improve correctness, as well, in weird cases)
// TODO: once this is memoized (and therefore runs in O(1)) use this to keep track of the current Speed for MIDI beat clock purposes
let applyColdFX;
{
	let resetAll = function(song, handleEffect) {
		handleEffect(null, {type:"speed",value:song.speed});
		handleEffect(null, {type:"tempo",value:song.tempo});
		for(let n = 0; n < channels.length; ++n) {
			handleEffect(n, {type:"reset_channel"});
		}
	};
	applyColdFX = function(targetOrderIndex, targetRowIndex, handleEffect) {
		let song = app.projectState.songs[app.editorState.activeSongIndex];
		let orderIndex = 0;
		let rowIndex = 0;
		resetAll(song, handleEffect);
		let specialHandlers = {
			halt: function() {
				// this is obviously not the way to the castle
				resetAll(song, handleEffect);
				++orderIndex;
				rowIndex = 0;
			},
			branch: function(fx) {
				if(fx.value < orderIndex && fx.value > targetOrderIndex) {
					// this is not a detour in the right direction
					resetAll(song, handleEffect);
					++orderIndex;
					rowIndex = -1; // will get incremented as part of the "go to next row" logic
				}
				else {
					orderIndex = fx.value;
					rowIndex = -1;
				}
			},
			next: function(fx) {
				++orderIndex;
				rowIndex = -1;
			},
		};
		while(orderIndex < targetOrderIndex || (orderIndex == targetOrderIndex && rowIndex < targetRowIndex)) {
			let curOrder = song.orders[orderIndex];
			let curRowIndex = rowIndex; // make sure not to get tricked if this changes
			// after this point, orderIndex or rowIndex can change
			for(let channelIndex = 0; channelIndex < channels.length; ++channelIndex) {
				let instruction = song.patterns[channelIndex][curOrder[channelIndex]][curRowIndex];
				if(instruction && instruction.instrument !== null) {
					handleEffect(channelIndex, {type:"set_instrument", value:instruction.instrument});
				}
				if(instruction && instruction.fx) {
					instruction.fx.forEach(function(fx) {
						if(!fx) return;
						if(fx.type in specialHandlers) {
							specialHandlers[fx.type](fx);
						}
						else {
							handleEffect(channelIndex, fx);
						}
					});
				}
			}
			++rowIndex;
			if(rowIndex >= song.rows) {
				rowIndex = 0;
				++orderIndex;
			}
		}
	}
}
