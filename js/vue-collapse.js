"use strict";

Vue.component(
	'collapse',
	{
		props: {
			name: String,
			openByDefault: {
				type: Boolean,
				default: true
			}
		},
		data: function(){
			return {
				collapsed: this.openByDefault
			};
		},
		template: `
			<div class="collapse noSelect">
				<ul class="tab-list">
					<li :class="\{active: collapsed}">
						<a @click="collapsed = !collapsed">
							<span class="checkbox"></span>
							<span>{{name}}</span>
						</a>
					</li>
				</ul>
				<div v-if="collapsed">
					<slot />
				</div>
			</div>
		`
	}
);
