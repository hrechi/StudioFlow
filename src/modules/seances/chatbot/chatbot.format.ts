/**
 * Module : Chatbot IA · Responsable : Yosser Rafrafi
 * Nettoyage défensif du texte du modèle (fonction pure) : l'interface affiche du texte simple,
 * donc on retire le Markdown qui apparaîtrait tel quel (**gras**, # titres, tirets).
 */
export function cleanReply(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\*\*(.+?)\*\*/g, "$1") // **gras**
    .replace(/__(.+?)__/g, "$1")
    .replace(/^#{1,6}\s*/gm, "") // # titres
    .replace(/^\s*[-*•]\s+/gm, "• ") // puces uniformes
    .replace(/^\s*\|?[\s:-]*-{3,}[\s|:-]*$/gm, "") // lignes de tableau markdown
    .replace(/`+/g, "")
    .replace(/\*(?=\S)(.+?)(?<=\S)\*/g, "$1") // *italique*
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
