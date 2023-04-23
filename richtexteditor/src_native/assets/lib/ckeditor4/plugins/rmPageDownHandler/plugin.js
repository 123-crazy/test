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
// This Plug-in will create/handle page down command in CK editor
CKEDITOR.plugins.add( 'rmPageDownHandler',
{
    init: function( editor )
    {
               editor.addCommand( 'rmPageDownCommand',
                       {
                           exec : function( editor )
                           {

                             var eventBus = editor.eventBus;

                                 eventBus.publish( "requirementDocumentation.pageDown");

                           }
                       });

            editor.ui.addButton( 'rmPageDown',
            {
                label: editor.nextPage,
                command: 'rmPageDownCommand',
                icon: editor.getBaseURL + editor.getBaseUrlPath + "/image/miscDown24.svg",
                toolbar: 'navigation'
            });
        var eventBus = editor.eventBus;
        eventBus.subscribe('arm0EnablePageDownButton', function (eventData) {
            var myCommand = editor.getCommand('rmPageDownCommand');
            if (eventData.enable) {
                myCommand.enable();
            } else {
                myCommand.disable();
            }
        });
    }
} );
