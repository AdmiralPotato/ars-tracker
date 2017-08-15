"use strict";

let templatePad = function (n, padTemplate) {
	let str = (n).toString();
	return (padTemplate + str).substring(str.length);
};

let formatByte = function (n) {
	return templatePad(n.toString(16).toLocaleUpperCase(), '00');
};

Vue.component(
	'order-editor',
	{
		props: {
			channels: Array,
			orders: Array,
			patterns: Array,
			activeOrderIndex: Number,
			activateOrder: Function
		},
		computed: {
			tableRows: function () {
				let orders = [];
				this.orders.forEach(function (order, rowIndex) {
					order.forEach(function (channelPatternIndex, channelIndex) {
						if(!orders[rowIndex]){
							orders[rowIndex] = [];
						}
						orders[rowIndex][channelIndex] = channelPatternIndex;
					});
				});
				return orders;
			}
		},
		methods: {
			formatByte: formatByte
		},
		template: `
			<div class="order-editor">
				<table>
					<thead>
						<th>channels</th>
						<th v-for="(item, index) in channels">{{index}}</th>
					</thead>
					<tbody>
						<tr
							v-for="(order, orderIndex) in tableRows"
							:class="{active: activeOrderIndex === orderIndex}"
							>
							<th @click="activateOrder(orderIndex)">order {{formatByte(orderIndex)}}</th>
							<td v-for="(columnValue, columnIndex) in order">
								<input type="text" v-model.number="order[columnIndex]" size="2" />
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		`
	}
);

let instructionProperties = [
	'note',
	'instrument_high','instrument_low',
	'volume',
	'fx0_type','fx0_high','fx0_low',
];

