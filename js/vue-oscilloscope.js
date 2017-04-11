"use strict";

Vue.component(
	'vue-oscilloscope',
	{
		props: {
			analyser: AnalyserNode
		},
		created: function () {
			let t = this;
			let oscilloscope = new Oscilloscope(t.analyser);
			t.serialize = function(){
				t.analyser.getByteTimeDomainData(oscilloscope.data);
				return JSON.stringify(oscilloscope.data);
			};
			t.update = function(context, width, height, time){
				oscilloscope.width = width;
				oscilloscope.height = height;
				oscilloscope.draw(context);
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
