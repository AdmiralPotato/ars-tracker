/*

  The logic in this file is refactored out of js/midi.js from:

  <https://github.com/cwilso/midi-synth/>

  It's not clear whether this file represents a derivative work in the legal
  sense, but here is the copyright notice from the original file anyway:

  Copyright (c) 2014 Chris Wilson

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

*/

{
	let midiBox = document.getElementById("midiBox");
	let midiSelect = document.getElementById("midiSelect");
	let MIDI = null, inport = null;
	let handleMIDIMessage = function(evt) {
		let unhandledMessageType = null;
		// evt.data[0] will always be a Status byte, which means its high bit will always be set
		switch(evt.data[0] >> 4) {
		case 0x8: // Note On
			app.handleMIDINoteOff(evt.data[1], evt.data[2], evt.data[0] & 15);
			return;
		case 0x9: // Note Off
			if(evt.data[2] == 0) // velocity = 0 -> note off
				app.handleMIDINoteOff(evt.data[1], evt.data[2], evt.data[0] & 15);
			else
				app.handleMIDINoteOn(evt.data[1], evt.data[2], evt.data[0] & 15);
			return;
		case 0xA: // Poly Key Pressure
			app.handleMIDIPolyPressure(evt.data[1], evt.data[2], evt.data[0] & 15);
			return;
		case 0xB: // Controller Change
			unhandledMessageType = "Controller Change";
			// 120-127 are Channel Mode messages
			switch(evt.data[1]) {
			case 120: // All Sound Off:
				app.handleMIDIAllSoundOff(evt.data[0] & 15);
				return;
			case 121: // Reset All Controllers
				unhandledMessageType = "Reset All Controllers";
				break;
			case 122: // Local Control
				unhandledMessageType = "Local Control";
				break;
			case 123: // All Notes Off
				// (the below messages also imply All Notes Off)
			case 124: // Omni Off
			case 125: // Omni On
			case 126: // Mono On
			case 127: // Poly On
				app.handleMIDIAllNotesOff(evt.data[0] & 15);
				return;
			}
			break;
		case 0xC: // Program Change
			app.handleMIDIProgramChange(evt.data[1], evt.data[0] & 15);
			return;
		case 0xD: // Channel Pressure
			app.handleMIDIChannelPressure(evt.data[1], evt.data[0] & 15);
			return;
		case 0xE: // Pitch Bend
			app.handleMIDIPitchBend((evt.data[1] | (evt.data[2] << 7)) - 8192, evt.data[0] & 15);
			return;
		case 0xF: // System Common/Exclusive/Real Time messages
			switch(evt.data[0]) {
			case 0xF0: // System Exclusive (TODO: how do these work with web MIDI?)
				unhandledMessageType = "System Exclusive";
				break;
			// System Common
			case 0xF1: // MIDI Time Code Quarter Frame
				unhandledMessageType = "MIDI Time Code Quarter Frame";
				break;
			case 0xF2: // Song Position Pointer
				app.handleMIDISongPosition(evt.data[1] | (evt.data[2] << 7));
				return;
			case 0xF3: // Song Select
				app.handleMIDISongSelect(evt.data[1]);
				return;
			case 0xF4: // undefined
				break;
			case 0xF5: // undefined
				break;
			case 0xF6: // Tune Request
				unhandledMessageType = "Tune Request";
				break;
			case 0xF7: // EOX
				unhandledMessageType = "EOX";
				break;
			// System Real Time
			case 0xF8: // Timing Clock
				app.handleMIDITimingClock();
				return;
			case 0xF9: // undefined
				break;
			case 0xFA: // Start
				app.handleMIDIStart();
				return;
			case 0xFB: // Continue
				app.handleMIDIContinue();
				return;
			case 0xFC: // Stop
				app.handleMIDIStop();
				return;
			case 0xFD: // undefined
				break;
			case 0xFE: // Active Sensing
				return; // IGNORE
			case 0xFF: // System Reset
				app.handleMIDIReset();
				return;
			}
		}
		if(unhandledMessageType == null) {
			unhandledMessageType = evt.data[0].toString(16).toUpperCase()+"H (undefined)";
		}
		console.warn("Unhandled MIDI message: "+unhandledMessageType, evt.data);
	};
	let switchPort = function(target) {
		if(inport == target) return;
		if(inport) {
			inport.onmidimessage = null;
			inport = null;
		}
		inport = target;
		if(inport) {
			inport.onmidimessage = handleMIDIMessage;
			console.info("Selected MIDI input: "+inport.name);
		}
	}
	let midiSelectDidChange = function() {
		let target = MIDI.inputs.get(midiSelect.value);
		switchPort(target);
	};
	let populateMIDISelect = function(e) {
		// Clear the list
		midiSelect.options.length = 0;
		if(inport && inport.state == "disconnected") {
			// We lost the connection to our chosen input, so we can't keep it
			inport = null;
		}
		let inputs = MIDI.inputs.values();
		let target = inport;
		for(let it = inputs.next(); it && !it.done; it = inputs.next()) {
			let port = it.value;
			if(target == null) {
				target = port;
			}
			let option = new Option(port.name, port.id, target == port, target == port);
			midiSelect.appendChild(option);
		}
		if(target) {
			switchPort(target);
		}
	};
	if(navigator.requestMIDIAccess) {
		navigator.requestMIDIAccess().then(
			function(newMIDI) {
				MIDI = newMIDI;
				MIDI.onstatechange = populateMIDISelect;
				populateMIDISelect();
				midiSelect.onchange = midiSelectDidChange;
				midiSelectDidChange();
				midiBox.style.display = 'block';
			},
			function(whynot) {
				console.error("Could not get MIDI access", whynot);
				midiBox.remove();
			}
		);
	}
	else {
		console.warn("Your browser does not support Web MIDI. MIDI input will not be available.");
		midiBox.remove();
	}
}