let getInstruction = function(){
	let editorState = app.editorState;
	let projectState = app.projectState;
	let activeSong = projectState.songs[editorState.activeSongIndex];
	let activePatternIndex = activeSong.orders[editorState.activeOrderIndex][editorState.activeChannelIndex];
	let activePattern = activeSong.patterns[editorState.activeChannelIndex][activePatternIndex];
	while(activePattern.length <= editorState.activeRowIndex) activePattern.push({});
	let instruction = activePattern[editorState.activeRowIndex];
	return instruction;
};
let updateInstruction = function(instruction){
	let editorState = app.editorState;
	let projectState = app.projectState;
	let activeSong = projectState.songs[editorState.activeSongIndex];
	let activePatternIndex = activeSong.orders[editorState.activeOrderIndex][editorState.activeChannelIndex];
	let activePattern = activeSong.patterns[editorState.activeChannelIndex][activePatternIndex];
	activePattern.splice(editorState.activeRowIndex, 1, JSON.parse(JSON.stringify(instruction))); // welcome to the Web!
};
let eraseValue = function () {
	let instruction = getInstruction();
	let property = app.editorState.activeProperty;
	if(property.startsWith('fx')){
		let fxIndex = parseInt(property.substring(2), 10);
		instruction.fx[fxIndex] = null;
		instruction.fx = instruction.fx.slice();
	} else {
		instruction[property] = undefined;
	}
};
let keyHandlerMap = {
	'Backspace': eraseValue,
	'Delete': eraseValue,
};
let filterHexDigitKey = function(event) {
	if(event.key.match(/^[0-9A-Fa-f]$/))
		return parseInt(event.key, 16);
	else
		return false;
};
let noteLetterMap = {C:0, D:2, E:4, F:5, G:7, A:9, B:11};
let octaveDigitMap = {Z:0, 0:12, 1:24, 2:36, 3:48, 4:60, 5:72, 6:84, 7:96, 8:108};
// this is the highest note whose frequency can actually be inputted into the ET209
let maximum_voice_note = 114;
// filters return true if they fully handled the keypress
let keyFilterMap = {
	'note':function(event){
		if(channels[app.editorState.activeChannelIndex].isNoise) {
			let digit = filterHexDigitKey(event);
			if(digit !== false) {
				let instruction = getInstruction();
				if(instruction.note === undefined) instruction.note = digit;
				else if(instruction.note === null) instruction.note = digit;
				else if(instruction.note === false) instruction.note = digit;
				else instruction.note = ((instruction.note << 4) | digit) & 255;
				updateInstruction(instruction);
				return true;
			}
		}
		else {
			let uppercase = event.key.toUpperCase();
			if(uppercase in noteLetterMap) {
				let instruction = getInstruction();
				if(instruction.note === undefined
				   || instruction.note === null
				   || instruction.note === false) instruction.note = 60;
				instruction.note = (instruction.note - instruction.note % 12) + noteLetterMap[uppercase];
				if(instruction.note > maximum_voice_note) instruction.note = maximum_voice_note;
				updateInstruction(instruction);
				return true;
			}
			else if(uppercase in octaveDigitMap) {
				let instruction = getInstruction();
				if(instruction.note === undefined
				   || instruction.note === null
				   || instruction.note === false) instruction.note = 60;
				instruction.note = octaveDigitMap[uppercase] + instruction.note % 12;
				if(instruction.note > maximum_voice_note) instruction.note = maximum_voice_note;
				updateInstruction(instruction);
				return true;
			}
			else if(event.key == "#") {
				let instruction = getInstruction();
				if(instruction.note === undefined
				   || instruction.note === null
				   || instruction.note === false) return false;
				++instruction.note;
				if(instruction.note > maximum_voice_note) instruction.note = maximum_voice_note;
				updateInstruction(instruction);
				return true;
			}
		}
		if(event.key == ".") {
			let instruction = getInstruction();
			instruction.note = false;
			updateInstruction(instruction);
			return true;
		}
		else if(event.key == "\\") {
			let instruction = getInstruction();
			instruction.note = null;
			updateInstruction(instruction);
			return true;
		}
	},
	'instrument_high':function(event){
		let digit = filterHexDigitKey(event);
		if(digit !== false) {
			let instruction = getInstruction();
			if(instruction.instrument === undefined) instruction.instrument = digit << 4;
			else instruction.instrument = (instruction.instrument & 0xF) | (digit << 4);
			updateInstruction(instruction);
			return true;
		}
	},
	'instrument_low':function(event){
		let digit = filterHexDigitKey(event);
		if(digit !== false) {
			let instruction = getInstruction();
			if(instruction.instrument === undefined) instruction.instrument = digit;
			else instruction.instrument = (instruction.instrument & 0xF0) | digit;
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
			if(instruction.fx == undefined) instruction.fx = [];
			while(instruction.fx.length < effectIndex) instruction.fx.push(null);
			if(instruction.fx[effectIndex] == undefined) instruction.fx[effectIndex] = {value:0};
			instruction.fx[effectIndex].type = letter_to_effect_name[uppercase];
			updateInstruction(instruction);
			return true;
		}
	};
	keyFilterMap["fx"+n+"_high"] = function(event){
		let digit = filterHexDigitKey(event);
		if(digit !== false) {
			let instruction = getInstruction();
			if(instruction.fx == undefined || instruction.fx[effectIndex] == undefined) return false;
			instruction.fx[effectIndex].value = (instruction.fx[effectIndex].value & 0xF) | (digit << 4)
			updateInstruction(instruction);
			return true;
		}
	};
	keyFilterMap["fx"+n+"_low"] = function(event){
		let digit = filterHexDigitKey(event);
		if(digit !== false) {
			let instruction = getInstruction();
			if(instruction.fx == undefined || instruction.fx[effectIndex] == undefined) return false;
			instruction.fx[effectIndex].value = (instruction.fx[effectIndex].value & 0xF0) | digit;
			updateInstruction(instruction);
			return true;
		}
	};
}

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
					let patternRows = patterns[channelIndex][channelOrderIndex];
					for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
						let instruction = patternRows[rowIndex];
						if(!rows[rowIndex]){
							rows[rowIndex] = [];
						}
						rows[rowIndex][channelIndex] = instruction;
					}
				});
				return rows;
			}
		},
		methods: {
			formatByte: formatByte,
			toggleChannel: function (channelIndex) {
				let activeChannels = this.editorState.activeChannels;
				let alreadyThere = activeChannels.indexOf(channelIndex) !== -1;
				if(alreadyThere){
					arrayRemove(activeChannels, channelIndex);
				} else {
					activeChannels.push(channelIndex);
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
					// The filter handled the
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
								:activeChannels="editorState.activeChannels"
								:toggleChannel="toggleChannel"
								/>
						</th>
					</thead>
					<tbody>
						<tr
							v-for="(row, rowIndex) in tableRows"
							>
							<th>row {{formatByte(rowIndex)}}</th>
							<td v-for="(instruction, channelIndex) in row">
								<instruction-editor
									:isNoise="channels[channelIndex].isNoise"
									:instruction="instruction"
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
						.pattern-editor table tr:nth-child(0n+${editorState.activeRowIndex + 1}){
							background-color: #226;
						}
						.pattern-editor table
						tr:nth-of-type(0n+${editorState.activeRowIndex + 1})
						td:nth-of-type(0n+${editorState.activeChannelIndex + 1})
						.entry.${editorState.activeProperty}{
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

Vue.component(
	'channel',
	{
		props: {
			channel: Channel,
			index: Number,
			activeChannels: Array,
			toggleChannel: Function
		},
		template: `
			<button
				:class="{active: activeChannels.indexOf(index) !== -1}"
				@click="toggleChannel(index)">
				<span class="checkbox"></span>
				<span>{{channel.isNoise ? 'Noise' : ('Voice ' + (index+1))}}</span>
			</button>
		`
	}
);
