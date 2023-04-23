/**
 * Plugin to disable commands if cursor/selection is in non-editable area.
 */
/*global
 CKEDITOR
 */
CKEDITOR.plugins.add('rmDisableCommands',
    {
        init: function (editor) {
            editor.on('selectionChange', function (event) {

                var commandsToDisableForNonEditables = ['cut', 'paste', 'pastefromword', 'pastetext', 'replace', 'link', 'unlink', 'anchor', 'mathjax', 'table', 'horizontalrule', 'pagebreak',
                    'bold', 'italic', 'underline', 'strike', 'subscript', 'superscript', 'removeFormat', 'bulletedlist', 'numberedlist', 'indent', 'blockquote', 'justifyblock', 'justifycenter',
                    'justifyleft', 'justifyright', 'specialchar', 'smiley']

                var commandsToDisableForTitle = ['rmOleCommand', 'rmImageCommand', 'mathjax']

                var commands = editor.commands;
                var ranges = editor.getSelection().getRanges();
                if (ranges && ranges.length > 0 && !ranges[0].checkReadOnly()) {
                    for (cmdId in commands) {
                        var cmd = commands[cmdId];
                        if (commandsToDisableForNonEditables.indexOf(cmdId) > -1) {
                            cmd.refresh(editor, event.data.path);
                        }
                    }
                    setTimeout(function () {
                        // Enable combo toolbar commands
                        _setStateOfComboBoxCommands(CKEDITOR.TRISTATE_OFF);
                    }, 50);

                   //Disable "commandsToDisableForTitle" commands for title of object
                    var startNode = ranges[0].startContainer;
                    var target = startNode && startNode.$ ? startNode.$ : null;
                    if (startNode && startNode.$ && startNode.$.nodeType === 3) {
                        target = startNode.$.parentElement;
                    }
                    if ((target && target.classList && target.classList.contains('aw-requirement-properties')) ||
                        (target && target.nodeName && target.nodeName.toUpperCase() === 'LABEL' && target.dataset && target.dataset.placeholder && target.dataset.placeholder === 'Title')) {

                        for (cmdId in commands) {
                            var cmd = commands[cmdId];
                            if (commandsToDisableForTitle.indexOf(cmdId) > -1) {
                                cmd.disable();
                            }
                        }
                    }
                } else {
                    for (cmdId in commands) {
                        var cmd = commands[cmdId];
                        if (commandsToDisableForNonEditables.indexOf(cmdId) > -1) {
                            cmd.disable();
                        }
                    }
                    setTimeout(function () {
                        // Disable combo toolbar commands
                        _setStateOfComboBoxCommands(CKEDITOR.TRISTATE_DISABLED);
                    }, 50);
                }
            });

            var _setStateOfComboBoxCommands = function (state) {
                // Disable combo toolbar commands
                var styles = editor.ui.instances["Styles"];
                if (styles && styles.setState) {
                    styles.setState(state);
                }
                var fontSize = editor.ui.instances["FontSize"];
                if (fontSize && fontSize.setState) {
                    fontSize.setState(state);
                }
                var font = editor.ui.instances["Font"];
                if (font && font.setState) {
                    font.setState(state);
                }
                var format = editor.ui.instances["Format"];
                if (format && format.setState) {
                    format.setState(state);
                }
                var bgcolor = editor.ui.instances["BGColor"];
                if (bgcolor && bgcolor.setState) {
                    bgcolor.setState(state);
                }
                var textcolor = editor.ui.instances["TextColor"];
                if (textcolor && textcolor.setState) {
                    textcolor.setState(state);
                }
            };

        }
    });
