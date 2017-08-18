This is a music authoring tool for the fictional "Eiling Technologies Artificial Reality System" using the equally-fictional ET209 Digital Synthesizer chip.

This README is a work in progress.

# Quick Hardware Overview

The ET209 has seven voice channels and one noise channel. Each channel is completely independent of the others; their outputs are mixed together.

## Voice

Each of the seven Voice channel can play a single waveform. Each has full, independent volume control, regardless of what waveforms are playing. Each may be panned in one of four ways: center, left, right, and "boost" (center with double volume).

## Noise

The Noise channel can play either white or "periodic" noise (not both). It has full volume control, but no panning. (It is effectively always panned "boost".)

# Modules

An ARS-tracker document is a Module. A Module contains Instruments and Songs. If you're making music for a game, generally all of the game's music will be contained in one Module, allowing Songs to share Instruments.

## Instruments

An Instrument is defined by one or more Sequences. The timbre of the Instrument is a result of these Sequences being played.

- **Volume** sequence: Usually the most important sequence, this controls how loud the instrument is. 0 is silent, 15 is full volume.
- **Arpeggio** sequence: This sequence controls what relative note is being played. It can be used to tune instruments, or for various effects related to the "chiptune" aesthetic. Range is -128 to 127, but you will start to have serious issues if you venture outside the 114-note range of the ET209.
- **Pitch** sequence: When this sequence is non-zero, a pitch slide is taking place. Range is also -128 to 127. A value of N means to alter pitch by N units per 1/60 second. 1 unit per 1/60 second works out to about 44Hz per second. If you want a vibrato/tremolo effect, every positive element of the Pitch sequence must be balanced by an equal and opposite negative element. (See examples.)
- **Waveform** sequence: This controls the shape of the wave played by this instrument. How it is interpreted depends on whether the instrument is being played in a Voice channel or a Noise channel. Note: ARS-tracker supports complicated Waveform sequences, but `tracklib`'s playback engine only supports one-element Waveform sequences.

A Sequence consists of one or more numbers. Each number represents a 1/60 second slice of time. For example, the sequence:

    15 10 5 0

has a value of 15 for the first 1/60 second, 10 for the second, 5 for the third, then 0 until the next time this sequence is triggered. The sound thus lasts 3/60 (1/20) second.

If the sequence had, instead, been:

    15 10 5

then it would be a value of 5 until the next note on. You almost always want to end a Volume sequence with 0.

Sequences can have loops:

    15 | 10 9 8 / 6 4 2 0

This sequence will start at 15, then loop 10, 9, 8 over and over again until a Note Off, after which the loop will be ignored. `/` must be present for the loop to occur; if `|` is not present, the loop begins at the beginning of the Sequence.

### Voice Waveforms

A description of what each bit of the Voice Waveform does is too complex for this readme, but here are some useful waveforms:

- 4 or 16\*: Square wave. Its sound resembles that of a bell.
- 2: 25% pulse wave. Has a somewhat higher-pitched resonance to it than a square wave, and a bit more "punch".
- 1: 12.5% pulse wave. *Vaguely* similar to a human voice, especially when chorded.
- 32\*: Sawtooth wave. Can sounds like a bowed string instrument, and produces some really interesting, rich overtones when chorded. (Sawtooth waves, carefully filtered, form the basis of many iconic synthesizers.)
- 48\*: Triangle wave. At high pitches, sounds like a woodwind or reed instrument. At lower pitches, can sound like an organ. Fast slides can make it somewhat more percussive. Often needs to be boosted.

\*Denotes a waveform that is inherently "tuned" one octave lower. (Playing C-4, for example, would actually result in a sound pitched at C-3.)

If you want an instrument to always be panned in a given direction, add one of the following values:

- 128: pan left.
- 64: pan right.
- 192: "boost". Low-pitched triangle waves often have this panning, to make up for the fact that they are much quieter than other waveforms. (192 + 48 = 240.)

### Noise Waveforms

There are many fewer useful noise waveforms than voice waveforms:

- 0: White noise, normal pitch
- 85: White noise, 1/2 pitch
- 119: White noise, 1/4 pitch
- 127: White noise, 1/8 pitch
- 128: Periodic noise, normal pitch
- 213: Periodic noise, 1/2 pitch
- 247: Periodic noise, 1/4 pitch
- 255: Periodic noise, 1/8 pitch

### Example Instruments

Many of these examples have very long envelopes. The 8-bit aesthetic does not require such things. Numerous classic 8-bit tunes have envelopes as simple as `| 15 / 0`. Nevertheless, these examples showcase the flexibility of this system.

#### Voice Examples

    Volume: 15 13 | 11 / 9 7 5 3 1 0
	Pitch: | 2 2 -2 -2 -2 -2 2 2 / 0
	Waveform: 16

A sustainable square wave with light vibrato and smooth decay.

	Volume: 15 13 11 10 9 9 8 8 7 7 6 6 6 5 5 5 5 4 4 4 4 4 3 3 3 3 3 3 3 2 2 2 2 2 2 2 2 1 1 1 1 1 1 1 1 0
	Waveform: 4

A higher-pitched square wave with a much longer, smoother decay.

	Volume: 7 7 8 8 9 9 10 10 11 11 11 12 12 13 13 14 14 | 15 / 14 13 12 11 10 9 8 7 5 2 0
	Waveform: 32

A sawtooth wave that swells slowly, then decays quickly when released.

	Volume: 15 13 11 9 6 3 0
	Pitch: -64
	Waveform: 240

Somewhat like a muffled tom drum.

#### Noise Examples

	Volume: 15 13 11 10 9 9 8 8 7 7 6 6 6 5 5 5 5 4 4 4 4 4 3 3 3 3 3 3 3 2 2 2 2 2 2 2 2 1 1 1 1 1 1 1 1 0
	Autoperiod: $2A

A cymbal crash.

	Volume: 8 0
	Autoperiod: $02

A closed hi-hat.
