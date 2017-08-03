"use strict";

Vue.component(
	'song',
	{
		props: {
			song: Object,
			playbackState: String,
			changePlaybackState: Function
		},
		data: function () {
			return {
				playbackStates: {
					'paused': '⏸&#xFE0E;',
					'playSong': '⏵&#xFE0E;',
					'loopOrder': '🔂&#xFE0E;'
				}
			};
		},
		template: `
			<div>
				<ul class="tab-list">
					<li>
						<label for="songTitle">Song title:</label>
						<input id="songTitle" type="text" v-model="song.metadata.title" />
					</li>
					<li>
						<label for="songSpeed">Song speed:</label>
						<input id="songSpeed" type="text" v-model.number="song.speed" />
					</li>
					<li>
						<label for="songTempo">Song tempo:</label>
						<input id="songTempo" type="text" v-model.number="song.tempo" />
					</li>
					<li>
						<label for="songRows">Song rows:</label>
						<input id="songRows" type="text" v-model.number="song.rows" />
					</li>
					<li
						v-for="(symbol, name) in playbackStates"
						class="noSelect"
					>
						<button
							@click="changePlaybackState(name)"
							:class="{active: name === playbackState}"
						>
							<span v-html="symbol"></span>
						</button>
					</li>
				</ul>
			</div>
		`
	}
);
