const assert = require('assert');
const vscode = require('vscode');
const {runPythonScript} = require('./index.js');
const fs = require('fs');
const path = require('path');
const {getName} = require('./helper-functions/fetchName.js');
const {runCodeCpp,runCodePython} = require('./codeExec.js');
const {getHTML} = require('./helper-functions/frontend.js');
/**
 * @param {vscode.ExtensionContext} context
 */

function formatName(str){
	return str.toLowerCase().replace(/\s+/g, '-');
}

function getLanguage(filePath) {
	const extension = path.extname(filePath).toLowerCase();
	
	if (extension === '.cpp') {
		return 'cpp';
	} else if (extension === '.py') {
		return 'python';
	} else if (extension === '.js') {
		return 'javascript';
	} else {
		return 'unknown';
	}
}

async function getTests(url) {
	// Show the progress indicator while executing the function
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Extracting Test Cases...',
        cancellable: false
    }, async (progress) => {
        const [inputArray, outputArray] = await runPythonScript(url);

        const problemName = formatName(getName(url));

        const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('No folder or workspace is open.');
			return;
		}

		console.log("workspaceFolders: ",workspaceFolders);
		

		const folderPath = workspaceFolders[0].uri.fsPath; // Use the first folder in the workspace
		const testCasesFolder = path.join(folderPath, 'TestData');

		// Ensure the folder exists
		if (!fs.existsSync(testCasesFolder)) {
			fs.mkdirSync(testCasesFolder, { recursive: true });
			console.log(`TestData folder created.`);
		}

        // Define the path for the problem-specific folder inside 'TestData'
        const problemDir = path.join(testCasesFolder, problemName);

        // Check if the problem folder exists, create if it doesn't
        if (!fs.existsSync(problemDir)) {
            fs.mkdirSync(problemDir);
            console.log(`Folder for problem "${problemName}" created.`);
        }

        let ct = 1;
        // Create input files
        for (let ele of inputArray) {
            const filePath = path.join(problemDir, `ip${ct}.txt`);
            fs.writeFileSync(filePath, ele);
            progress.report({ increment: Math.floor((ct / inputArray.length) * 100), message: `Writing input file ${ct++}...` });
		}

        ct = 1;
        // Create output files
        for (let ele of outputArray) {
            const filePath = path.join(problemDir, `op${ct}.txt`);
            fs.writeFileSync(filePath, ele);
            progress.report({ increment: Math.floor((ct / outputArray.length) * 100), message: `Writing output file ${ct++}...` });
		}

        vscode.window.showInformationMessage('Sample input and output are now present in TestData folder 🎉');
    });
}

class myWebviewViewProvider{
	constructor(context) {
		this._context = context;
	}

