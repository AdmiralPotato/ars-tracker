"use strict";

Vue.component(
	'instrument',
	{
		data: function () {
			return {
				activeSequenceDescription: Instrument.sequences[0]
			}
		},
		props: {
			instrumentIndex: Number
		},
		created: function () {
			this.tabs = Instrument.sequences;
			this.instrument = instruments[this.instrumentIndex];
			this.changeTab(this.activeSequenceDescription);
		},
		methods: {
			changeTab: function(sequenceDescription){
				this.activeSequenceDescription = sequenceDescription;
				this.activeSequence = this.instrument[this.activeSequenceDescription.name];
			}
		},
		template: `
			<div class="instrument">
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
			return {sequenceString: ''};
		},
		created: function () {
			this.sequenceString = this.sequence.string;
		},
		methods: {
			reparseSequence: function (submitEvent) {
				submitEvent.preventDefault();
				this.sequence.parse(this.sequenceString);
			}
		},
		computed: {
			synced: function() {
				return this.sequenceString === this.sequence.string;
			}
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
					<input type="text" size="60" v-model="sequenceString" />
					<span v-if="!synced">*</span>
				</form>
			</div>
		`
	}
);
