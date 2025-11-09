import { NoteSection } from "@/components/note-creator"

/**
 * Utility functions for merging and updating notes
 */

/**
 * Merge new sections into existing notes
 * Updates existing sections if they match, otherwise adds new ones
 */
export function mergeNoteSections(
  existing: NoteSection[],
  updates: Array<{ action: "update" | "add"; index: number; content: NoteSection }>,
): NoteSection[] {
  const result = [...existing]

  for (const update of updates) {
    if (update.action === "update" && update.index >= 0 && update.index < result.length) {
      // Update existing section - merge content intelligently
      const existingSection = result[update.index]
      result[update.index] = {
        title: update.content.title || existingSection.title,
        content: mergeSectionContent(existingSection.content, update.content.content),
      }
    } else if (update.action === "add" || update.index === -1) {
      // Add new section
      result.push(update.content)
    }
  }

  return result
}

/**
 * Merge two section contents intelligently
 * Avoids duplication and maintains flow
 */
function mergeSectionContent(existing: string, newContent: string): string {
  // Simple merge: append new content if it's different
  // In a more sophisticated version, we could use NLP to detect duplicates
  if (newContent.trim().toLowerCase() === existing.trim().toLowerCase()) {
    return existing
  }

  // Check if new content is already contained in existing
  if (existing.toLowerCase().includes(newContent.trim().toLowerCase())) {
    return existing
  }

  // Append new content with a separator
  return `${existing}\n\n${newContent}`
}

/**
 * Update a specific section by index
 */
export function updateSection(
  sections: NoteSection[],
  index: number,
  updates: Partial<NoteSection>,
): NoteSection[] {
  if (index < 0 || index >= sections.length) {
    return sections
  }

  const result = [...sections]
  result[index] = {
    ...result[index],
    ...updates,
  }

  return result
}

/**
 * Add a new section
 */
export function addSection(sections: NoteSection[], newSection: NoteSection): NoteSection[] {
  return [...sections, newSection]
}