	resolveWebviewView(webviewView) {
		// Set up webview options (enable JavaScript, etc.)

		console.log('resolveWebviewView called'); // Debugging log
		webviewView.webview.options = {
			enableScripts: true
		};
		
		// Set the HTML content of the webview
		webviewView.webview.html = getHTML(webviewView.webview);

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(async (m) => {
			if (m.type === 'fetchTests') {
				// fetch url from message
				const url = m.value;
				await getTests(url);
			}
			else if(m.type == 'runTests'){
				const workspaceFolders = vscode.workspace.workspaceFolders;
				if (!workspaceFolders || workspaceFolders.length === 0) {
					vscode.window.showErrorMessage('No folder or workspace is open.');
					return;
				}
				
				const editor = vscode.window.activeTextEditor;
				let problemName = m.value;
			
				if (!editor) {
					vscode.window.showErrorMessage('No active editor found! Open your solution file.');
					return;
				}
						
				const userCode = editor.document.getText(); // Fetch code from the open editor
						
				if (!userCode || userCode.trim() === '') {
					vscode.window.showErrorMessage('Solution code is empty!');
					return;
				}
						
				if (!problemName) {
					vscode.window.showErrorMessage('Problem name is required!');
					return 0;
				}
					
				problemName = formatName(problemName);
				let problemFolderPath;

				let flag = 0;
				for(let folder of workspaceFolders){
					const workspaceFolderPath = folder.uri.fsPath;
        			const testDataFolderPath = path.join(workspaceFolderPath, 'TestData');
					if(!fs.existsSync(testDataFolderPath))continue;

					flag = 1;

					problemFolderPath = path.join(testDataFolderPath, problemName);

					if (!fs.existsSync(problemFolderPath)) {
						vscode.window.showErrorMessage(`The folder '${problemName}' does not exist inside 'TestData'.`);
						return;
					}
					else{
						flag = 2;
						console.log("Found!");
						break;
					}
				};

				if(flag == 0){
					vscode.window.showErrorMessage(`'TestData' folder not found`);
					return;
				}

				let filePath = editor.document.uri.fsPath;
				const lang = getLanguage(filePath);

				if(lang == 'cpp'){
					const userSolutionFile = path.join(problemFolderPath, 'temp_solution.cpp');
					const executableFile = path.join(problemFolderPath, 'solution_exec.exe');
					
					fs.writeFileSync(userSolutionFile, userCode, 'utf8');

					await runCodeCpp(userSolutionFile,executableFile,problemFolderPath);
				}
				else{
					await runCodePython(filePath,problemFolderPath);
				}
			}
		});
	}
}

async function activate(context) {

	console.log('Congratulations, your extension "cph-lc" is now active!');

	const getCases = vscode.commands.registerCommand('cph-lc.FetchTestCases', async function () {
		const url = await vscode.window.showInputBox({
			prompt: 'Enter the problem URL',
    		placeHolder: 'https://example.com/problem/123'
		});
		await getTests(url);
	});

	const runCases = vscode.commands.registerCommand('cph-lc.RunTestCases',async function (){
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('No folder or workspace is open.');
			return;
		}
				
		const editor = vscode.window.activeTextEditor;
			
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found! Open your solution file.');
			return;
		}
						
		const userCode = editor.document.getText(); // Fetch code from the open editor
						
		if (!userCode || userCode.trim() === '') {
			vscode.window.showErrorMessage('Solution code is empty!');
			return;
		}

		// Path to the problem-specific folder
		let problemName = await vscode.window.showInputBox({
			prompt: "Enter the problem name"
		});
						
		if (!problemName) {
			vscode.window.showErrorMessage('Problem name is required!');
			return 0;
		}
					
		problemName = formatName(problemName);
		let problemFolderPath;

		let flag = 0;
		for(let folder of workspaceFolders){
			const workspaceFolderPath = folder.uri.fsPath;
        	const testDataFolderPath = path.join(workspaceFolderPath, 'TestData');
			if(!fs.existsSync(testDataFolderPath))continue;

			flag = 1;

			problemFolderPath = path.join(testDataFolderPath, problemName);

			if (!fs.existsSync(problemFolderPath)) {
				vscode.window.showErrorMessage(`The folder '${problemName}' does not exist inside 'TestData'.`);
				return;
			}
			else{
				flag = 2;
				console.log("Found!");
				break;
			}
		};

		if(flag == 0){
			vscode.window.showErrorMessage(`'TestData' folder not found`);
			return;
		}

		assert(flag == 2);

		let filePath = editor.document.uri.fsPath;
		const lang = getLanguage(filePath);

		if(lang == 'cpp'){
			const userSolutionFile = path.join(problemFolderPath, 'temp_solution.cpp');
			const executableFile = path.join(problemFolderPath, 'solution_exec.exe');
			
			fs.writeFileSync(userSolutionFile, userCode, 'utf8');

			await runCodeCpp(userSolutionFile,executableFile,problemFolderPath);
		}
		else{
			await runCodePython(filePath,problemFolderPath);
		}
	})

	const object = new myWebviewViewProvider(context);
	context.subscriptions.push(
	  vscode.window.registerWebviewViewProvider('explorerView', object)
	);

	context.subscriptions.push(getCases,runCases);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {activate,deactivate};
