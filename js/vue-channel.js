"use strict";

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
							<th @click="activateOrder(orderIndex)">order {{orderIndex}}</th>
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

Vue.component(
	'pattern-editor',
	{
		props: {
			channels: Array,
			activeChannels: Array,
			toggleChannel: Function,
			activeOrder: Array,
			activeRowIndex: Number,
			activateRow: Function,
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
		template: `
			<div class="pattern-editor">
				<table>
					<thead>
						<th>channels</th>
						<th
							class="channel"
							v-for="(item, index) in channels"
						>
							<channel
								:channel="item"
								:index="index"
								:activeChannels="activeChannels"
								:toggleChannel="toggleChannel"
								/>
						</th>
					</thead>
					<tbody>
						<tr
							v-for="(row, rowIndex) in tableRows"
							@click="activateRow(rowIndex)"
							:class="{active: rowIndex === activeRowIndex}"
							>
							<th>rowIndex {{rowIndex}}</th>
							<td v-for="(instruction, channelIndex) in row">
								<instruction-editor
									:isNoise="channels[channelIndex].isNoise"
									:instruction="instruction"
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
			activeChannels: Array,
			toggleChannel: Function
		},
		template: `
			<button
				:class="{active: activeChannels.indexOf(index) !== -1}"
				@click="toggleChannel(index)">
				<span class="checkbox"></span>
				<span>{{index}}:{{channel.isNoise ? 'noise' : 'voice'}}:{{channel.displayVolume}}</span>
			</button>
		`
	}
);

let templatePad = function (n, padTemplate) {
	let str = (n).toString();
	return (padTemplate + str).substring(str.length);
};
let note_value_names = ["C·","C#","D·","D#","E·","F·","F#","G·","G#","A·","A#","B·"];
let octave_names = ["Z","0","1","2","3","4","5","6","7","8"];
function note_value_for_display(value) {
	if(value === false) return "OFF";
	else if(value === null) return "CUT";
	else if(value !== undefined) { return note_value_names[value%12]+octave_names[Math.floor(value/12)]; }
	else return "···";
}
function noise_value_for_display(value) {
	if(value === false) return "OFF";
	else if(value === null) return "CUT";
	else if(value !== undefined) { return templatePad(value.toString(16).toLocaleUpperCase(), '00'); }
	else return "··";
}

Vue.component(
	'instruction-editor',
	{
		props: {
			isNoise: Boolean,
			instruction: Object
		},
		computed: {
			note: function () {
				let converter = this.isNoise ? noise_value_for_display : note_value_for_display;
				return this.passthrough('note', '···', converter);
			},
			instrument: function () {
				return this.passthrough('instrument', '··');
			},
			volume: function () {
				return this.passthrough('volume', '·');
			},
			effect: function () {
				return 'NYET';
			},
		},
		methods: {
			passthrough: function (propertyName, displayForEmpty, converter) {
				return this.instruction && this.instruction[propertyName] ? converter ? converter(this.instruction[propertyName]) : this.instruction[propertyName] : displayForEmpty;
			}
		},
		template: `
			<div class="instruction-editor">
				<span class="entry" :class="isNoise ? 'c2' : 'c3'">{{note}}</span>
				<span class="entry c2">{{instrument}}</span>
				<span class="entry c1">{{volume}}</span>
				<span class="entry c3">{{effect}}</span>
			</div>
		`
	}
);
