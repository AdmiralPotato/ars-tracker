"use strict";

Vue.component(
	'instrument-list',
	{
		props: {
			activeInstrument: Instrument,
			change: Function
		},
		data: function () {
			return {
				instruments: instruments
			};
		},
		methods: {
			addInstrument: function () {
				instruments.push(new Instrument());
			},
			deleteInstrument: function () {
				arrayRemove(instruments, this.activeInstrument);
			}
		},
		template: `
			<div class="instrument-list">
				<ul class="tab-list noSelect">
					<li
						v-for="(item, index) in instruments"
						:class="{active: item === activeInstrument}"
						>
						<a @click="change(index)">{{index}}:{{item.name}}</a>
					</li>
				</ul>
				<ul class="tab-list noSelect">
					<li><a @click="addInstrument">Add</a></li>
					<li><a @click="deleteInstrument">Delete</a></li>
				</ul>
			</div>
		`
	}
);

Vue.component(
	'instrument-editor',
	{
		props: {
			activeInstrument: Instrument
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
		methods: {
			changeTab: function(sequenceDescription){
				this.activeSequenceDescription = sequenceDescription;
				this.activeSequence = this.activeInstrument[this.activeSequenceDescription.name];
			}
		},
		template: `
			<div class="instrument-editor">
				<form>
					<input type="text" size="60" v-model="activeInstrument.name" />
				</form>
				<ul class="tab-list noSelect">
					<li v-for="item in tabs" :class="{active: activeSequenceDescription.name === item.name}"><a @click="changeTab(item)">{{item.name}}</a></li>
				</ul>
				<instrument-sequence
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
