import { SceneManager } from "../scene_manager/scene-manager";
import { ActionUIScene, ModalUIScene } from "../scene_manager/ui-scene";
import { Team } from "../teams/interfaces/team.interface";
import { SceneContext } from "../scene_manager/scene-context";
import { ModuleManager } from "../../module-manager";
import { FocusModeService } from "./focus_mode.service";

export class FocusModeManageScene extends ModalUIScene {
	public static readonly id = "focus_mode_manage";
	private focusModeService: FocusModeService;

	constructor(sceneManager: SceneManager, context: SceneContext) {
		// Create the scene
		super(FocusModeManageScene.id, context.getSourcePlayer(), "");
		this.context = context;

		// Get the gamemode service
		this.focusModeService =
			ModuleManager.getInstance().getModule<FocusModeService>(
				FocusModeService.id,
			)!;

		const subjectTeam = context.getSubjectTeam()!;
		const isFocusModeEnabled =
			this.focusModeService.getTeamFocusMode(subjectTeam);

		this.addToggle(
			"edu_tools.ui.focus_mode.toggle.enable",
			(value) => {
				this.focusModeService.setTeamFocusMode(subjectTeam, value);
			},
			{
				defaultValue: isFocusModeEnabled,
				tooltip: "edu_tools.ui.focus_mode.toggle.enable_tooltip",
			},
		);

		this.addTextField(
			"edu_tools.ui.focus_mode.text_field.message",
			"edu_tools.ui.focus_mode.text_field.message_placeholder",
			(value) => {
				this.focusModeService.setTeamsFocusModeMessage(subjectTeam, value);
			},
			{
				defaultValue:
					this.focusModeService.getTeamsFocusModeMessage(subjectTeam),
				tooltip: "edu_tools.ui.focus_mode.text_field.message_tooltip",
			},
		);

		this.show(context.getSourcePlayer(), sceneManager);
	}
}
