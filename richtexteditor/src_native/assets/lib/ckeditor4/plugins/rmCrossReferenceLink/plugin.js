/*global
 CKEDITOR
 */
/**
 * This plugin will Allow user to copy the cross reference link to clipboard
 */
CKEDITOR.plugins.add( 'rmCrossReferenceLink',
{
    init: function( editor )
    {

        editor.on( 'contentDom', function( evt ) {

            editor.on("beforePaste", function(e) {
                    if(localStorage.getItem('rmCrossRefLinkClipboard')!=null)
                    {
                        e.editor.eventBus.publish("requirementDocumentation.canShowPasteCrossRefLinkPopup");
                        e.cancel();
                    }
                    else if(e.data.dataTransfer._.data.Text==="rmCrossRefLinkClipboard")
                    {
                        e.cancel();
                    }
                });

            var editable = editor.editable();
            editable.on( 'copy', function( evt ) {
                // Remove cross reference link object on copy of other contents
                var crossRefLinkData = JSON.parse( localStorage.getItem( 'rmCrossRefLinkClipboard' ) );
                if(crossRefLinkData) {
                    localStorage.removeItem( 'rmCrossRefLinkClipboard' );
                }
            });

        });
    }
});


