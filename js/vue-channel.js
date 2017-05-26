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
			rows: function () {
				let rows = [];
				let patterns = this.patterns;
				this.orders.forEach(function (order, rowIndex) {
					order.forEach(function (channelPatternIndex, channelIndex) {
						if(!rows[rowIndex]){
							rows[rowIndex] = [];
						}
						rows[rowIndex][channelIndex] = channelPatternIndex;
					});
				});
				return rows;
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
							v-for="(row, orderIndex) in rows"
							:class="{active: activeOrderIndex === orderIndex}"
							>
							<th @click="activateOrder(orderIndex)">order {{orderIndex}}</th>
							<td v-for="(columnValue, columnIndex) in row">
								<input type="text" v-model.number="orders[orderIndex][columnIndex]" size="2" />
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
			patterns: Array
		},
		computed: {
			rows: function () {
				let rows = [];
				let patterns = this.patterns;
				let activeOrder = this.activeOrder;
				activeOrder.forEach(function (channelPatternIndex, channelIndex) {
					let channelPatternRows = patterns[channelIndex][channelPatternIndex];
					channelPatternRows.forEach(function (channelRowObject, rowIndex) {
						if(!rows[rowIndex]){
							rows[rowIndex] = [];
						}
						rows[rowIndex][channelIndex] = channelRowObject;
					});
				});
				return rows;
			}
		},
		template: `
			<div class="order-editor">
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
						<tr v-for="(row, rowIndex) in rows">
							<th>rowIndex {{rowIndex}}</th>
							<td v-for="(channelRowObject, channelIndex) in row">
								<channel-row-editor :row="channelRowObject" />
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
	'channel-row-editor',
	{
		props: {
			row: Object
		},
		template: `
			<div class="channel-row-editor">
				<input type="text" v-model.number="row.note" size="2" />
				<input type="text" v-model.number="row.instrument" size="2" />
				<input type="text" v-model.number="row.volume" size="2" />
			</div>
		`
	}
);
