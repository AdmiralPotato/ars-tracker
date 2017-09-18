"use strict";

Vue.component(
	'instrument-list',
	{
		props: {
			activeInstrumentIndex: Number,
			change: Function,
			instruments: Array
		},
		methods: {
			addInstrument: function () {
				app.projectState.instruments.push(new Instrument());
			},
			deleteInstrument: function () {
				arrayRemove(app.projectState.instruments, this.activeInstrument);
			}
		},
		template: `
			<div class="instrument-list">
				<ul class="tab-list noSelect">
					<li v-for="(item, index) in instruments">
						<button
							@click="change(index)"
							:class="{active: index === activeInstrumentIndex}"
						>{{index}}:{{item.name}}</button>
					</li>
				</ul>
				<ul class="tab-list noSelect">
					<li><button @click="addInstrument">Add</button></li>
					<li><button @click="deleteInstrument">Delete</button></li>
				</ul>
			</div>
		`
	}
);

Vue.component(
	'instrument-editor',
	{
		props: {
			activeInstrumentIndex: Number
		},
		data: function () {
			return {
				activeSequenceDescription: Instrument.sequences[0]
			}
		},
		created: function () {
			this.tabs = Instrument.sequences;
			this.changeTab(this.activeSequenceDescription);
		},
		beforeUpdate: function () {
			this.activeSequence = this.activeInstrument[this.activeSequenceDescription.name];
		},
		computed: {
			activeInstrument: function(){
				return app.projectState.instruments[this.activeInstrumentIndex];
			}
		},
		methods: {
			changeTab: function(sequenceDescription){
				this.activeSequenceDescription = sequenceDescription;
				this.activeSequence = this.activeInstrument[this.activeSequenceDescription.name];
			},
			noSubmit: function(submitEvent){
				submitEvent.preventDefault();
			},
			formatPeriod: function(period) {
				if(period == null) {
					return "$--"
				}
				else {
					let formatted = period.toString(16).toUpperCase();
					if(formatted.length == 1) {
						formatted = "0" + formatted;
					}
					formatted = "$" + formatted;
					return formatted;
				}
			},
			updateAutoperiod: function(target, hard) {
				try {
					let value = target.value;
					if(value[0] === "$") {
						value = value.substr(1); // cut off the dollar sign
					}
					if(value == "" || value.match(/ *\-+ */)) {
						// an empty value, or a value containing only '-'s, means no autoperiod
						value = null;
					}
					else {
						value = parseInt(value, 16);
						if(isNaN(value)) {
							throw "number format is bad";
						}
						else if(value < 0) {
							value = 0;
							target.value = "$00";
						}
						else if(value > 255) {
							value = 255;
							target.value = "$FF";
						}
					}
					if(hard) {
						this.activeInstrument.autoperiod = value;
						target.placeholder = this.formatPeriod(value);
						if(value !== null) {
							app.autoChangeNoisePeriods(this.activeInstrumentIndex, value);
						}
					}
				}
				catch(e) {
					if(hard) {
						target.value = this.formatPeriod(this.activeInstrument.autoperiod);
					}
				}
			},
		},
		template: `
			<div class="instrument-editor">
				<ul class="tab-list">
					<li>
						Name:
						<form @submit="noSubmit">
							<input type="text" size="40" v-model="activeInstrument.name" />
						</form>
					</li>
					<li class="noSelect buttons">
						<instrument-type-selector :instrument="activeInstrument" name="voice" />
						<instrument-type-selector :instrument="activeInstrument" name="noise" />
					</li>
					<li v-if="activeInstrument.type === 'noise'">
						Always play at pitch:
						<input type="text" size="3" placeholder="$--"
							:value="formatPeriod(activeInstrument.autoperiod)"
							@change="updateAutoperiod($event.target, true)"
							@blur="updateAutoperiod($event.target, true)"
							@input="updateAutoperiod($event.target, false)"
						/>
					</li>
				</ul>
				<ul class="tab-list noSelect">
					<li v-for="item in tabs">
						<button
							@click="changeTab(item)"
							:class="{active: activeSequenceDescription.name === item.name}"
						>{{item.name}}</button>
					</li>
				</ul>
				<waveform-editor
					v-if="activeSequenceDescription.name === 'waveform'"
					:activeInstrument="activeInstrument"
					/>
				<instrument-sequence
					v-if="activeSequenceDescription.name !== 'waveform'"
					:name="activeSequenceDescription.name"
					:min="activeSequenceDescription.min"
					:max="activeSequenceDescription.max"
					:sequence="activeSequence"
					:key="activeSequenceDescription.name"
					/>
			</div>
		`
	}
);

