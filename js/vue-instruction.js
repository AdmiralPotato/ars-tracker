"use strict";

let note_value_names = ["C-","C#","D-","D#","E-","F-","F#","G-","G#","A-","A#","B-"];
let octave_names = ["Z","0","1","2","3","4","5","6","7","8"];
let effect_name_to_letter = {
	"hwslide":"3",
	"branch":"B",
	"halt":"C",
	"skip":"D",
	"fastness":"F",
	"pan":"P",
	"speed":"S",
	"tempo":"T",
	"waveform":"V",
};
let letter_to_effect_name = {};
for(let name in effect_name_to_letter) {
	letter_to_effect_name[effect_name_to_letter[name]] = name
}
let note_value_for_display = function (value) {
	if(value === 'off') return 'OFF';
	else if(value === 'cut') return 'CUT';
	else if(value !== null) { return note_value_names[value%12]+octave_names[Math.floor(value/12)]; }
	else return '···';
};
let noise_value_for_display = function (value) {
	if(value === 'off') return 'OFF';
	else if(value === 'cut') return 'CUT';
	else if(value !== null) { return '$'+formatByte(value); }
	else return '···';
};

Vue.component(
	'instruction-editor',
	{
		props: {
			isNoise: Boolean,
			instruction: Object,
			isActive: Boolean,
			setActive: Function,
			activeProperty: String
		},
		computed: {
			note: function () {
				let converter = this.isNoise ? noise_value_for_display : note_value_for_display;
				return this.passthrough('note', '···', converter);
			},
			instrument: function () {
				return this.passthrough('instrument', '··', function(i) { return formatByte(i); } );
			},
			volume: function () {
				return this.passthrough('volume', '·', function(i) { return i.toString(16).toLocaleUpperCase(); });
			},
			fx0: function(){
				return this.getFxByIndex(0);
			},
		},
		methods: {
			passthrough: function (propertyName, displayForEmpty, converter) {
				return this.instruction && this.instruction[propertyName] !== null ? converter ? converter(this.instruction[propertyName]) : this.instruction[propertyName] : displayForEmpty;
			},
			getFxByIndex: function (fxIndex) {
				if(this.instruction === undefined || this.instruction.fx === null || !this.instruction.fx[fxIndex]) {
					return '···';
				}
				else {
					let fx = this.instruction.fx[fxIndex];
					return effect_name_to_letter[fx.type] + formatByte(fx.value);
				}
			},
		},
		template: `
			<div class="instruction-editor">
				<span class="property c3">
					<table-input :setActive="setActive" name="note"            :value="note"          />
				</span>
				<span class="property c2">
					<table-input :setActive="setActive" name="instrument_high" :value="instrument[0]" />
					<table-input :setActive="setActive" name="instrument_low"  :value="instrument[1]" />
				</span>
				<span class="property c1">
					<table-input :setActive="setActive" name="volume"          :value="volume"        />
				</span>
				<span class="property c3">
					<table-input :setActive="setActive" name="fx0_type"        :value="fx0[0]"        />
					<table-input :setActive="setActive" name="fx0_high"        :value="fx0[1]"        />
					<table-input :setActive="setActive" name="fx0_low"         :value="fx0[2]"        />
				</span>
			</div>
		`
	}
);

Vue.component(
	'table-input',
	{
		props: {
			name: String,
			value: [String, Number],
			setActive: Function
		},
		methods: {
			click: function () {
				this.setActive(this.name);
			}
		},
		template: `
			<span
				class="entry"
				:class="name"
				@click="click"
				:title="name"
			>{{value}}</span>
		`
	}
);
