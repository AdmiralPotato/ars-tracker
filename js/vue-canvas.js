"use strict";

Vue.component(
	'vue-canvas',
	{
		data: function () {
			return {
				width: 0,
				height: 0,
			};
		},
		props: {
			serialize: Function,
			update: Function
		},
		created: function(){
			let t = this;
			t.serializeWrap = function(){
				return '' + t.serialize() + t.width + 'x' + t.height;
			};
			t.updateIfDirty = function(time){
				if(t.go){
					requestAnimationFrame(t.updateIfDirty);
				}
				let serialized = t.serializeWrap();
				if(t.lastSerializedValue !== serialized){
					console.log('rendering');
					t.update(t.context, t.width, t.height, time);
					t.lastSerializedValue = serialized;
				}
			};
			t.resizeWindowEventHandler = function () {
				let ratio = window.devicePixelRatio || 1;
				t.width = t.canvas.clientWidth * ratio;
				t.height = t.canvas.clientHeight * ratio;
				requestAnimationFrame(t.updateIfDirty);
			};
		},
		mounted: function () {
			let t = this;
			t.canvas = t.$el;
			t.context = t.canvas.getContext('2d');
			t.go = true;
			window.requestAnimationFrame(t.resizeWindowEventHandler);
			t.resizeWindowEventHandler();
		},
		beforeMount: function () {
			let t = this;
			document.addEventListener('resize', t.resizeWindowEventHandler);
			window.addEventListener('resize', t.resizeWindowEventHandler);
		},
		beforeDestroy: function () {
			let t = this;
			t.go = false;
			document.removeEventListener('resize', t.resizeWindowEventHandler);
			window.removeEventListener('resize', t.resizeWindowEventHandler);
		},
		template: `
            <canvas
                class="vue-canvas"
                :width="width"
                :height="height"
                />
        `
	}
);
