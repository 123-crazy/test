'use strict';

( function() {

    CKEDITOR.plugins.add('rat', {

        init: function (editor) {
            
        },
        afterInit: function (editor) {

            // Add content change listener to calculate quality on content change
            editor.on('change', function(e) {
                if (editor.RAT && editor.RAT.SHOW_QUALITY_VISIBLE && !editor.RAT.CALCULATE_QUALITY_IN_PROCESS) {
                    
                    // Clear existing highlighting if any
                    clearInvalidWordHighlight(editor);

                    var selection = e.editor.getSelection();
                    var ranges = selection.getRanges();
                    if (ranges && ranges.length > 0) {
                        var range = (editor.getSelection().getRanges()[0]);
    
                        var startNode = range.startContainer;
                        var cursorElement = getElementNode(editor.editable(), startNode);
                        if(cursorElement) {
                            var widget = editor.widgets.getByElement(cursorElement);
                            // if modified content is in selected widget
                            if(widget && widget.isWidgetSelected) {
                                editor.RAT.CALCULATE_QUALITY_IN_PROCESS = true;
                                setTimeout(function () { 
                                    editor.eventBus.publish( "Arm0ShowQualityMetricData.CalculateQuality" );
                                }, 500);
                            }
                        }
                    }
                }
            })

            editor.on('clearHighlightInvalidMetricData', function(event) {
                clearInvalidWordHighlight(editor);
            })
            
            editor.on('highlightInvalidMetricData', function(event) {
                // Clear existing highlighting if any
                clearInvalidWordHighlight(editor);

                var instances = event.data;
                var doc = editor.document.$;
                var selectedWidgets = doc.getElementsByClassName('cke_widget_selected');
                var selectedWidget;
                if(!selectedWidgets || selectedWidgets.length===0) {
                    var selectedHeaderElements = doc.getElementsByClassName('aw-requirement-headerSelected');
                    if(selectedHeaderElements && selectedHeaderElements.length > 0) {
                        selectedWidget = getNestedEditable(editor.editable(), new CKEDITOR.dom.node( selectedHeaderElements[0] ));
                        if(selectedWidget) {
                            selectedWidget = selectedWidget.$;
                        }
                    }
                    
                } else {
                    selectedWidget = selectedWidgets[0];
                }
                if (selectedWidget) {
                    var bodyText = selectedWidget.getElementsByClassName('aw-requirement-bodytext');
                    if(bodyText && bodyText.length > 0) {

                        if (instances && instances.length && instances.length > 0) {
                            var itInstances = 0;
                            var temp = '';
                            for (itInstances = 0; itInstances < instances.length; itInstances++) {
                                var str = ' ' + instances[itInstances];
                                if(itInstances < instances.length - 1 ) {
                                    str = ' ' + instances[itInstances] + '|';
                                }                                
                                temp += str
                            }

                            applyHighlighting(bodyText[0], temp, editor);
                        }                        
                    }                    
                }
            } );
            
            var undoCmd = editor.getCommand('undo');
            var redoCmd = editor.getCommand('redo');

            if (undoCmd) {
                undoCmd.on('afterUndo', function () {
                    if(editor.RAT) {
                        editor.RAT.timer = setTimeout(function () {
                            if (editor.RAT && editor.RAT.SHOW_QUALITY_VISIBLE && !editor.RAT.CALCULATE_QUALITY_IN_PROCESS) {
                                editor.eventBus.publish( "Arm0ShowQualityMetricData.CalculateQuality" );
                            }
                        }, 500);
                    }
                });
            }
            if (redoCmd) {
                redoCmd.on('afterRedo', function () {
                    if(editor.RAT) {
                        editor.RAT.timer = setTimeout(function () {
                            if (editor.RAT && editor.RAT.SHOW_QUALITY_VISIBLE && !editor.RAT.CALCULATE_QUALITY_IN_PROCESS) {
                                editor.eventBus.publish( "Arm0ShowQualityMetricData.CalculateQuality" );
                            }
                        }, 500);
                    }                    
                });
            }
        }
    });

    function clearInvalidWordHighlight(editor) {
        clearHighlighting( editor );
    }

    var hiliteClass = "aw-ckeditor-invalidQualityRule";
    var hiliteTag = "mark";
    var skipTags = new RegExp("^(?:" + hiliteTag + "|SCRIPT|FORM)$", "i");
    var matchRegExp = "";
    var openLeft = false;
    var openRight = false;

    // characters to strip from start and end of the input string
    var endRegExp = new RegExp('^[^\\w]+|[^\\w]+$', "g");
    // characters used to break up the input string into words
    var breakRegExp = new RegExp('[^\\w\'-]+', "g");

    function setRegex(input) {
        input = input.replace(endRegExp, "");
        input = input.replace(breakRegExp, "|");
        input = input.replace(/^\||\|$/g, "");
        if(input) {
            var re = "(" + input + ")";
            if(!openLeft) {
                re = "\\b" + re;
            }
            if(!openRight) {
                re = re + "\\b";
            }
            matchRegExp = new RegExp(re, "i");
            return matchRegExp;
        }
        return false;
    }

    // recursively apply word highlighting
    function hiliteWords(node)
    {
        if(node === undefined || !node) return;
        if(!matchRegExp) return;
        if(skipTags.test(node.nodeName)) return;

        if(node.hasChildNodes()) {
            for(var i=0; i < node.childNodes.length; i++)
                hiliteWords(node.childNodes[i]);
        }
        if(node.nodeType == 3) { // NODE_TEXT
            var nv = undefined;
            var regs = undefined;
            if((nv = node.nodeValue) && (regs = matchRegExp.exec(nv))) {

                var match = document.createElement(hiliteTag);
                match.appendChild(document.createTextNode(regs[0]));
                match.style.backgroundColor = "unset";
                match.classList.add( hiliteClass );

                var after = node.splitText(regs.index);
                after.nodeValue = after.nodeValue.substring(regs[0].length);
                node.parentNode.insertBefore(match, after);
            }
        }
    }

    // start highlighting at target node
    function applyHighlighting(targetNode, input, editor)
    {
        clearHighlighting(editor);
        if(input === undefined || !(input = input.replace(/(^\s+|\s+$)/g, ""))) {
            return;
        }
        if(setRegex(input)) {
            hiliteWords(targetNode);
        }
        return matchRegExp;
    }

    // remove highlighting
    function clearHighlighting( editor )
    {
        var doc = editor.document.$;
        var arr = doc.getElementsByClassName( hiliteClass );
        var el = undefined;
        while(arr.length && (el = arr[0])) {
            var parent = el.parentNode;
            parent.replaceChild(el.firstChild, el);
            parent.normalize();
        }
    }

    function getElementNode(guard, node) {
        if (!node || node.equals(guard))
            return null;

        if (node.type === CKEDITOR.NODE_ELEMENT)
            return node;

        return getElementNode(guard, node.getParent());
    }

    function getNestedEditable(guard, node) {
        if (!node || node.equals(guard))
            return null;

        if (isRequirementWidget(node))
            return node;

        return getNestedEditable(guard, node.getParent());
    }

    // Checks whether node is a requirement widget
    function isRequirementWidget(node) {
        return node.type === CKEDITOR.NODE_ELEMENT &&
            ( hasClass(node, 'requirement') );
    }

    // Checks if element has given class
    function hasClass(element, cls) {
        return (' ' + element.$.className + ' ')
            .indexOf(' ' + cls + ' ') > -1;
    }

} )();
