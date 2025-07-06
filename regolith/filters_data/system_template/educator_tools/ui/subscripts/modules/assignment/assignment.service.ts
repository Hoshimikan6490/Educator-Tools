import { Module, ModuleManager } from "../../module-manager";
import { SceneContext } from "../scene_manager/scene-context";
import { SceneManager } from "../scene_manager/scene-manager";
import { Player, Vector3, world } from "@minecraft/server";
import { AssignmentRepository } from "./assignment.repository";
import { TeamsService } from "../teams/teams.service";

export interface Assignment extends AssignmentData {
	id: string;
}

export interface AssignmentData {
	title: string;
	description: string;
	assignedTo: string; // Team ID
}

export interface Submission {
	id: string;
	note: string;
	location: Vector3;
	submittedBy: string; // Player ID
	assignmentId: string; // ID of the assignment this submission belongs to
}

export class AssignmentService implements Module {
	static readonly id = "assignment";
	public readonly id = AssignmentService.id;
	private readonly repository: AssignmentRepository;
	private teamsService: TeamsService;

	constructor(private readonly moduleManager: ModuleManager) {
		this.repository = new AssignmentRepository();
	}

	initialize(): void {
		this.teamsService = this.moduleManager.getModule(
			TeamsService.id,
		) as TeamsService;
	}

	registerScenes(sceneManager: SceneManager): void {
		// Register scenes related to assignment management
		sceneManager.registerScene(
			"AssignmentScene",
			(manager: SceneManager, context: SceneContext) => {
				//new AssignmentScene(manager, context);
			},
		);
	}

	notifyAssignmentCreated(assignment: Assignment): void {
		// Notify players about the new assignment
		const team = this.teamsService.getTeam(assignment.assignedTo);
		if (!team) {
			return;
		}
		for (const memberId of team.memberIds) {
			const player = world.getEntity(memberId) as Player;
			if (player) {
				player.sendMessage([
					{ translate: "edu_tools.ui.assignment.new_assignment" },
					{ text: ` ${assignment.title}` },
				]);
			}
		}
	}

	createAssignment(data: AssignmentData): Assignment {
		const id = this.generateRandomHash(data);
		this.repository.createAssignment(id, data);
		return {
			...data,
			id: id,
		};
	}

	getAssignment(id: string): Assignment | undefined {
		const data = this.repository.getAssignment(id);
		if (data) {
			return { ...data, id: id };
		}
		return;
	}

	updateAssignment(
		id: string,
		data: Partial<AssignmentData>,
	): Assignment | undefined {
		const existingData = this.repository.getAssignment(id);
		if (!existingData) {
			return;
		}
		const updatedData = { ...existingData, ...data };
		this.repository.updateAssignment(id, updatedData);
		return { ...updatedData, id: id };
	}

	deleteAssignment(id: string): boolean {
		return this.repository.deleteAssignment(id);
	}

	completeAssignment(id: string): boolean {
		return this.repository.moveToCompleted(id);
	}

	getActiveAssignments(): Assignment[] {
		const activeIds = this.repository.getActiveAssignmentIds();
		return activeIds
			.map((id: string) => this.getAssignment(id))
			.filter((assignment: any): assignment is Assignment => !!assignment);
	}

	getCompletedAssignments(): Assignment[] {
		const completedIds = this.repository.getCompletedAssignmentIds();
		return completedIds
			.map((id: string) => this.getAssignment(id))
			.filter((assignment: any): assignment is Assignment => !!assignment);
	}

	addSubmission(
		assignmentId: string,
		submission: Omit<Submission, "id" | "assignmentId">,
	): Submission | undefined {
		const assignmentData = this.repository.getAssignment(assignmentId);
		if (!assignmentData) {
			return undefined;
		}
		const id = this.generateRandomHash(submission);
		const newSubmission: Submission = {
			...submission,
			id: id,
			assignmentId: assignmentId,
		};
		this.repository.addSubmission(assignmentId, id, newSubmission);
		return newSubmission;
	}

	getSubmissions(assignmentId: string): Submission[] {
		const submissionIds = this.repository.getSubmissionIds(assignmentId);
		return submissionIds
			.map((id: string) => {
				const data = this.repository.getSubmissionData(assignmentId, id);
				if (data) {
					return { ...data, id: id, assignmentId: assignmentId };
				}
				return undefined;
			})
			.filter((submission: any): submission is Submission => !!submission);
	}

	getSubmission(
		assignmentId: string,
		submissionId: string,
	): Submission | undefined {
		const data = this.repository.getSubmissionData(assignmentId, submissionId);
		if (data) {
			return { ...data, id: submissionId, assignmentId: assignmentId };
		}
		return undefined;
	}

	updateSubmission(
		assignmentId: string,
		submissionId: string,
		data: Partial<Omit<Submission, "id" | "assignmentId">>,
	): Submission | undefined {
		const existingData = this.repository.getSubmissionData(
			assignmentId,
			submissionId,
		);
		if (!existingData) {
			return undefined;
		}
		const updatedData = { ...existingData, ...data };
		this.repository.updateSubmission(assignmentId, submissionId, updatedData);
		return { ...updatedData, id: submissionId, assignmentId: assignmentId };
	}

	deleteSubmission(assignmentId: string, submissionId: string): boolean {
		return this.repository.deleteSubmission(assignmentId, submissionId);
	}

	getPlayerSubmissions(playerId: string, assignmentId: string): Submission[] {
		const submissions = this.getSubmissions(assignmentId);
		const playerSubmissions: Submission[] = [];
		for (const submission of submissions) {
			if (submission.submittedBy === playerId) {
				playerSubmissions.push(submission);
			}
		}
		return playerSubmissions;
	}

	getTeamsAssignments(
		teamIds: string | string[],
		onlyActive: boolean = true,
	): Assignment[] {
		const assignments: Assignment[] = [];
		const activeAssignments = this.getActiveAssignments();
		if (onlyActive) {
			activeAssignments.push(...this.getCompletedAssignments());
		}
		const teamArray = Array.isArray(teamIds) ? teamIds : [teamIds];
		for (const assignment of activeAssignments) {
			if (teamArray.includes(assignment.assignedTo)) {
				assignments.push(assignment);
			}
		}
		return assignments;
	}

	private generateRandomHash(data: any): string {
		const str = JSON.stringify(data);
		let hash = 0;
		for (let i = 0, len = str.length; i < len; i++) {
			let chr = str.charCodeAt(i);
			hash = (hash << 5) - hash + chr;
			hash |= 0; // Convert to 32bit integer
		}
		return "h" + (hash + Math.floor(Math.random() * 1000000)); // Add some randomness to avoid collisions
	}
}
