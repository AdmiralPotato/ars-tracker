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
						<th v-for="(item, index) in channels">
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
							:class="{active: rowIndex === activeRowIndex}"
							>
							<th @click="activateRow(rowIndex)">rowIndex {{rowIndex}}</th>
							<td v-for="(instruction, channelIndex) in row">
								<instruction-editor v-if="instruction" :instruction="instruction" />
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
			<div class="channel">
				<ul class="tab-list noSelect">
					<li :class="\{active: activeChannels.indexOf(index) !== -1}">
						<a @click="toggleChannel(index)">
							<span class="checkbox"></span>
							<span>{{index}}:{{channel.isNoise ? 'noise' : 'voice'}}:{{channel.displayVolume}}</span>
						</a>
					</li>
				</ul>
			</div>
		`
	}
);

Vue.component(
	'instruction-editor',
	{
		props: {
			instruction: Object
		},
		template: `
			<div class="instruction-editor">
				<input type="text" v-model.number="instruction.note" size="2" />
				<input type="text" v-model.number="instruction.instrument" size="2" />
				<input type="text" v-model.number="instruction.volume" size="2" />
			</div>
		`
	}
);
