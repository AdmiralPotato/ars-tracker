"use strict";

Vue.component(
	'channel-list',
	{
		props: {
			channels: Array,
			activeChannels: Array,
			toggleChannel: Function
		},
		template: `
			<div class="channel-list">
				<ul class="tab-list noSelect">
					<li
						v-for="(item, index) in channels"
						:class="\{active: activeChannels.indexOf(index) !== -1}"
						>
						<a @click="toggleChannel(index)">
							<span class="checkbox"></span>
							<span>{{index}}:{{item.isNoise ? 'noise' : 'pulse'}}:{{item.displayVolume}}</span>
						</a>
					</li>
				</ul>
			</div>
		`
	}
);
