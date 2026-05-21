import { db } from "@uptimekit/db";
import type { z } from "zod";
import { createLogger } from "../../../lib/logger";
import type { IntegrationDefinition } from "../registry";
import {
	type AppriseConfigSchema,
	appriseIntegrationMeta,
} from "./apprise-meta";

const logger = createLogger("APPRISE");

type AppriseType = "info" | "success" | "warning" | "failure";

async function sendApprise(
	apiUrl: string,
	body: {
		urls: string;
		title: string;
		body: string;
		type: AppriseType;
		format: "markdown";
		tag?: string;
	},
) {
	const endpoint = `${apiUrl}/notify`;

	let response: Response;
	try {
		response = await fetch(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});
	} catch (error) {
		throw new Error(
			`Could not reach Apprise API at ${endpoint}: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}

	if (!response.ok) {
		const text = await response.text().catch(() => "");
		throw new Error(
			`Apprise API returned ${response.status} ${response.statusText}: ${text}`,
		);
	}
}

export const appriseIntegration: IntegrationDefinition<
	z.infer<typeof AppriseConfigSchema>
> = {
	...appriseIntegrationMeta,
	handler: async (config, event, payload: any) => {
		if (!config.urls || typeof config.urls !== "string") {
			logger.warn("Skipping Apprise notification: missing or invalid 'urls'");
			return;
		}

		const apiUrl = process.env.APPRISE_API_URL || "http://apprise:8000";

		if (event === "integration.test") {
			const body = [
				"**Status:** Your Apprise integration is working correctly!",
				"",
				"**Message:**",
				"```",
				payload.description,
				"```",
				"",
				`**Timestamp:** ${new Date().toLocaleString()}`,
			].join("\n");

			await sendApprise(apiUrl, {
				urls: config.urls,
				title: "✅ Integration Test",
				body,
				type: "success",
				format: "markdown",
				...(config.tag ? { tag: config.tag } : {}),
			});
			return;
		}

		const incidentData = await db.query.incident.findFirst({
			where: (t, { eq }) => eq(t.id, payload.incidentId),
			with: {
				monitors: {
					with: {
						monitor: true,
					},
				},
			},
		});

		if (!incidentData) {
			return;
		}

		const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

		const monitorNames =
			incidentData.monitors.map((m) => m.monitor.name).join(", ") ||
			"No monitors";

		const incidentUrl = `${baseUrl}/incidents/${payload.incidentId}`;

		let title = "";
		let reasonContent = "";
		let type: AppriseType = "info";

		switch (event) {
			case "incident.created":
				title = "⛔ New incident created";
				reasonContent = payload.description || "No details provided";
				type = "failure";
				break;
			case "incident.resolved":
				title = "✅ Incident resolved";
				reasonContent =
					payload.description || "The incident has been resolved.";
				type = "success";
				break;
			case "incident.acknowledged":
				title = "👀 Incident acknowledged";
				reasonContent =
					payload.description || "The incident has been acknowledged.";
				type = "warning";
				break;
			case "incident.comment_added":
				title = "💬 New comment";
				reasonContent = payload.message || "No content";
				type = "info";
				break;
			default:
				title = `Event: ${event}`;
				reasonContent = JSON.stringify(payload, null, 2);
				type = "info";
		}

		const body = [
			`**Monitors:** ${monitorNames}`,
			"**Details:**",
			"```",
			reasonContent,
			"```",
			"",
			`[Manage Incident](${incidentUrl})`,
		].join("\n");

		await sendApprise(apiUrl, {
			urls: config.urls,
			title,
			body,
			type,
			format: "markdown",
			...(config.tag ? { tag: config.tag } : {}),
		});
	},
};
