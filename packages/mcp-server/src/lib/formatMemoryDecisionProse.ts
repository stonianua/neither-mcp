export type MemoryDecisionProseRow = {
  title?: string | null;
  decision?: string | null;
  rejected?: string | null;
  constraint?: string | null;
  excerpt?: string | null;
  source_document_id?: string | null;
};

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function formatRow(row: MemoryDecisionProseRow): string {
  const sections: string[] = [];
  const decisionText = trimOrNull(row.decision);
  const titleText = trimOrNull(row.title);
  const decision = decisionText ?? (titleText && titleText.length >= 3 ? titleText : null);
  if (decision) {
    sections.push(`Decision: ${decision}`);
  }
  const rejected = trimOrNull(row.rejected);
  if (rejected) {
    sections.push(`Rejected: ${rejected}`);
  }
  const constraint = trimOrNull(row.constraint);
  if (constraint) {
    sections.push(`Constraint: ${constraint}`);
  }
  const excerpt = trimOrNull(row.excerpt);
  if (excerpt && excerpt.length >= 20) {
    sections.push(`Citation: ${excerpt}`);
  }
  return sections.join("\n");
}

export function formatMemoryDecisionProse(
  rows: MemoryDecisionProseRow[],
  filePath: string,
): string {
  if (rows.length === 0) {
    return `No cited decisions found for ${filePath}. Push docs with \`npx -y neither@latest push\` if this path is new.`;
  }
  const body = rows
    .slice(0, 10)
    .map((row) => formatRow(row))
    .filter((block) => block.length > 0);
  return [`File: ${filePath}`, `Matches: ${rows.length}`, "", ...body].join("\n");
}
