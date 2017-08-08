"use strict";

Vue.component(
	'song',
	{
		props: {
			song: Object,
			playbackState: String,
			speakerSetup: String,
			changePlaybackState: Function,
			changeSpeakerSetup: Function
		},
		data: function () {
			return {
				playbackStates: {
					'paused': '⏸&#xFE0E;',
					'playSong': '⏵&#xFE0E;',
					'loopOrder': '🔂&#xFE0E;'
				},
				speakerSetups: {
					'mono': '📻&#xFE0E;',
					'stereo': '🔊&#xFE0E;',
					'headphones': '🎧&#xFE0E;'
				}
			};
		},
		template: `
			<div class="song">
				<ul class="tab-list">
					<li>
						<label for="songTitle">Song title:</label>
						<input id="songTitle" size="20" type="text" v-model="song.metadata.title" />
					</li>
					<li>
						<label for="songSpeed">Song speed:</label>
						<input id="songSpeed" size="4" type="text" v-model.number="song.speed" />
					</li>
					<li>
						<label for="songTempo">Song tempo:</label>
						<input id="songTempo" size="4" type="text" v-model.number="song.tempo" />
					</li>
					<li>
						<label for="songRows">Song rows:</label>
						<input id="songRows" size="4" type="text" v-model.number="song.rows" />
					</li>
					<li class="noSelect buttons">
						<button
							v-for="(symbol, name) in playbackStates"
							@click="changePlaybackState(name)"
							:title="playbackState"
							:class="{active: name === playbackState}"
						>
							<span v-html="symbol"></span>
						</button>
					</li>
					<li class="noSelect buttons">
						<button
							v-for="(symbol, name) in speakerSetups"
							@click="changeSpeakerSetup(name)"
							:class="{active: name === speakerSetup}"
						>
							<span v-html="symbol"></span>
							<span>{{name}}</span>
						</button>
					</li>
				</ul>
			</div>
		`
	}
);
