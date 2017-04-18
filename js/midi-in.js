let noteOff = function( noteNumber ){
	app.handleKeyOff(noteNumber);
};
let noteOn = function( noteNumber, velocity){
	app.handleKeyOn(noteNumber);
};
let controller = function( noteNumber, velocity){};
let pitchWheel = function( pitch ){};
let polyPressure = function(noteNumber,velocity){};
