let noteOff = function( noteNumber ){
	audio.handleKeyOff(noteNumber);
};
let noteOn = function( noteNumber, velocity){
	audio.handleKeyOn(noteNumber);
};
let controller = function( noteNumber, velocity){};
let pitchWheel = function( pitch ){};
let polyPressure = function(noteNumber,velocity){};
