import { TimeOfDay } from "@minecraft/server";
import { ModalUIScene } from "../scene_manager/ui-scene";
import { SceneContext } from "../scene_manager/scene-context";
import { SceneManager } from "../scene_manager/scene-manager";
import { EnvironmentService } from "./environment.service";

export class EnvironmentDaytimeScene extends ModalUIScene {
	static readonly id = "environment_daytime";

	constructor(
		sceneManager: SceneManager,
		context: SceneContext,
		environmentService: EnvironmentService,
	) {
		super(EnvironmentDaytimeScene.id, context.getSourcePlayer(), "confirm");

		this.setContext(context);

		const daytimes = Object.keys(TimeOfDay).filter((key) => isNaN(Number(key)));
		// Add a "no change" option
		daytimes.unshift("edu_tools.ui.environment_daytime.no_change");

		this.addDropdown(
			"edu_tools.ui.environment_daytime.select_daytime",
			daytimes,
			(selectedDaytime: number): void => {
				if (selectedDaytime === 0) {
					// If "no change" is selected, do nothing
					return;
				}
				environmentService.setDayTime(
					TimeOfDay[daytimes[selectedDaytime] as keyof typeof TimeOfDay],
				);
			},
		);

		this.addToggle(
			"edu_tools.ui.environment_daytime.set_daytime_cycle",
			(isEnabled: boolean): void => {
				environmentService.setDayLightCycle(isEnabled);
			},
			environmentService.getDayLightCycle(),
		);

		this.show(context.getSourcePlayer(), sceneManager);
	}
}
