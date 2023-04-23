/*global
 CKEDITOR
 */
/**
 * This plugin will Allow user to open clicked link in new tab
 */
CKEDITOR.plugins.add( 'rmLinkHandler',
{
    init: function( editor )
    {
        var urlTemplate = new CKEDITOR.template( '<a href="{link}">{text}</a>' );
        var doubleQuoteRegex = /"/g;

        editor.on( 'contentDom', function( evt ) {
            var editable = editor.editable();

            if(editable) {
                // Add listener to open link in new tab if we Ctrl+Click on link
                editable.attachListener( editable, 'click', function( evt ) {
                    var target = evt.data.getTarget(),
                        clickedAnchor = ( new CKEDITOR.dom.elementPath( target, editor.editable() ) ).contains( 'a' ),
                        href = clickedAnchor && clickedAnchor.getAttribute( 'href' ),
                        modifierPressed = _properModifierPressed( evt );
    
                    if ( href && modifierPressed ) {
                        window.open( href, target );
    
                        // We need to prevent it for Firefox, as it has it's own handling (#8).
                        evt.data.preventDefault();
                    }
                } );
            }
        });        

        // Add anchor when we paste link in the editor
        editor.on( 'paste', function( evt ) {
            if ( evt.data.dataTransfer.getTransferType( editor ) == CKEDITOR.DATA_TRANSFER_INTERNAL ) {
                return;
            }

            var data = evt.data.dataValue;

            // If we found "<" it means that most likely there's some tag and we don't want to touch it.
            if ( data.indexOf( '<' ) > -1 ) {
                return;
            }

            if ( _isURL( data ) ) {
                evt.data.dataValue = getHtmlToInsert( data );
                evt.data.type = 'html';
            }
        } );

        // check if clicked with Ctrl key
        var _properModifierPressed = function(evt) {
            return evt.data.getKeystroke() & CKEDITOR.CTRL;
        };

        // check if given string is url
        var _isURL = function(str) {
            try {
                new URL(str);
                return true;
              } catch (ex) {
                return false;  
          }
        };

        // Convert text to anchor
        function getHtmlToInsert( text ) {
            var opts = {
                    text: text,
                    link: text.replace( doubleQuoteRegex, '%22' )
                },
                template = urlTemplate.output( opts );

            return template;
        }

    }
} );
