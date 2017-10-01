"use strict";

let templatePad = function (n, padTemplate) {
	let str = (n).toString();
	return (padTemplate + str).substring(str.length);
};

let formatByte = function (n) {
	return templatePad(n.toString(16).toLocaleUpperCase(), '00');
};

let instructionProperties = [
	'note',
	'instrument_high','instrument_low',
	'volume',
	'fx0_type','fx0_high','fx0_low',
];

let getInstruction = function(overrideChannel){
	let editorState = app.editorState;
	let projectState = app.projectState;
	let channelIndex = overrideChannel != null ? overrideChannel : editorState.activeChannelIndex;
	let activeSong = projectState.songs[editorState.activeSongIndex];
	let activePatternIndex = activeSong.orders[editorState.activeOrderIndex][channelIndex];
	let activePattern = activeSong.patterns[channelIndex][activePatternIndex];
	while(activePattern.length < activeSong.rows) {
		activePattern.push(hydration.newEmptyInstruction());
	}
	let instruction = activePattern[editorState.activeRowIndex];
	return JSON.parse(JSON.stringify(instruction)); // return a copy in case our caller decides to back out of changing the instruction
};
let updateInstruction = function(newInstruction, overrideChannel){
	let editorState = app.editorState;
	let projectState = app.projectState;
	let channelIndex = overrideChannel != null ? overrideChannel : editorState.activeChannelIndex;
	let activeSong = projectState.songs[editorState.activeSongIndex];
	let activePatternIndex = activeSong.orders[editorState.activeOrderIndex][channelIndex];
	let activePattern = activeSong.patterns[channelIndex][activePatternIndex];
	let oldInstruction = activePattern[editorState.activeRowIndex];
	for(let prop in newInstruction) {
		// in practice, this will always update a non-null fx
		if(oldInstruction[prop] != newInstruction[prop]) {
			oldInstruction[prop] = newInstruction[prop];
		}
	}
};
let eraseValue = function () {
	let instruction = getInstruction();
	let property = app.editorState.activeProperty.match(/^[^_]*/)[0];
	if(property.startsWith('fx')){
		let fxIndex = parseInt(property.substring(2), 10);
		instruction.fx[fxIndex] = null;
		instruction.fx = instruction.fx.slice();
	} else {
		instruction[property] = null;
	}
	updateInstruction(instruction);
};
let togglePlayback = function() {
	if(app.editorState.playbackState == 'paused') {
		app.vue.changePlaybackState(app.editorState.playbackStateOnLastPause || 'playSong');
	}
	else {
		app.vue.changePlaybackState('paused');
	}
	event.preventDefault();
};
let keyHandlerMap = {
	'Backspace': eraseValue,
	'Delete': eraseValue,
	' ': togglePlayback,
};
let filterHexDigitKey = function(event) {
	if(event.key.match(/^[0-9A-Fa-f]$/))
		return parseInt(event.key, 16);
	else
		return false;
};
let applyAutoInstrument = function(instruction,channel) {
	if(!app.editorState.autoInstrument)
		return;
	let index = app.projectState.instruments.indexOf((app.editorState.respectMIDIInstruments && channel) ? channel.instrument : app.editorState.activeInstrument);
	if(index >= 0) instruction.instrument = index;
}
let autoAdvance = function() {
	if(app.editorState.autoAdvance && app.editorState.playbackState == 'paused') {
		app.editorState.activeRowIndex = (app.editorState.activeRowIndex + 1) % app.projectState.songs[app.editorState.activeSongIndex].rows;
		if(app.editorState.autoAdvanceOrder && app.editorState.activeRowIndex == 0) {
			app.editorState.activeOrderIndex = (app.editorState.activeOrderIndex + 1) % app.projectState.songs[app.editorState.activeSongIndex].orders.length;
		}
	}
}
let noteLetterMap = {C:0, D:2, E:4, F:5, G:7, A:9, B:11};
let octaveDigitMap = {Z:0, 0:12, 1:24, 2:36, 3:48, 4:60, 5:72, 6:84, 7:96, 8:108};
// this is the highest note whose frequency can actually be inputted into the ET209
let maximum_voice_note = 114;
let instruction_has_note_on = function(instruction) {
	return instruction.note !== null
		&& instruction.note !== 'cut'
		&& instruction.note !== 'off';
}
// filters return true if they fully handled the keypress
let keyFilterMap = {
	'note':function(event){
		if(channels[app.editorState.activeChannelIndex].isNoise) {
			let digit = filterHexDigitKey(event);
			if(digit !== false) {
				let instruction = getInstruction();
				if(instruction_has_note_on(instruction)) {
					instruction.note = ((instruction.note << 4) | digit) & 255;
				}
				else {
					instruction.note = digit;
				}
				applyAutoInstrument(instruction);
				updateInstruction(instruction);
				return true;
			}
			else if(event.key == ".") {
				let instruction = getInstruction();
				applyAutoInstrument(instruction);
				let instrument;
				if(instruction.instrument != null) {
					instrument = app.projectState.instruments[instruction.instrument];
				}
				else {
					instrument = app.editorState.activeInstrument;
				}
				if(instrument != null && instrument.autoperiod) {
					instruction.note = instrument.autoperiod;
					updateInstruction(instruction);
					return true;
				}
			}
		}
		else {
			let uppercase = event.key.toUpperCase();
			if(uppercase in noteLetterMap) {
				let instruction = getInstruction();
				if(!instruction_has_note_on(instruction)) {
					instruction.note = 60;
				}
				applyAutoInstrument(instruction);
				instruction.note = (instruction.note - instruction.note % 12) + noteLetterMap[uppercase];
				if(instruction.note > maximum_voice_note) {
					instruction.note = maximum_voice_note;
				}
				updateInstruction(instruction);
				return true;
			}
			else if(uppercase in octaveDigitMap) {
				let instruction = getInstruction();
				if(!instruction_has_note_on(instruction)) {
					instruction.note = 60;
				}
				applyAutoInstrument(instruction);
				instruction.note = octaveDigitMap[uppercase] + instruction.note % 12;
				if(instruction.note > maximum_voice_note) {
					instruction.note = maximum_voice_note;
				}
				updateInstruction(instruction);
				autoAdvance();
				return true;
			}
			else if(event.key == "#") {
				let instruction = getInstruction();
				if(!instruction_has_note_on(instruction)) {
					instruction.note = 60;
				}
				applyAutoInstrument(instruction);
				++instruction.note;
				if(instruction.note > maximum_voice_note) {
					instruction.note = maximum_voice_note;
				}
				updateInstruction(instruction);
				return true;
			}
		}
		if(event.key == "x" || event.key == "X") {
			let instruction = getInstruction();
			instruction.note = 'off';
			updateInstruction(instruction);
			return true;
		}
		else if(event.key == "\\") {
			let instruction = getInstruction();
			instruction.note = 'cut';
			updateInstruction(instruction);
			return true;
		}
	},
	'instrument_high':function(event){
		let digit = filterHexDigitKey(event);
		if(digit !== false) {
			let instruction = getInstruction();
			if(instruction.instrument === null) {
				instruction.instrument = digit << 4;
			}
			else {
				instruction.instrument = (instruction.instrument & 0xF) | (digit << 4);
			}
			updateInstruction(instruction);
			return true;
		}
	},
	'instrument_low':function(event){
		let digit = filterHexDigitKey(event);
		if(digit !== false) {
			let instruction = getInstruction();
			if(instruction.instrument === null) {
				instruction.instrument = digit;
			}
			else {
				instruction.instrument = (instruction.instrument & 0xF0) | digit;
			}
			updateInstruction(instruction);
			return true;
		}
	},
	'volume':function(event){
		let digit = filterHexDigitKey(event);
		if(digit !== false) {
			let instruction = getInstruction();
			instruction.volume = digit;
			updateInstruction(instruction);
			return true;
		}
	},
};
for(let n = 0; n < 3; ++n) {
	let effectIndex = n;
	keyFilterMap["fx"+n+"_type"] = function(event){
		let uppercase = event.key.toUpperCase();
		if(letter_to_effect_name[uppercase]) {
			let instruction = getInstruction();
			if(instruction.fx == null) {
				instruction.fx = [];
			}
			while(instruction.fx.length < effectIndex) {
				instruction.fx.push(null);
			}
			if(instruction.fx[effectIndex] == undefined) {
				instruction.fx[effectIndex] = {value:0};
			}
			instruction.fx[effectIndex].type = letter_to_effect_name[uppercase];
			updateInstruction(instruction);
			return true;
		}
	};
	keyFilterMap["fx"+n+"_high"] = function(event){
		let digit = filterHexDigitKey(event);
		if(digit !== false) {
			let instruction = getInstruction();
			if(instruction.fx == null || instruction.fx[effectIndex] == undefined) {
				return false;
			}
			instruction.fx[effectIndex].value = (instruction.fx[effectIndex].value & 0xF) | (digit << 4)
			updateInstruction(instruction);
			return true;
		}
	};
	keyFilterMap["fx"+n+"_low"] = function(event){
		let digit = filterHexDigitKey(event);
		if(digit !== false) {
			let instruction = getInstruction();
			if(instruction.fx == null || instruction.fx[effectIndex] == undefined) {
				return false;
			}
			instruction.fx[effectIndex].value = (instruction.fx[effectIndex].value & 0xF0) | digit;
			updateInstruction(instruction);
			return true;
		}
	};
}
let recordNoteOn = function(noteValue, velocity, channel) {
	let instruction = getInstruction(channel);
	applyAutoInstrument(instruction, channels[channel]);
	instruction.note = noteValue;
	if(instruction.note > maximum_voice_note) {
		instruction.note = maximum_voice_note;
	}
	if(app.editorState.respectMIDIVelocities) {
		instruction.volume = (velocity+7)>>3;
	}
	updateInstruction(instruction, channel);
	if(!app.editorState.respectMIDIClocks) {
		autoAdvance();
	}
};
let recordNoteOff = function(channel) {
	if(app.editorState.noteOffMode == 'ignored')
		return;
	let instruction = getInstruction(channel);
	instruction.instrument = null;
	instruction.note = app.editorState.noteOffMode;
	updateInstruction(instruction, channel);
	if(!app.editorState.respectMIDIClocks) autoAdvance();
};
let recordInstrument = function(instrument, channel) {
	let instruction = getInstruction(channel);
	instruction.instrument = instrument;
	updateInstruction(instruction, channel);
};
let recordAdvance = function() {
	autoAdvance();
};

