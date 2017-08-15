"use strict";

Vue.component(
	'io',
	{
		props: {
			editorState: Object,
			projectState: Object
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
			<div class="io song">
				<ul class="tab-list">
					<li>
						<label for="openExistingProject">Open Existing Project:</label>
						<input id="openExistingProject" type="file" @change="handleFileOpen" @input="handleFileOpen"/>
					</li>
					<li>
						<label for="projectFileName">Project file name:</label>
						<input id="projectFileName" size="40" type="text" v-model="editorState.projectFileName" />
					</li>
				</ul>
			</div>
		`
	}
);
