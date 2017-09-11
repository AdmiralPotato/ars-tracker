"use strict";

Vue.component(
	'io',
	{
		props: {
			projectState: Object,
			editorState: Object,
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
		created: function(){
			this.saveListener = function(keydownEvent){
				let key = keydownEvent.key;
				if(keydownEvent.ctrlKey && (key === 's' || key === 'S')){
					let blob = new Blob(
						[JSON.stringify(hydration.dehydrate(app.projectState))],
						{type: "application/json;charset=utf-8"}
					);
					keydownEvent.preventDefault();
					window['saveAs'](blob, app.editorState.projectFileName);
				}
			};
		},
		mounted: function(){
			document.body.addEventListener('keydown', this.saveListener);
		},
		destroy: function () {
			document.body.removeEventListener('keydown', this.saveListener);
		},
		methods: {
			handleFileOpen: function (fileOpenEvent) {
				//app.loadProject('https://gist.githubusercontent.com/SolraBizna/4e44ef4dce1080fb844ff6cf8b1f2492/raw/f1ebcbf17ebe79acfc90d8c5f888f76258009d6a/' + testProjects[0]);
				let file = fileOpenEvent.target.files[0];
				if(file){
					try{
						console.log('Loading:', file.name);
						app.editorState.projectFileName = file.name;
						let reader = new FileReader();
						reader.addEventListener(
							'load',
							function () {
								app.setProjectState(JSON.parse(reader.result));
							}
						);
						reader.readAsText(file);
					}
					catch(e){
						console.error(e);
					}
				}
			}
		},
		template: `
			<div class="io">
				<ul class="tab-list">
					<li>
						<label for="openExistingProject">Open Existing Project:</label>
						<input id="openExistingProject" type="file" @change="handleFileOpen" @input="handleFileOpen"/>
					</li>
					<li>
						<label for="projectFileName">Project file name:</label>
						<input id="projectFileName" size="30" type="text" v-model="editorState.projectFileName" />
					</li>
					<li class="noSelect buttons">
						<button
							v-for="(symbol, name) in playbackStates"
							@click="changePlaybackState(name)"
							:title="editorState.playbackState"
							:class="{active: name === editorState.playbackState}"
						>
							<span v-html="symbol"></span>
						</button>
					</li>
					<li class="noSelect buttons">
						<button
							v-for="(symbol, name) in speakerSetups"
							@click="changeSpeakerSetup(name)"
							:class="{active: name === editorState.speakerSetup}"
						>
							<span v-html="symbol"></span>
							<span>{{name}}</span>
						</button>
					</li>
					<li>
						<label for="editorVolume">Editor volume: {{editorState.volume}}</label>
						<input id="editorVolume" type="range" min="0" max="4" step="0.1" v-model="editorState.volume">
					</li>
				</ul>
			</div>
		`
	}
);