Vue.component(
	'pattern-editor',
	{
		props: {
			channels: Array,
			editorState: Object,
			activeOrder: Array,
			patterns: Array,
			rowCount: Number
		},
		computed: {
			tableRows: function () {
				let rows = [];
				let rowCount = this.rowCount;
				let patterns = this.patterns;
				let activeOrder = this.activeOrder;
				activeOrder.forEach(function (channelOrderIndex, channelIndex) {
					while(channelOrderIndex >= patterns[channelIndex].length){
						patterns[channelIndex].push([]);
					}
					let patternRows = patterns[channelIndex][channelOrderIndex];
					for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
						let instruction = patternRows[rowIndex];
						if(instruction == undefined) {
							instruction = hydration.newEmptyInstruction();
							patternRows.push(instruction);
						}
						if(!rows[rowIndex]){
							rows[rowIndex] = [];
						}
						rows[rowIndex][channelIndex] = instruction;
					}
				});
				return rows;
			}
		},
		data: function(){
			return {
				noteOffModes: {
					'off': 'Note Off→Off',
					'cut': 'Note Off→Cut',
					'ignored': 'Note Off Ignored'
				},
				sppModes: {
					'ignored': 'Ignore SPP',
					'pattern': 'Pattern SPP',
					'song': 'Song SPP',
				},
			};
		},
		methods: {
			formatByte: formatByte,
			toggleChannel: function (channelIndex) {
				let polyphonyChannels = this.editorState.polyphonyChannels;
				let alreadyThere = polyphonyChannels.indexOf(channelIndex) !== -1;
				if(alreadyThere){
					arrayRemove(polyphonyChannels, channelIndex);
				} else {
					polyphonyChannels.push(channelIndex);
				}
			},
			setActive: function (rowIndex, channelIndex, property) {
				this.editorState.activeRowIndex = rowIndex;
				this.editorState.activeChannelIndex = channelIndex;
				this.editorState.activeProperty = property;
			},
			moveUp:    function(e){this.moveCursorRelative(e,  0, -1);},
			moveDown:  function(e){this.moveCursorRelative(e,  0,  1);},
			moveLeft:  function(e){this.moveCursorRelative(e, -1,  0);},
			moveRight: function(e){this.moveCursorRelative(e,  1,  0);},
			moveCursorRelative: function (keydownEvent, x, y) {
				keydownEvent.stopPropagation();
				keydownEvent.stopImmediatePropagation();
				keydownEvent.preventDefault();
				let currentPropertyIndex = instructionProperties.indexOf(this.editorState.activeProperty);
				let propertyBeforeWrap = currentPropertyIndex + x;
				let channelWrapDirection = propertyBeforeWrap > instructionProperties.length -1 ? 1 : propertyBeforeWrap < 0 ? -1 : 0;
				let channelWrapped = this.wrapRange(this.editorState.activeChannelIndex + channelWrapDirection, channels.length);
				let propertyIndex = this.wrapRange(propertyBeforeWrap, instructionProperties.length);
				let propertyName = instructionProperties[propertyIndex];
				let rowWrapped = this.wrapRange(this.editorState.activeRowIndex + y, this.rowCount);
				this.setActive(
					rowWrapped,
					channelWrapped,
					propertyName
				);
			},
			input: function (keydownEvent) {
				let filter = keyFilterMap[app.editorState.activeProperty];
				if(filter && filter(keydownEvent)) {
					// The filter handled the event
					keydownEvent.preventDefault();
					return;
				}
				let handler = keyHandlerMap[keydownEvent.key];
				if(handler){
					keydownEvent.preventDefault();
					handler(keydownEvent);
				}
			},
			wrapRange: function(n, max){
				return (n + max) % max;
			},
			changeNoteOffMode: function(newMode) {
				app.editorState.noteOffMode = newMode;
			},
			changeSPPMode: function(newMode) {
				app.editorState.sppMode = newMode;
			}
		},
		template: `
			<div
				class="pattern-editor"
				tabindex="0"
				@keydown.capture.up="moveUp"
				@keydown.capture.down="moveDown"
				@keydown.capture.left="moveLeft"
				@keydown.capture.right="moveRight"
				@keydown="input"
			>
				<editor-state-styling :editorState="editorState" />
				<ul class="tab-list">
					<prop-checkbox :source="editorState" prop="autoAdvance" name="Auto Advance Row" />
					<prop-checkbox :source="editorState" prop="autoAdvanceOrder" name="Auto Advance Order" />
					<prop-checkbox :source="editorState" prop="autoInstrument" name="Auto-Instrument" />
				</ul>
				<ul class="tab-list">
					<prop-checkbox :source="editorState" prop="recordMIDI" name="Record MIDI" />
					<prop-checkbox :source="editorState" prop="respectMIDIClocks" name="MIDI Clock" />
					<prop-checkbox :source="editorState" prop="respectMIDIVelocities" name="MIDI Velocity" />
					<prop-checkbox :source="editorState" prop="respectMIDIInstruments" name="MIDI Instrument" />
					<prop-checkbox :source="editorState" prop="respectMIDIChannels" name="MIDI Channel" />
					<prop-checkbox :source="editorState" prop="enablePolyphony" name="MIDI Auto-Polyphony" />
				</ul>
				<ul class="tab-list">
					<li class="noSelect buttons">
						<button
							v-for="(symbol, name) in noteOffModes"
							@click="changeNoteOffMode(name)"
							:title="editorState.noteOffMode"
							:class="{active: name === editorState.noteOffMode}"
						>
							<span v-html="symbol"></span>
						</button>
					</li>
					<li class="noSelect buttons">
						<button
							v-for="(symbol, name) in sppModes"
							@click="changeSPPMode(name)"
							:title="editorState.sppMode"
							:class="{active: name === editorState.sppMode}"
						>
							<span v-html="symbol"></span>
						</button>
					</li>
				</ul>
				<table>
					<thead>
						<th></th>
						<th
							class="channel"
							v-for="(item, index) in channels"
						>
							<channel
								:channel="item"
								:index="index"
								:toggleChannel="toggleChannel"
								/>
						</th>
					</thead>
					<tbody>
						<tr
							v-for="(row, rowIndex) in tableRows"
							:class="'perow_'+rowIndex"
							>
							<th>row {{formatByte(rowIndex)}}</th>
							<td v-for="(instruction, channelIndex) in row"
								:name="'channel'+channelIndex"
								>
								<instruction-editor
									:isNoise="channels[channelIndex].isNoise"
									:instruction="instruction"
									:cellName="'pecell_'+rowIndex+'_'+channelIndex+'_'"
									:setActive="function(property){setActive(rowIndex, channelIndex, property)}"
								/>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		`
	}
);

