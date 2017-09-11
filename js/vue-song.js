"use strict";

Vue.component(
	'song',
	{
		props: {
			editorState: Object,
			projectState: Object,
			changePlaybackState: Function
		},
		computed: {
			song: function(){return this.projectState.songs[this.editorState.activeSongIndex];}
		},
		methods: {
			changeSong: function () {
				this.changePlaybackState('paused');
				this.editorState.activeOrderIndex = 0;
				this.editorState.activeRowIndex = 0;
			},
			newSong: function () {
				let emptySong = app.createEmptySong();
				this.editorState.activeSongIndex = this.projectState.songs.push(emptySong) - 1;
				this.changeSong();
			},
			deleteSong: function () {
				this.projectState.songs.splice(this.editorState.activeSongIndex, 1);
				this.editorState.activeSongIndex = Math.max(0, this.projectState.songs.length - 1);
				if(!this.projectState.songs.length){
					this.newSong();
				} else {
					this.changeSong();
				}
			}
		},
		template: `
			<div class="song">
				<ul class="tab-list">
					<li>
						<label for="activeSong">Song list:</label>
						<select id="activeSong"
							v-model="editorState.activeSongIndex"
							@change="changeSong"
						>
							<option
								v-for="(item, index) in projectState.songs"
								:value="index"
								:key="index"
							>{{item.metadata.title}}</option>
						</select>
					</li>
					<li>
						<button @click="newSong">New Song</button>
						<button @click="deleteSong">Delete Song</button>
					</li>
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
				</ul>
			</div>
		`
	}
);
