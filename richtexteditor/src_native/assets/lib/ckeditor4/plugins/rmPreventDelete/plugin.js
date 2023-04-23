/*global
 CKEDITOR
 */
/**
 * This plugin will prevent the backspace and delete key in editable area; if it is modifying the non editable area.
 * Prevent backspace key event if cursor is at the first in editable.
 * Prevent Delete key evebt if cursor is at the last in editable
 */
CKEDITOR.plugins.add( 'rmPreventDelete',
{
    init: function( editor )
    {
        editor.on('key', function(e) {
            var selection = e.editor.getSelection();
            var ranges = selection.getRanges();
            if (ranges && ranges.length > 0) {
                var range = ranges[0];
                if (range) {
                    range = range.clone();

                    var startNode = range.startContainer;
                    var endNode = range.endContainer;

                    var cancelEvent = false;

                    var pos = startNode.getPosition(endNode);
                    var ctrlA;
                    var keyPressed=e.data.domEvent.$;
                    if(keyPressed && keyPressed.ctrlKey){
                        if (keyPressed.keyCode == 65 || keyPressed.keyCode == 97){
                            ctrlA=keyPressed.ctrlKey;
                        }
                    }
 
                    switch (pos) {
                        case CKEDITOR.POSITION_IDENTICAL: {
                            switch (e.data.keyCode) {
                                case 8: { //BACKSPACE
                                    if (range.startOffset === 0 && range.endOffset === 0) {
                                        var ancestor = startNode.$.parentNode;
                                        while (ancestor !== null && (ancestor.firstChild === startNode.$ || ancestor.firstChild.contains(startNode.$))) {
                                            var previous  = ancestor.previousSibling;
                                            if (previous !== null) {
                                                if ((new CKEDITOR.dom.node(previous)).isReadOnly()) {
                                                    cancelEvent = true;
                                                    break;
                                                }
                                            }
                                            ancestor = ancestor.parentNode;
                                        }
                                    }
                                    break;
                                }
                                case 46: { //DEL
                                    if (startNode.getLength && range.startOffset === startNode.getLength() || isNestedEmpty(startNode) ) {
                                        var ancestor = endNode.$;
                                        while (ancestor !== null) {
                                            var next  = ancestor.nextSibling;
                                            if (next !== null) {
                                                var node = new CKEDITOR.dom.node(next);
                                                if(next.childNodes.length !== 0 || next.textContent.length !== 0) {
                                                    cancelEvent =  node.isReadOnly();
                                                    break;
                                                }
                                            }
                                            ancestor = ancestor.parentNode;
                                        }
                                    }
                                    break;
                                }
                
                            }
                            break;
                        }
                        
                        default : {
                            break;
                        }
                    }
                if(ctrlA)
                {
                    //(ctrl+a) case - to select only the content in bodytext every time
                    //removes selection of all properties and showing only the body text selection 
                    var ancestor = startNode.$.parentNode;

                    if(!ancestor.classList.contains("aw-requirement-bodytext"))
                    {
                        var contentElement = ancestor.getElementsByClassName('aw-requirement-bodytext');
                        while(ancestor && contentElement.length===0){
                            ancestor = ancestor.parentNode;
                            contentElement = ancestor.getElementsByClassName('aw-requirement-bodytext');
                        }
                        startNode=contentElement[0];
                    }
                    else{
                        startNode=ancestor;
                    }

                    if(startNode.classList && startNode.classList.contains("aw-requirement-bodytext"))
                    {
                        var element = startNode;//.getElementsByClassName('aw-requirement-bodytext')[0];
                        var doc = editor.document.$;
                        var win = editor.window.$;
                        if (element && win.getSelection) {
                            var range2 = doc.createRange();
                            range2.selectNodeContents(element);
                            selection = win.getSelection();
                            selection.removeAllRanges();
                            selection.addRange(range2);
                        }
                        cancelEvent=true;
                    }
                }

                    if (cancelEvent) {
                        //Cancel the event
                        e.cancelBubble = true;
                        e.returnValue = false;
                        e.cancel();
                        e.stop();
                        return false;
                    }
                }
            }
            return true;
        } );

        /**
         * @param {Object} node - dom element.
         * @returns {boolean } true, if given dom element is readonly.
         */
        function isReadOnlyTree(node) {
            if (node.type === CKEDITOR.NODE_ELEMENT) {
                var childs = node.$.childNodes;
                for ( var i=0; i < childs.length; i++ ) {
                    if (isReadOnlyTree(new CKEDITOR.dom.node(childs[ i ]))) {
                        return true;
                    }
                }
                return false;
            } else if (node.type === CKEDITOR.NODE_TEXT) {
                return node.isReadOnly();
            }
            return false;
        }

        /**
         * @param {Object} node - dom element.
         * @returns {boolean } true, if all childs of given dom elements have not text contents.
         */
        function isNestedEmpty(node) {
            if (node.$.textContent.length === 0){
                return true;
            }
            var isEmpty = false;
            var childs = node.$.childNodes;
            if(childs) {
                for ( var i=0; i < childs.length; i++ ) {
                    if(childs[ i ].textContent.length !== 0) {
                        isEmpty = false;
                    }
                }
            }
            return isEmpty;
        }

    }
} );
