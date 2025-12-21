import * as vscode from 'vscode';
import { getConfig } from './config';

let dimmedDecoration: vscode.TextEditorDecorationType | undefined = undefined;
/**
 * @param reload If true ignores the cached config and reloads the config
 * @returns readonly reference of the dimmed decoration type
 */
const getDimmedDecoration = (reload: boolean = false): Readonly<vscode.TextEditorDecorationType> => {
	if (dimmedDecoration && !reload) {
		return dimmedDecoration;
	}
	const config = getConfig(reload);
	const decoration = vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
		opacity: config.opacity.toString(),
		light: {
			textDecoration: 'none',
			fontStyle: "normal",
			fontWeight: "normal",
			color: config.lightThemeColor, // Faint white/grey
		},
		dark: {
			textDecoration: 'none',
			fontStyle: "normal",
			fontWeight: "normal",
			color: config.darkThemeColor, // Faint white/grey
		}
	});

	dimmedDecoration = decoration;
	return decoration;
};

async function setContextFocus(value: boolean) {
	await vscode.commands.executeCommand("setContext", "limelight.isActive", value);
}

const focusedEditors = new Map<string, vscode.Range>();

const applyFocus = async (editor: vscode.TextEditor) => {
	if (focusedEditors.has(editor.document.uri.toString())) {
		setContextFocus(true);
		const range = focusedEditors.get(editor.document.uri.toString())!;

		let startOfFile: vscode.Range | undefined = undefined;
		if (range.start.line !== 0) {
			startOfFile = new vscode.Range(
				0, 0,
				Math.max(0, range.start.line - 1),
				range.start.character
			);
		}

		let endOfFile: vscode.Range | undefined;
		if (range.end.line + 1 < editor.document.lineCount) {
			endOfFile = new vscode.Range(
				Math.min(editor.document.lineCount + 1, range.end.line + 1),
				range.end.character,
				editor.document.lineCount,
				0
			);
		}

		const hidingRanges = [startOfFile, endOfFile].filter((r) => r !== undefined);
		editor.setDecorations(getDimmedDecoration(), hidingRanges);
		editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
		setContextFocus(true);
	} else {
		setContextFocus(false);
	}
};

async function resetEditorFocus(editor: vscode.TextEditor) {
	editor.setDecorations(getDimmedDecoration(), []);
	focusedEditors.delete(editor.document.uri.toString());
	setContextFocus(false);
}

export function activate(context: vscode.ExtensionContext) {
	vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			console.error(editor.document.uri);
			applyFocus(editor);
		}

		if (!getConfig().persistOnTabSwitch) {
			if (editor) {
				resetEditorFocus(editor);
			}
			focusedEditors.clear();
			setContextFocus(false);
		}
	});

	vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration('limelight')) {
			getDimmedDecoration(true);
			if (vscode.window.activeTextEditor) {
				applyFocus(vscode.window.activeTextEditor);
			}
		}
	});

	const toggleFocusBlockCommand = vscode.commands.registerCommand('limelight.toggleBlockFocus', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		if (focusedEditors.has(editor.document.uri.toString())) {
			resetEditorFocus(editor);
			return;
		}

		try {
			const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>("vscode.executeDocumentSymbolProvider", editor.document.uri);
			if (!symbols) {
				vscode.window.showInformationMessage("No language symbols found. Is the language supported?");
				return;
			}

			const cursorPosition = editor.selection.active;
			const targetSymbol = getDeepestSymbol(symbols, cursorPosition);

			if (targetSymbol) {
				const range = targetSymbol.range;
				focusedEditors.set(editor.document.uri.toString(), range);

				await applyFocus(editor);
			}
		} catch (e) {
			console.error(e);
		}
	});

	const setFocusBlockCommand = vscode.commands.registerCommand('limelight.setBlockFocus', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			setContextFocus(false);
			return;
		}

		try {
			const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>("vscode.executeDocumentSymbolProvider", editor.document.uri);
			if (!symbols) {
				vscode.window.showInformationMessage("No language symbols found. Is the language supported?");
				resetEditorFocus(editor);
				return;
			}

			const cursorPosition = editor.selection.active;
			const targetSymbol = getDeepestSymbol(symbols, cursorPosition);

			if (targetSymbol) {
				const existingRange = focusedEditors.get(editor.document.uri.toString());
				const range = targetSymbol.range;

				if (existingRange?.isEqual(range)) {
					resetEditorFocus(editor);
					return;
				}

				focusedEditors.set(editor.document.uri.toString(), range);


				await applyFocus(editor);
			}
		} catch (e) {
			console.error(e);
		}
	});

	const toggleFocusSelectionCommand = vscode.commands.registerCommand('limelight.toggleSelectionFocus', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		if (focusedEditors.has(editor.document.uri.toString())) {
			resetEditorFocus(editor);
			return;
		}

		const selection = editor.selection;
		if (!selection.isEmpty) {
			const range = new vscode.Range(selection.start, selection.end);

			focusedEditors.set(editor.document.uri.toString(), range);
			await applyFocus(editor);
		}
	});

	const setFocusSelectionCommand = vscode.commands.registerCommand('limelight.setSelectionFocus', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		const existingRange = focusedEditors.get(editor.document.uri.toString());
		const selection = editor.selection;
		const range = selection.isEmpty ? undefined : new vscode.Range(selection.start, selection.end);

		if (focusedEditors.has(editor.document.uri.toString())) {
			resetEditorFocus(editor);
			if (!range || existingRange?.isEqual(range)) {
				return;
			}
		}

		if (range) {
			focusedEditors.set(editor.document.uri.toString(), range);
			await applyFocus(editor);
		}
	});

	const clearFocusCommand = vscode.commands.registerCommand('limelight.clearFocus', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		if (focusedEditors.has(editor.document.uri.toString())) {
			resetEditorFocus(editor);
		}
	});

	const refCommand = vscode.commands.registerCommand('limelight.peekRef', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		const refs = await vscode.commands.executeCommand<vscode.Location[]>(
			"vscode.executeReferenceProvider",
			editor.document.uri,
			editor.selection.active
		);

		if (refs && refs.length > 0) {
			await vscode.commands.executeCommand(
				"editor.action.peekLocations",
				editor.document.uri,
				editor.selection.active,
				refs,
				"peek"
			);
		} else {
			vscode.window.showInformationMessage("No references found.");
		}
	});

	context.subscriptions.push(
		toggleFocusBlockCommand,
		refCommand,
		toggleFocusSelectionCommand,
		setFocusBlockCommand,
		setFocusSelectionCommand,
		clearFocusCommand
	);
}

function getDeepestSymbol(symbols: vscode.DocumentSymbol[], pos: vscode.Position): vscode.DocumentSymbol | undefined {
	for (const symbol of symbols) {
		if (symbol.range.contains(pos)) {
			// If this symbol has children (e.g., a method inside a class), check them
			const child = getDeepestSymbol(symbol.children, pos);
			// Return the child if found, otherwise return this symbol
			return child || symbol;
		}
	}
	return undefined;
}

export function deactivate() { }
