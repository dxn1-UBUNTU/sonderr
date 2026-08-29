import * as vscode from "vscode"

export class SonderrActionProvider implements vscode.CodeActionProvider {
  static readonly metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [vscode.CodeActionKind.QuickFix, vscode.CodeActionKind.RefactorRewrite],
  }

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    if (range.isEmpty) return []

    const actions: vscode.CodeAction[] = []

    const add = new vscode.CodeAction("Add to Sonderr", vscode.CodeActionKind.RefactorRewrite)
    add.command = { command: "sonderr-code.new.addToContext", title: "Add to Sonderr" }
    actions.push(add)

    const hasDiagnostics = context.diagnostics.length > 0

    if (hasDiagnostics) {
      const fix = new vscode.CodeAction("Fix with Sonderr", vscode.CodeActionKind.QuickFix)
      fix.command = { command: "sonderr-code.new.fixCode", title: "Fix with Sonderr" }
      fix.isPreferred = true
      actions.push(fix)
    }

    if (!hasDiagnostics) {
      const explain = new vscode.CodeAction("Explain with Sonderr", vscode.CodeActionKind.RefactorRewrite)
      explain.command = { command: "sonderr-code.new.explainCode", title: "Explain with Sonderr" }
      actions.push(explain)

      const improve = new vscode.CodeAction("Improve with Sonderr", vscode.CodeActionKind.RefactorRewrite)
      improve.command = { command: "sonderr-code.new.improveCode", title: "Improve with Sonderr" }
      actions.push(improve)
    }

    return actions
  }
}
