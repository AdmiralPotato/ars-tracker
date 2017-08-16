"use strict";

let Oscilloscope = function() {
}

Oscilloscope.prototype = {
	_drawData: function(context, width, height, data, count) {
		if(data == null) return;
		context.beginPath();
		context.moveTo(0, data[0]*height*-2+height*0.5);
		for(var x = 1; x < count; ++x) {
			context.lineTo(x*width/count, data[x]*height*-2+height*0.5);
		}
		context.stroke();
	},
	draw: function(context, width, height, count) {
		context.lineCap = "round";
		context.globalCompositeOperation = 'source-over';
		context.clearRect(0, 0, width, height);
		context.strokeStyle = '#999';
		context.setLineDash([]);
		context.lineWidth = 1;
		context.beginPath();
		context.moveTo(0, height/2);
		context.lineTo(width, height/2);
		context.stroke();
		context.setLineDash([10, 10]);
		context.strokeStyle = '#666';
		context.beginPath();
		for(let y = 1; y < 4; y += 2) {
			context.moveTo(0, height*y/4);
			context.lineTo(width, height*y/4);
		}
		context.stroke();
		context.setLineDash([]);
		context.lineWidth = 3.5;
		context.globalCompositeOperation = 'lighter';
		if(audio.lastRightArray == null) {
			context.strokeStyle = '#FD0';
			this._drawData(context, width, height, audio.lastLeftArray, count);
		}
		else {
			context.strokeStyle = '#F00';
			this._drawData(context, width, height, audio.lastLeftArray, count);
			context.strokeStyle = '#0D0';
			this._drawData(context, width, height, audio.lastRightArray, count);
		}
	},
}
