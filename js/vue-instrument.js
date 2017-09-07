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
			}
		},
		template: `
			<div class="instrument-editor">
				<form @submit="noSubmit">
					<input type="text" size="60" v-model="activeInstrument.name" />
				</form>
				<ul class="tab-list noSelect">
					<li v-for="item in tabs">
						<button
							@click="changeTab(item)"
							:class="{active: activeSequenceDescription.name === item.name}"
						>{{item.name}}</button>
					</li>
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
