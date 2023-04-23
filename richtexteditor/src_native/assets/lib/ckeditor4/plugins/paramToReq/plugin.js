/**
 * Plugin for split requirement command execution
 */
/*global
 CKEDITOR
 */

CKEDITOR.plugins.add( 'paramToReq', {
    init: function( editor ) {
        editor.addCommand( 'addParameter', {
            exec: function( editor ) {
                //Open add parameter panel
                var eventBus = editor.eventBus;
                eventBus.publish( "requirementDocumentation.openAddParameterPanel" );
            }
        } );
        editor.addCommand( 'mapExistingParameter', {
            exec: function( editor ) {
                //Open add parameter panel
                var eventBus = editor.eventBus;
                eventBus.publish( "requirementDocumentation.openAddParameterPanelWithSearch" );
            }
        } );
        editor.addMenuItems( {
            addParameter: {
                label: editor.addParameter,
                command: "addParameter",
                group: "clipboard",
                order: 1
            },
            mapExistingParameter: {
                label: editor.mapExistingParameter,
                command: "mapExistingParameter",
                group: "clipboard",
                order: 2
            }
        } );

        editor.contextMenu.addListener( function( element, selection, event ) {
            if( (selection.document.$.activeElement.className === "aw-requirement-bodytext" || element.$.parentElement.className=== "aw-requirement-bodytext") && editor.commands.cut.state > 0 ) {
                var elementId;
                var elements = event.elements;
                var elementRefs = Object.keys(elements);
                elementRefs.forEach( function( elementRef ) {
                    var ele = elements[ elementRef ];
                    if( ele && ele.$ && ele.$.getAttribute( "id" ) && !elementId ) {
                        elementId = ele.$.getAttribute( "id" );
                    }
                });
                if(elementId) {
                    var eventBus = editor.eventBus;
                    var eventData = {
                        "objectsToSelect": [ { "uid": elementId } ]
                    };
                    eventBus.publish( "aceElementsSelectionUpdatedEvent", eventData );
                    return {
                        addParameter: CKEDITOR.TRISTATE_OFF,
                        mapExistingParameter: CKEDITOR.TRISTATE_OFF,
                    };
                }

            }
        } );
        // Subscribe an event to add link to text
        _subscribeEventToAddLinkToText();
        /**
         * Method to subscribe event to handel object created event.
         */
        function _subscribeEventToAddLinkToText() {
            // Unsubscribe event first if already subscribed
            if( CKEDITOR._eventToAddLinkToSelectedText ) {
                editor.eventBus.unsubscribe( CKEDITOR._eventToAddLinkToSelectedText );
                CKEDITOR._eventToHandlerCutContent = null;
            }

            CKEDITOR._eventToAddLinkToSelectedText = editor.eventBus.subscribe( "requirementDocumentation.parameterCreated", function( eventData ) {
                if(_selectionIsInBodyText(editor)) {
                    var selection = editor.getSelection();
                    var selectedContent;
                    if( selection.getType() == CKEDITOR.SELECTION_ELEMENT ) {
                        selectedContent = selection.getSelectedElement().$.outerHTML;
                    } else if( selection.getType() == CKEDITOR.SELECTION_TEXT ) {
                        if( CKEDITOR.env.ie ) {
                            selectedContent = selection.getSelectedText();
                        } else {
                            selectedContent = selection.getNative();
                        }
                    }
                    var reqId = '';
                    var startContainer = selection.getRanges()[ 0 ].startContainer;
                    var nestedWidget = getNestedEditable( editor.editable(), startContainer );
                    if( nestedWidget ) {
                        var selectedWidget = editor.widgets.getByElement( nestedWidget );
                        if( selectedWidget ) {
                            reqId = selectedWidget.element.$.getAttribute( 'id' );
                        }
                    }

                    //create link here
                    var myeditor = editor.name;
                    var values = eventData.createdParameterd;
                    CKEDITOR.instances[myeditor].insertHtml('<a class="aw-requirement-paramToReqUnderline" paramid=' + values + '>' + selectedContent + '</a>');
                    var eventData = {
                        paramid: eventData.createdParameterd,
                        objectsToSelect:reqId
                    }
                    var eventBus = editor.eventBus;
                    eventBus.publish("requirementDocumentation.showParametersTable", eventData);
                }
            } );

        }

        function isInBodyText( guard, node ) {
            if( !node || node.equals( guard ) )
                return null;

            if( isBodyText( node ) )
                return node;

            return isInBodyText( guard, node.getParent() );
        }

        function isBodyText( node ) {
            return node.type === CKEDITOR.NODE_ELEMENT &&
                hasClass( node, 'aw-requirement-bodytext' );
        }

        // Checks if element has given class
        function hasClass( element, cls ) {
            return ( ' ' + element.$.className + ' ' )
                .indexOf( ' ' + cls + ' ' ) > -1;
        }

        function _selectionIsInBodyText(editor) {
            var selection = editor.getSelection();
            if(selection) {
                var ranges = selection.getRanges();
                if(ranges && ranges.length > 0 && !ranges.collapsed > 0) {
                    var startNode = ranges[0].startContainer;
                    var target = startNode && startNode.$ ? startNode.$ : null;
                    var targetElement = new CKEDITOR.dom.element( target );
                    if(isInBodyText(editor.editable(), targetElement)) {
                        return true;
                    }
                }
            }
            return false;
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

        editor.on( 'contentDom', function( evt ) {
            var editable = editor.editable();
            editable.attachListener( editable, 'click', function( evt ) {
                var eventBus = editor.eventBus;
                var selection = editor.getSelection();
                var selectedText = selection.getSelectedText();
                var range = selection.getRanges();
                var isValidObjectForParameter = selection.document.$.activeElement.className === "aw-requirement-bodytext" || (selection && selection.getStartElement().$.className === 'aw-requirement-paramToReqUnderline')
                if( isValidObjectForParameter && selectedText === "" && range[ 0 ].startContainer.$.parentNode && range[ 0 ].startContainer.$.parentNode.attributes ) {

                    var parentElement = range[ 0 ].startContainer.$.parentNode;
                    var attribute = parentElement.getAttribute( "paramid" );

                    var elementId;
                    var elements = evt.data.$.path;
                    if(!elements)
                    {
                        elements=[];
                        while(parentElement!=null)
                        {
                            elements.push(parentElement);
                            parentElement = parentElement.parentElement;
                        }
                    }
                    var elementRefs = Object.keys( elements );
                    elementRefs.forEach( function( elementRef ) {
                        var ele = elements[ elementRef ];
                        if( ele && !elementId && ele.getAttribute( "id" ) ) {
                            elementId = ele.getAttribute( "id" );
                        }
                    });
                    var eventData = {
                        paramid: attribute,
                        objectsToSelect: elementId
                    }
                    if( attribute ) {
                        //eventBus.publish( "aceElementsSelectionUpdatedEvent", eventData1 );
                        //If clicked on link of parameter to requirement text link
                        eventBus.publish( "requirementDocumentation.showParametersTable", eventData );
                    }
                }
            } );

        } );
    }
} );
