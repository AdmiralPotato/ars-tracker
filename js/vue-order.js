"use strict";

let makeNewOrder = function(song, fresh) {
	let newOrder = [0,0,0,0,0,0,0,0];
	if(fresh) {
		song.orders.forEach(function(order) {
			for(let i = 0; i < channels.length; ++i) {
				newOrder[i] = Math.max(newOrder[i], order[i]+1);
			}
		});
	}
	return newOrder;
};

Vue.component(
	'order-editor-cell',
	{
		props: {
			orders: Array,
			orderIndex: Number,
			columnIndex: Number
		},
		methods: {
			updateValue: function(target, hard) {
				try {
					if(!target.value.match(/^ *\-?[0-9]+ *$/)) {
						throw "number format is bad";
					}
					let value = parseInt(target.value);
					if(isNaN(value)) {
						throw "number format is bad";
					}
					else if(value < 0) {
						value = 0;
						target.value = "0";
					}
					else if(value > 4095) {
						// there is no way to fit more than 4096 pattern references in the same bank
						value = 4095;
						target.value = "4095";
					}
					this.orders[this.orderIndex].splice(this.columnIndex, 1, value);
					if(hard) {
						target.placeholder = value;
					}
				}
				catch(e) {
					if(hard) {
						target.value = this.orders[this.orderIndex][this.columnIndex];
					}
				}
			},
		},
		template: `
			<td>
			<input
				class="order-cell"
				type="number"
				:value="orders[orderIndex][columnIndex]"
				:placeholder="orders[orderIndex][columnIndex]"
				@change="updateValue($event.target, true)"
				@blur="updateValue($event.target, true)"
				@input="updateValue($event.target, false)"
			/>
			</td>
		`
	}
);

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
			},
			activeSong: function () {
				return app.projectState.songs[app.editorState.activeSongIndex];
			}
		},
		methods: {
			formatByte: formatByte,
			insertOrderBefore: function(fresh) {
				let activeSong = this.activeSong;
				activeSong.orders.splice(app.editorState.activeOrderIndex, 0, makeNewOrder(activeSong, fresh));
				++app.editorState.activeOrderIndex;
			},
			duplicateOrder: function() {
				let activeSong = this.activeSong;
				activeSong.orders.splice(app.editorState.activeOrderIndex, 0, activeSong.orders[app.editorState.activeOrderIndex].slice());
				++app.editorState.activeOrderIndex;
			},
			insertOrderAfter: function(fresh) {
				let activeSong = this.activeSong;
				activeSong.orders.splice(app.editorState.activeOrderIndex+1, 0, makeNewOrder(activeSong, fresh));
				++app.editorState.activeOrderIndex;
			},
			deleteOrder: function() {
				let activeSong = this.activeSong;
				activeSong.orders.splice(app.editorState.activeOrderIndex, 1);
				if(app.editorState.activeOrderIndex >= activeSong.orders.length) {
					--app.editorState.activeOrderIndex;
				}
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
							<th @click="activateOrder(orderIndex)">order {{formatByte(orderIndex)}}</th>
								<order-editor-cell :orders="orders" :orderIndex="orderIndex" :columnIndex="0" />
								<order-editor-cell :orders="orders" :orderIndex="orderIndex" :columnIndex="1" />
								<order-editor-cell :orders="orders" :orderIndex="orderIndex" :columnIndex="2" />
								<order-editor-cell :orders="orders" :orderIndex="orderIndex" :columnIndex="3" />
								<order-editor-cell :orders="orders" :orderIndex="orderIndex" :columnIndex="4" />
								<order-editor-cell :orders="orders" :orderIndex="orderIndex" :columnIndex="5" />
								<order-editor-cell :orders="orders" :orderIndex="orderIndex" :columnIndex="6" />
								<order-editor-cell :orders="orders" :orderIndex="orderIndex" :columnIndex="7" />
							</td>
						</tr>
					</tbody>
				</table>
				<ul class="tab-list">
					<li class="noSelect buttons">
						<button @click="insertOrderBefore(false)">
							Insert Zero Order Before
						</button>
					</li>
					<li class="noSelect buttons">
						<button @click="insertOrderBefore(true)">
							Insert Fresh Order Before
						</button>
					</li>
					<li class="noSelect buttons">
						<button @click="duplicateOrder()">
							Duplicate Order
						</button>
					</li>
					<li class="noSelect buttons">
						<button @click="insertOrderAfter(false)">
							Insert Zero Order After
						</button>
					</li>
					<li class="noSelect buttons">
						<button @click="insertOrderAfter(true)">
							Insert Fresh Order After
						</button>
					</li>
					<li class="noSelect buttons">
						<button @click="deleteOrder()"
							:disabled="orders.length <= 1"
							>
							Delete Order
						</button>
					</li>
				</ul>
			</div>
		`
	}
);