Vue.component(
	'channel',
	{
		props: {
			channel: Channel,
			index: Number,
			toggleChannel: Function
		},
		template: `
			<button
				:class="{active: !channel.isMuted}"
				@click="channel.isMuted = !channel.isMuted">
				<span class="checkbox"></span>
				<span>{{channel.isNoise ? 'Noise' : ('Voice ' + (index+1))}}</span>
			</button>
		`
	}
);

Vue.component(
	'prop-checkbox',
	{
		props: {
			source: Object,
			prop: String,
			name: String
		},
		template: `
			<li class="noSelect buttons">
				<button @click="source[prop] = !source[prop]"
					:class="{active: source[prop]}"
					>
					<span class="checkbox"></span>
					{{name}}
				</button>
			</li>
		`
	}
);

Vue.component(
	'editor-state-styling',
	{
		props: {
			editorState: Object
		},
		computed: {
			activeStyling: function(){
				let editorState = this.editorState;
				return `
					<style>
					tr.perow_${editorState.activeRowIndex}{
						background-color: #226;
					}
					span.pecell_${editorState.activeRowIndex}_${editorState.activeChannelIndex}_${editorState.activeProperty}{
						background-color: #264;
					}
				</style>
					`;
			}
		},
		template: `
			<div class="editor-state-styling" v-html="activeStyling"></div>
			`
	}
);
