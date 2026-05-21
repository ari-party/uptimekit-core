import { z } from "zod";
import type { IntegrationDefinition } from "../registry";

export const AppriseConfigSchema = z.object({
	urls: z.string().min(1, { message: "At least one Apprise URL is required" }),
	tag: z.string().optional(),
});

export const appriseIntegrationMeta: Omit<
	IntegrationDefinition<z.infer<typeof AppriseConfigSchema>>,
	"handler"
> = {
	id: "apprise",
	name: "Apprise",
	type: "export",
	description:
		"Fan out incident events to 80+ services (email, SMS, Slack, Matrix, Pushover, and more) via the bundled Apprise API.",
	configSchema: AppriseConfigSchema,
	events: [
		"incident.created",
		"incident.resolved",
		"incident.acknowledged",
		"incident.comment_added",
		"integration.test",
	],
};
