"use strict";

Vue.component(
	'keyboard',
	{
		data: function(){
			return {
				holding: false
			};
		},
		props: {
			octaves: {
				type: Number,
				default: 3
			},
			onHandler: Function,
			offHandler: Function,
			onKeys: Array
		},
		methods: {
			serialize: function(){
				return `${this.name} ${this.octave} : ${this.octave * 12 + this.fxIndex}`;
			},
			on: function () {
				this.holding = true;
			},
			off: function () {
				this.holding = false;
			}
		},
		template: `
			<div class="keyboard"
				v-on:mousedown="on"
				v-on:mouseup="off"
				v-on:mouseleave="off"
				>
				<keyboard-octave
					v-for="index in octaves"
					:key="index"
					:onHandler="onHandler"
					:offHandler="offHandler"
					:holding="holding"
					:onKeys="onKeys"
					:octave="index"
					/>
			</div>
		`
	}
);

let keys = {
	white: [0,2,4,5,7,9,11],
	black: [1,3,6,8,10],
	data: [
		{name: 'C',  index:0,  x:0},
		{name: 'C#', index:1,  x:14.33333},
		{name: 'D',  index:2,  x:1},
		{name: 'D#', index:3,  x:41.66666},
		{name: 'E',  index:4,  x:2},
		{name: 'F',  index:5,  x:3},
		{name: 'F#', index:6,  x:82.25},
		{name: 'G',  index:7,  x:4},
		{name: 'G#', index:8,  x:108.25},
		{name: 'A',  index:9,  x:5},
		{name: 'A#', index:10, x:134.75},
		{name: 'B',  index:11, x:6}
	]
};

Vue.component(
	'keyboard-octave',
	{
		props: {
			holding: Boolean,
			octave: {
				type: Number,
				default: 0
			},
			onHandler: Function,
			offHandler: Function,
			onKeys: Array
		},
		created: function(){
			this.keys = keys;
		},
		methods: {
			absoluteIndex: function(index){
				return this.octave * 12 + index;
			},
			isOn: function(absoluteIndex){
				return this.onKeys.indexOf(absoluteIndex) !== -1;
			}
		},
		template: `
			<div class="keyboard-octave">
				<svg viewBox="0 0 161 120">
					<keyboard-key-white
						v-for="(key, index) in keys.white"
						:key="keys.data[key].index"
						:x="23 * index"
						:name="keys.data[key].name"
						:index="keys.data[key].index"
						:isOn="isOn(absoluteIndex(keys.data[key].index))"
						:octave="octave"
						:holding="holding"
						:onHandler="onHandler"
						:offHandler="offHandler"
						:absoluteIndex="absoluteIndex(keys.data[key].index)"
						/>
					<keyboard-key-black
						v-for="key in keys.black"
						:key="keys.data[key].index"
						:x="keys.data[key].x"
						:name="keys.data[key].name"
						:isOn="isOn(absoluteIndex(keys.data[key].index))"
						:octave="octave"
						:holding="holding"
						:onHandler="onHandler"
						:offHandler="offHandler"
						:absoluteIndex="absoluteIndex(keys.data[key].index)"
						/>
				</svg>
			</div>
		`
	}
);


let mixinKeyboardKeyProps = {
	props: {
		absoluteIndex: Number,
		offHandler: Function,
		onHandler: Function,
		holding: Boolean,
		octave: Number,
		isOn: Boolean,
		name: String,
		x: Number
	}
};

Vue.component(
	'keyboard-key-white',
	{
		mixins: [mixinKeyboardKeyProps],
		template: `
			<keyboard-key
				:x="x"
				:isOn="isOn"
				:name="name"
				:octave="octave"
				:holding="holding"
				:onHandler="onHandler"
				:offHandler="offHandler"
				:absoluteIndex="absoluteIndex"
				class="keyboard-key-white"
				width="23"
				height="120"
				/>
		`
	}
);

Vue.component(
	'keyboard-key-black',
	{
		mixins: [mixinKeyboardKeyProps],
		template: `
			<keyboard-key
				:x="x"
				:isOn="isOn"
				:name="name"
				:octave="octave"
				:holding="holding"
				:onHandler="onHandler"
				:offHandler="offHandler"
				:absoluteIndex="absoluteIndex"
				class="keyboard-key-black"
				width="13"
				height="80"
				/>
		`
	}
);


Vue.component(
	'keyboard-key',
	{
		mixins: [mixinKeyboardKeyProps],
		props: {
			absoluteIndex: Number,
			isOn: Boolean
		},
		data: function(){
			return {
				active: false
			};
		},
		methods: {
			serialize: function(){
				return `${this.name} ${this.octave}`;
			},
			on: function (event) {
				if(this.holding || event.type === 'mousedown' ) {
					console.log(this.serialize() + ' on');
					this.active = true;
					if(this.onHandler){
						this.onHandler(this.absoluteIndex);
					}
				}
			},
			off: function () {
				if(this.holding){
					console.log(this.serialize() + ' off');
					this.active = false;
					if(this.offHandler){
						this.offHandler(this.absoluteIndex);
					}
				}
			}
		},
		template: `
			<rect
				class="keyboard-key noSelect"
				:class="{active: isOn || active}"
				v-on:mousedown="on"
				v-on:mouseenter="on"
				v-on:mouseup="off"
				v-on:mouseleave="off"
				:x="x"
				y="0"
				/>
		`
	}
);