Vue.component(
	'instrument-sequence',
	{
		props: {
			name: String,
			min: Number,
			max: Number,
			sequence: Sequence
		},
		data: function(){
			return {
				sequenceString: '',
				dirty: false
			};
		},
		created: function () {
			this.getStringFromSequence();
		},
		methods: {
			reparseSequence: function (submitEvent) {
				submitEvent.preventDefault();
				this.sequence.parse(this.sequenceString);
				this.getStringFromSequence();
				this.forceDirtyCheck();
			},
			getStringFromSequence: function () {
				this.sequenceString = this.sequence.string;
			},
			forceDirtyCheck: function() {
				this.dirty = this.sequenceString !== this.sequence.string;
			}
		},
		computed: {
		},
		template: `
			<div class="instrument-sequence">
				<div class="svg-holder">
					<svg viewBox="0 0 24 6">
						<g transform="translate(0 6) scale(1 -1) ">
							<rect v-for="(value, index) in sequence.values"
								:x="index + 0.1"
								y="0.1"
								width="0.8"
								:height="((min - value) / (min - max)) * 5.8"
								/>
						</g>
					</svg>
				</div>
				<form v-on:submit="reparseSequence">
					<input type="text" size="60" v-model="sequenceString" v-on:input="forceDirtyCheck" />
					<span v-if="dirty">*</span>
				</form>
			</div>
		`
	}
);

