'use strict';
/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
 * language definition based on: https://raw.githubusercontent.com/Microsoft/vscode/master/extensions/python/syntaxes/MagicPython.tmLanguage.json (MIT)
 * compilation related parts taken from: https://github.com/trufflesuite/truffle/tree/develop/packages/truffle-compile-vyper (MIT)
 * */

/** imports */
const vscode = require("vscode");

const mod_deco = require("./features/deco.js");
//const mod_signatures = require("./features/signatures.js");
const mod_hover = require("./features/hover/hover.js");
const mod_compile = require("./features/compile.js");
const settings = require("./settings");
/** global vars */
var activeEditor;

/** classdecs */


/** funcdecs */


/** event funcs */
async function onDidSave(document) {
    if (document.languageId != settings.LANGUAGE_ID) {
        console.log("Language ID mismatch");
        return;
    }
    const fileExtension = document.uri.fsPath.split('.').pop();
    
    //always run on save
    if (settings.extensionConfig().compile.onSave) {
        if (fileExtension !== "vy") {
            console.log("Skipping compilation for interface file");
            return;
        }
        mod_compile.compileContractCommand(document);
    }
}

async function onDidChange(event) {
    if (vscode.window.activeTextEditor.document.languageId != settings.LANGUAGE_ID) {
        return;
    }

    if(settings.extensionConfig().decoration.enable){
        mod_deco.decorateWords(activeEditor, [
            {
                regex:"@\\b(public|nonpayable|modifying|payable|external)\\b",
                captureGroup: 0,
            },
            {
                regex:"\\b(send|raw_call|selfdestruct|create_forwarder_to|create_minimal_proxy_to|create_copy_of|create_from_blueprint)\\b",
                captureGroup: 0,
                hoverMessage: "❗**potentially unsafe** lowlevel call"
            },
        ], mod_deco.styles.foreGroundWarning);
        mod_deco.decorateWords(activeEditor, [
            {
                regex:"\\b(public|payable|modifying|nonpayable|payable|external)\\b\\(",
                captureGroup: 1,
            },
        ], mod_deco.styles.foreGroundWarningUnderline);
        mod_deco.decorateWords(activeEditor, [
            {
                regex:"\\b(\\.balance|msg\\.[\\w]+|block\\.[\\w]+)\\b",
                captureGroup: 0,
            }
        ], mod_deco.styles.foreGroundInfoUnderline);
        mod_deco.decorateWords(activeEditor, [
            {
                regex:"@?\\b(private|nonreentrant|constant|internal|view|pure|event)\\b",
                captureGroup: 0,
            },
        ], mod_deco.styles.foreGroundOk);
        mod_deco.decorateWords(activeEditor, [
            {
                regex:"\\b(log)\\.",
                captureGroup: 1,
            },
            {
                regex:"\\b(clear)\\b\\(",
                captureGroup: 1,
            },
        ], mod_deco.styles.foreGroundNewEmit);
        mod_deco.decorateWords(activeEditor, [
            {
                regex:"\\b(__init__|__default__)\\b",
                captureGroup: 0,
            },
        ], mod_deco.styles.boldUnderline);
    }
}
function onInitModules(context, type) {
    mod_hover.init(context, type);
    mod_compile.init(context, type);
}

function onActivate(context) {

    const active = vscode.window.activeTextEditor;
    activeEditor = active;

    registerDocType(settings.LANGUAGE_ID);

    function registerDocType(type) {
        context.subscriptions.push(
            vscode.languages.reg
        );

        // taken from: https://github.com/Microsoft/vscode/blob/master/extensions/python/src/pythonMain.ts ; slightly modified
        // autoindent while typing
        vscode.languages.setLanguageConfiguration(type, {
            onEnterRules: [
                {
                    beforeText: /^\s*(?:struct|enum|flag|event|interface|def|class|for|if|elif|else).*?:\s*$/,
                    action: { indentAction: vscode.IndentAction.Indent }
                }
            ]
        });

        context.subscriptions.push(
            vscode.commands.registerCommand('vyper.compileContract', mod_compile.compileContractCommand)
        );

        if (!settings.extensionConfig().mode.active) {
            console.log("ⓘ activate extension: entering passive mode. not registering any active code augmentation support.");
            return;
        }
        /** module init */
        onInitModules(context, type);
        onDidChange();
        onDidSave(active.document);

        /** event setup */
        /***** OnChange */
        vscode.window.onDidChangeActiveTextEditor(editor => {
            activeEditor = editor;
            if (editor) {
                onDidChange();
            }
        }, null, context.subscriptions);
        /***** OnChange */
        vscode.workspace.onDidChangeTextDocument(event => {
            if (activeEditor && event.document === activeEditor.document) {
                onDidChange(event);
            }
        }, null, context.subscriptions);
        /***** OnSave */

        vscode.workspace.onDidSaveTextDocument(document => {
            onDidSave(document);
        }, null, context.subscriptions);

        /****** OnOpen */
        vscode.workspace.onDidOpenTextDocument(document => {
            onDidSave(document);
        }, null, context.subscriptions);

        /***** SignatureHelper */
        /*
        context.subscriptions.push(
            vscode.languages.registerSignatureHelpProvider(
                { language: type },
                new mod_signatures.VyperSignatureHelpProvider(),
                '(', ','
            )
        );
        */

    }
}

/* exports */
exports.activate = onActivate;
