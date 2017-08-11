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
	'instrument',
	'volume',
	'fx0',
];
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
				this.$forceUpdate();
			},
			moveUp:    function(e){this.moveCursorRelative(e,  0, -1);},
			moveDown:  function(e){this.moveCursorRelative(e,  0,  1);},
			moveLeft:  function(e){this.moveCursorRelative(e, -1,  0);},
			moveRight: function(e){this.moveCursorRelative(e,  1,  0);},
			moveCursorRelative: function (keydownEvent, x, y) {
				//console.log(arguments);
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
			wrapRange: function(n, max){
				return (n + max) % max;
			},
			getActiveStateByRowAndChannel(rowIndex, channelIndex){
				return this.editorState.activeRowIndex === rowIndex && this.editorState.activeChannelIndex === channelIndex;
			}
		},
		template: `
			<div
				class="pattern-editor"
				tabindex="0"
				@keydown.up="moveUp"
				@keydown.down="moveDown"
				@keydown.left="moveLeft"
				@keydown.right="moveRight"
			>
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
							@click="editorState.activeRowIndex = rowIndex"
							:class="{active: editorState.activeRowIndex === rowIndex}"
							>
							<th>row {{formatByte(rowIndex)}}</th>
							<td v-for="(instruction, channelIndex) in row">
								<instruction-editor
									:isActive="getActiveStateByRowAndChannel(rowIndex, channelIndex)"
									:activeProperty="editorState.activeProperty"
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
				<span>{{channel.isNoise ? 'Noise' : ('Voice ' + (index+1))}}:{{channel.displayVolume&127}}</span>
			</button>
		`
	}
);