Vue.component(
	'waveform-editor',
	{
		props: {
			activeInstrument: Instrument
		},
		data: function(){
			return {
				advancedMode: this.activeInstrument.waveform.values.length > 1,
				singleValue: this.activeInstrument.waveform.values[0] || 0,
				presetValue: (this.activeInstrument.waveform.values[0] || 0) & 0x3F,
				waveformSequenceDescription: Instrument.sequences[3],
				noiseBits: [
					{value:0x01, name:"Hold first 1/8"},
					{value:0x02, name:"Hold second 1/8"},
					{value:0x04, name:"Hold third 1/8"},
					{value:0x08, name:"Hold fourth 1/8"},
					{value:0x10, name:"Hold fifth 1/8"},
					{value:0x20, name:"Hold sixth 1/8"},
					{value:0x40, name:"Hold seventh 1/8"},
					{value:0x80, name:"Periodic"},
				],
				voiceBits: [
					{value:0x01, name:"Invert 1/8"},
					{value:0x02, name:"Invert 1/4"},
					{value:0x04, name:"Invert 1/2"},
					{value:0x08, name:"Invert all"},
					{value:0x10, name:"Toggle invert every cycle"},
					{value:0x20, name:"Sawtooth output"},
				],
				pans: [
					{value:0x80, name:"Pan Left"},
					{value:0x00, name:"Pan Neutral"},
					{value:0x40, name:"Pan Right"},
					{value:0xC0, name:"Boost"},
				],
				noisePresets: [
					{value:0x00, name:"Full Pitch White"},
					{value:0x55, name:"Half Pitch White"},
					{value:0x77, name:"Quarter Pitch White"},
					{value:0x80, name:"Full Pitch Periodic"},
					{value:0xC5, name:"Half Pitch Periodic"},
					{value:0xF7, name:"Quarter Pitch Periodic"},
				],
				voicePresets: [
					{value:0x01, name:"1/8 pulse (double pitch)"},
					{value:0x02, name:"1/4 pulse (double pitch)"},
					{value:0x04, name:"Square (double pitch)"},
					{value:0x10, name:"Square (normal pitch)"},
					{value:0x20, name:"Sawtooth"},
					{value:0x30, name:"Triangle"},
				],
			};
		},
		methods: {
			toggleWaveformBit: function(bit) {
				// ^ is bitwise exclusive-or
				this.singleValue ^= bit;
				this.presetValue ^= bit;
				this.activeInstrument.waveform.parse(this.singleValue.toString());
			},
			setPanValue: function(pan) {
				if(this.activeInstrument.type === "voice") {
					this.singleValue = (this.singleValue & 0x3F) | pan;
					this.activeInstrument.waveform.parse(this.singleValue.toString());
				}
			},
			doesAnyPresetMatch: function(presets) {
				let ret = false;
				let singleValue = this.singleValue;
				presets.forEach(function(preset) {
					if(preset.value === singleValue) {
						ret = true;
						return true; // break out of the forEach
					}
				});
				return ret;
			},
			updateFromPreset: function(newPreset) {
				this.presetValue = newPreset;
				if(this.presetValue !== undefined && this.presetValue != "") {
					if(this.activeInstrument.type === "voice") {
						this.singleValue = (this.singleValue & 0xC0) | this.presetValue;
					}
					else {
						this.singleValue = this.presetValue | 0;
					}
					this.activeInstrument.waveform.parse(this.singleValue.toString());
				}
			},
		},
		template: `
			<div v-if="!advancedMode" class="instrument-waveform">
				<ul class="tab-list">
					<li class="noSelect buttons">
						<button
							@click="advancedMode = !advancedMode"
							:class="{active: advancedMode}"
							>
							<span class="checkbox"></span>
							Edit Raw Sequence
						</button>
					</li>
				</ul>
				<ul class="tab-list">
					<waveform-bit-checkbox
						v-for="bit in (activeInstrument.type === 'noise' ? noiseBits : voiceBits)"
						:key="bit.value"
						:toggleWaveformBit="toggleWaveformBit"
						:isSet="(singleValue & bit.value) === bit.value"
						:value="bit.value"
						:name="bit.name"
						/>
					<li class="noSelect buttons">
						<waveform-pan-selector
							v-if="activeInstrument.type === 'voice'"
							v-for="(pan, index) in pans"
							:key="index"
							:setPanValue="setPanValue"
							:isSelected="(singleValue & 0xC0) === pan.value"
							:value="pan.value"
							:name="pan.name"
							/>
					</li>
				</ul>
				Preset:
				<select
					@change="updateFromPreset($event.target.value)"
				>
					<option
						disabled
						value=""
						style="display:none"
						:selected="!doesAnyPresetMatch(activeInstrument.type === 'noise' ? noisePresets : voicePresets)"
					>
						(no preset matched)
					</option>
					<option
						v-for="preset in (activeInstrument.type === 'noise' ? noisePresets : voicePresets)"
						:key="preset.value"
						:value="preset.value"
						:selected="presetValue === preset.value"
					>
						{{preset.name}}
					</option>
				</select>
			</div>
			<div v-else class="instrument-waveform">
				<ul class="tab-list">
					<li class="noSelect buttons">
						<button
							@click="advancedMode = !advancedMode"
							:class="{active: advancedMode}"
							>
							<span class="checkbox"></span>
							Edit Raw Sequence
						</button>
					</li>
				</ul>
				<instrument-sequence
					:name="waveformSequenceDescription.name"
					:min="waveformSequenceDescription.min"
					:max="waveformSequenceDescription.max"
					:sequence="activeInstrument.waveform"
					:key="waveformSequenceDescription.name"
					/>
			</div>
		`
	}
);

Vue.component(
	'waveform-bit-checkbox',
	{
		props: {
			toggleWaveformBit: Function,
			isSet: Boolean,
			value: Number,
			name: String,
		},
		template: `
			<li class="noSelect buttons">
				<button
					@click="toggleWaveformBit(value)"
					:class="{active: isSet}"
					>
					<span class="checkbox"></span>
					{{name}}
				</button>
			</li>
		`
	}
);

Vue.component(
	'waveform-pan-selector',
	{
		props: {
			setPanValue: Function,
			isSelected: Boolean,
			value: Number,
			name: String,
		},
		template: `
			<button
				@click="setPanValue(value)"
				:class="{active: isSelected}"
			>
				<span>{{name}}</span>
			</button>
		`
	}
);

Vue.component(
	'instrument-type-selector',
	{
		props: {
			instrument: Instrument,
			name: String,
		},
		template: `
			<button
				@click="instrument.type = name"
				:class="{active: instrument.type === name}"
			>
				<span>{{name}}</span>
			</button>
		`
	}
);
