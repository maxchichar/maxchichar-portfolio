import "server-only";

import { buildTopics, relatedTopics, type Topic } from "@/lib/topics";

import { listContentCards } from "./related";

/** Every topic with published content, most used first. */
export async function listTopics(): Promise<Topic[]> {
  return buildTopics(await listContentCards());
}

/** One topic and its neighbours, or null when nothing published carries it. */
export async function getTopic(
  slug: string,
): Promise<{ topic: Topic; related: Topic[] } | null> {
  const topics = await listTopics();
  const topic = topics.find((t) => t.slug === slug);
  return topic ? { topic, related: relatedTopics(topic, topics) } : null;
}
