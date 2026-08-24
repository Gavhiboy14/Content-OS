"use server";

import { revalidatePath } from "next/cache";
import * as pages from "@/lib/pages";
import { requireAuth } from "@/lib/require-auth";
import type { CreatePageInput, Page, UpdatePageInput } from "@/lib/types";

export async function createPageAction(input: CreatePageInput): Promise<Page> {
  await requireAuth();
  if (!input.title?.trim()) {
    throw new Error("El título no puede estar vacío");
  }
  const page = await pages.createPage(input);
  revalidatePath("/", "layout");
  return page;
}

export async function updatePageAction(
  id: string,
  input: UpdatePageInput
): Promise<Page> {
  await requireAuth();
  if (input.title !== undefined && !input.title.trim()) {
    throw new Error("El título no puede estar vacío");
  }
  const page = await pages.updatePage(id, input);
  revalidatePath("/", "layout");
  return page;
}

export async function deletePageAction(id: string): Promise<void> {
  await requireAuth();
  await pages.deletePage(id);
  revalidatePath("/", "layout");
}

export async function movePageAction(
  id: string,
  parentId: string | null,
  section: string | null,
  targetIndex: number
): Promise<void> {
  await requireAuth();
  await pages.movePage(id, parentId, section, targetIndex);
  revalidatePath("/", "layout");
}
