// Keep historical provider metadata intact while presenting neutral discovery labels.
export function discoveryLabel(value) {
  const label = String(value || '');
  return /mistral|ministral/i.test(label) ? 'AI-assisted search' : label;
}
// Search cards use compact plain text; chat and reviewers keep rich formatting.
export function searchSnippet(value){return String(value||'')
 .replace(/```[^\n]*\n?/g,'')
 .replace(/!?\[([^\]]+)\]\([^\n)]+\)/g,'$1')
 .replace(/^\s{0,3}#{1,6}\s+/gm,'')
 .replace(/^\s*[-*+]\s+/gm,'')
 .replace(/(\*\*|__)([\s\S]*?)\1/g,'$2')
 .replace(/`([^`]+)`/g,'$1')
 .replace(/(^|\s)\*([^*\n]+)\*(?=$|[\s.,;:!?])/g,'$1$2')
 .replace(/\s+/g,' ').trim()}
