/**
 * Plugin for split requirement command execution
 */
/*global
 CKEDITOR
 */
CKEDITOR.plugins.add( 'rmSelectionHandler', {
    init: function( editor ) {
        editor.commands.cut.on( 'state', function( evt ) {
            var eventBus = editor.eventBus;
            var eventData = {
                enable: true
            };
            var selection = editor.getSelection();
            var ranges = selection.getRanges()[ 0 ];
            var spanId = ranges.startContainer.$ && ranges.startContainer.$.parentElement ? ranges.startContainer.$.parentElement.getAttribute( "id" ) : null;
            var showCmd = true;
            if( spanId !== null && spanId.includes( "Markup" ) ) {
                showCmd = false;
            }
            //Command should be enabled only for body text content selection
            if( !ranges.collapsed > 0 && selection.document.$.activeElement.className === "aw-requirement-bodytext" && showCmd ) {
                eventData.enable = true;
            } else {
                eventData.enable = false;
            }
            eventBus.publish( "requirementDocumentation.enableSplitReqCmd", eventData );
            eventBus.publish("requirementDocumentation.selectionChangedinCkEditor", {isSelected : true});
        } );
        editor.commands.blockquote.on( 'state', function( evt ) {
            var eventBus = editor.eventBus;
            var eventData = {
                enable: true
            };
            var selection = editor.getSelection();
            var ranges = selection.getRanges()[ 0 ];
            if( ranges ) {
                var spanId = ranges.startContainer.$ && ranges.startContainer.$.parentElement ? ranges.startContainer.$.parentElement.getAttribute( "id" ) : null;
                var showCmd = true;
                if( spanId !== null && spanId.includes( "Markup" ) ) {
                    showCmd = false;
                }
                //Command should be enabled only for body text content selection
                //If item clicked is of TOC then dont fire any event
                if( !(ranges.startContainer.$.parentElement && ranges.startContainer.$.parentElement.id.startsWith( "liid" )) ) {
                    if( !ranges.collapsed > 0 && selection.document.$.activeElement.className === "aw-requirement-bodytext" && showCmd ) {
                        eventBus.publish( "requirementDocumentation.enableSplitReqCmd", eventData );
                    } else {
                        eventData.enable = false;
                        eventBus.publish( "requirementDocumentation.enableSplitReqCmd", eventData );
                    }
                }
            }
        } );

        var timer = setTimeout( function() {
            // Subscribe an event to handel the cut content.
            _subscribeEventToHandelCutContent();
        }, 500 );

        /**
         * Method to subscribe event to handel object created event.
         */
        function _subscribeEventToHandelCutContent() {
            // Unsubscribe event first if already subscribed
            if( CKEDITOR._eventToHandlerCutContent ) {
                editor.eventBus.unsubscribe( CKEDITOR._eventToHandlerCutContent );
                CKEDITOR._eventToHandlerCutContent = null;
            }
            CKEDITOR._eventToHandlerCutContent = editor.eventBus.subscribe( "requirementDocumentation.executeSplitReqCmd", function( eventData ) {
                this.CKEDITOR.SPLITREQ = true;
                if( eventData.child ) {
                    editor.commands.cut.exec();
                    editor.commands.addChildRequirementWidget.exec();

                } else {
                    editor.commands.cut.exec();
                    editor.commands.addSiblingRequirementWidget.exec();
                }
            } );

        }
    }

} );
