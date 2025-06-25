import { Player } from "@minecraft/server";
import { PropertyStorage } from "@shapescape/storage";
import { ModuleManager, Module } from "../../module-manager";
import { TeamsService } from "../teams/teams.service";
import { SceneContext } from "./scene-context";
import { ConfirmSceneConfig } from "../confirm/confirm-scene-config";
import { MainScene } from "../main/main.scene";

type SceneFactory = (
	manager: SceneManager,
	context: SceneContext,
	...args: any[]
) => void;

/**
 * Class representing the Scene Manager.
 * This class is responsible for managing scene navigation and storing references
 * to required services.
 */
export class SceneManager {
	private static instance: SceneManager | undefined;
	private sceneRegistry: Map<string, SceneFactory> = new Map();
	private readonly storage: PropertyStorage;
	private moduleManager: ModuleManager;
	private teamsService: TeamsService;

	/**
	 * Returns the singleton instance of SceneManager.
	 * @param storage - The base storage for the application (only used on first call).
	 */
	public static getInstance(storage?: PropertyStorage): SceneManager {
		if (!SceneManager.instance) {
			if (!storage) {
				throw new Error(
					"SceneManager not initialized: storage required on first call.",
				);
			}
			SceneManager.instance = new SceneManager(storage);
		}
		return SceneManager.instance;
	}

	/**
	 * Private constructor for singleton pattern.
	 * @param storage - The base storage for the application.
	 */
	private constructor(storage: PropertyStorage) {
		this.storage = storage;

		// Use the singleton ModuleManager instead of creating a new one
		this.moduleManager = ModuleManager.getInstance();

		// Get the TeamsService using the generic getModule method
		this.teamsService = this.moduleManager.getModule<TeamsService>(
			TeamsService.id,
		)!;

		// Register core scenes
		this.registerCoreScenes();

		// Register scenes from all modules
		this.moduleManager.registerAllModuleScenes(this);
	}

	/**
	 * Registers core scenes that don't belong to specific modules.
	 */
	private registerCoreScenes(): void {
		this.registerScene(
			"confirm",
			(
				manager: SceneManager,
				context: SceneContext,
				config: ConfirmSceneConfig,
			) => {
				// Implementation would create a new ConfirmScene instance with the config
				// new ConfirmScene(manager, context, config);
			},
		);

		// Other core scenes...
	}

	/**
	 * Registers a specific scene by name.
	 * This is made public so modules can register their scenes.
	 * @param sceneName - The name of the scene.
	 * @param factory - The scene factory function.
	 */
	public registerScene(sceneName: string, factory: SceneFactory): void {
		if (this.sceneRegistry.has(sceneName)) {
			console.warn(`Scene ${sceneName} is already registered. Overwriting.`);
		}
		this.sceneRegistry.set(sceneName, factory);
	}

	/**
	 * Creates a new context and opens a scene.
	 * @param sourcePlayer - The player opening the scene.
	 * @param sceneName - The name of the scene to open.
	 * @param args - Arguments to pass to the scene.
	 * @returns The created context.
	 */
	public createContextAndOpenScene(
		sourcePlayer: Player,
		sceneName: string,
		...args: any[]
	): SceneContext {
		const context = new SceneContext(sourcePlayer);
		return this.openSceneWithContext(context, sceneName, ...args);
	}

	/**
	 * Opens a scene with an existing context.
	 * @param context - The context to use.
	 * @param sceneName - The name of the scene to open.
	 * @param args - Arguments to pass to the scene.
	 * @returns The updated context.
	 */
	public openSceneWithContext(
		context: SceneContext,
		sceneName: string,
		...args: any[]
	): SceneContext {
		context.addToHistory(sceneName);
		const sceneFactory = this.sceneRegistry.get(sceneName);

		if (sceneFactory) {
			sceneFactory(this, context, ...args);
		} else {
			console.error(`Scene '${sceneName}' not found in registry`);
		}

		return context;
	}

	/**
	 * Navigates to the previous scene in the context's history.
	 * @param context - The context containing the history.
	 */
	public goBack(context: SceneContext): void {
		const previousScene = context.getPreviousScene();
		if (previousScene) {
			// Remove the current scene from history first
			const history = context.getHistory();
			history.pop();
			context.clearHistory();

			// Add back all except the last one
			history.forEach((scene) => context.addToHistory(scene));

			// Now open the previous scene
			const sceneFactory = this.sceneRegistry.get(previousScene);
			if (sceneFactory) {
				sceneFactory(this, context);
			}
		}
	}

	/**
	 * Processes a scene submission by navigating to the next scene if set.
	 * @param context - The context containing the next scene information.
	 */
	public submitScene(context: SceneContext): void {
		const [nextScene, nextSceneArgs] = context.getNextScene();
		if (nextScene) {
			this.openSceneWithContext(context, nextScene, ...nextSceneArgs);
			context.clearNextScene();
		}
	}

	/**
	 * Gets the teams service.
	 * @returns The teams service.
	 */
	public getTeamsService(): TeamsService {
		return this.teamsService;
	}

	/**
	 * Gets a module by its ID.
	 * @param id - The ID of the module to retrieve.
	 * @returns The module if found, otherwise undefined.
	 */
	public getModule<T extends Module>(id: string): T | undefined {
		return this.moduleManager.getModule<T>(id);
	}

	/**
	 * Gets the module manager.
	 * @returns The module manager.
	 */
	public getModuleManager(): ModuleManager {
		return this.moduleManager;
	}

	/**
	 * Gets the storage.
	 * @returns The storage.
	 */
	public getStorage(): PropertyStorage {
		return this.storage;
	}
}
