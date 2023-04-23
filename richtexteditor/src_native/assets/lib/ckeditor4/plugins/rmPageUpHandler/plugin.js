//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 CKEDITOR
 */
// This Plug-in will create/handle page up command in CK editor
CKEDITOR.plugins.add( 'rmPageUpHandler',
{
    init: function( editor )
    {

               editor.addCommand( 'rmPageUpCommand',
                       {
                           exec : function( editor )
                           {

                             var eventBus = editor.eventBus;
                             eventBus.publish( "requirementDocumentation.pageUp");

                           }
                       });

            editor.ui.addButton( 'rmPageUp',
            {
                label: editor.previousPage,
                command: 'rmPageUpCommand',
                icon: editor.getBaseURL + editor.getBaseUrlPath + "/image/miscUp24.svg",
                toolbar: 'navigation'
            } );
            var eventBus = editor.eventBus;
            eventBus.subscribe( 'arm0EnablePageUpButton', function( eventData ) {
                var myCommand = editor.getCommand( 'rmPageUpCommand' );
                if( eventData.enable ) {
                    myCommand.enable();
                } else {
                    myCommand.disable();

                }
            } );

    }
} );
