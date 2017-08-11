"use strict";

Vue.component(
	'vue-oscilloscope',
	{
		props: {
			analyser: AnalyserNode
		},
		created: function () {
			let t = this;
			let oscilloscope = new Oscilloscope();
			t.serialize = function(){
				let ret = [audio.lastLeftArray, audio.lastRightArray];
				return JSON.stringify(ret);
			};
			t.update = function(context, width, height, time){
				oscilloscope.draw(context, width, height, audio.SAMPLES_PER_FRAME);
			};
		},
		template: `
			<div class="vue-oscilloscope">
				<vue-canvas
					:serialize="serialize"
					:update="update"
					/>
			</div>
		`
	}
);
