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
			offHandler: Function
		},
		methods: {
			serialize: function(){
				return `${this.name} ${this.octave} : ${this.octave * 12 + this.index}`;
			},
			on: function () {
				this.holding = true;
				console.log('on');
			},
			off: function () {
				this.holding = false;
				console.log('off');
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
					:onHandler="onHandler"
					:offHandler="offHandler"
					:holding="holding"
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
			offHandler: Function
		},
		created: function(){
			this.keys = keys;
		},
		template: `
			<div class="keyboard-octave">
				<svg viewBox="0 0 161 120">
					<keyboard-key-white
						v-for="(key, index) in keys.white"
						:x="23 * index"
						:name="keys.data[key].name"
						:index="keys.data[key].index"
						:octave="octave"
						:holding="holding"
						:onHandler="onHandler"
						:offHandler="offHandler"
						/>
					<keyboard-key-black
						v-for="key in keys.black"
						:x="keys.data[key].x"
						:name="keys.data[key].name"
						:index="keys.data[key].index"
						:octave="octave"
						:holding="holding"
						:onHandler="onHandler"
						:offHandler="offHandler"
						/>
				</svg>
			</div>
		`
	}
);


let mixinKeyboardKeyProps = {
	props: {
		offHandler: Function,
		onHandler: Function,
		holding: Boolean,
		octave: Number,
		index: Number,
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
				:name="name"
				:index="index"
				:octave="octave"
				:holding="holding"
				:onHandler="onHandler"
				:offHandler="offHandler"
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
				:name="name"
				:index="index"
				:octave="octave"
				:holding="holding"
				:onHandler="onHandler"
				:offHandler="offHandler"
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
		data: function(){
			return {
				active: false
			};
		},
		methods: {
			absoluteIndex: function(){
				return this.octave * 12 + this.index;
			},
			serialize: function(){
				return `${this.name} ${this.octave}`;
			},
			on: function (event) {
				if(this.holding || event.type === 'mousedown' ) {
					console.log(this.serialize() + ' on');
					this.active = true;
					if(this.onHandler){
						this.onHandler(this.absoluteIndex());
					}
				}
			},
			off: function () {
				if(this.holding){
					console.log(this.serialize() + ' off');
					this.active = false;
					if(this.offHandler){
						this.offHandler(this.absoluteIndex());
					}
				}
			}
		},
		template: `
			<rect
				class="keyboard-key noSelect"
				:class="{active: active}"
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
